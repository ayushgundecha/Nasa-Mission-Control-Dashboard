import { randomUUID } from "node:crypto";

import { sourceStampSchema, type FreshnessState } from "@/domain";

import { ProviderRefreshError, toProviderFailure } from "./errors";
import { evaluateFreshness, shouldRefresh } from "./freshness";
import { fetchJson } from "./http";
import type {
  DataMode,
  NormalizedProviderRecord,
  ProviderAdapter,
  ProviderFailure,
  ProviderKey,
  ProviderLogEvent,
  ProviderReadResult,
  ProviderSnapshot,
  ProviderStore,
  SourceHealth,
} from "./types";

export type ProviderEngineOptions = Readonly<{
  mode: DataMode;
  timeoutMs?: number;
  maxAttempts?: number;
  baseRetryDelayMs?: number;
  maxRetryDelayMs?: number;
  leaseSeconds?: number;
  failureBackoffSeconds?: number;
}>;

export type ProviderEngineDependencies = Readonly<{
  fetch?: typeof globalThis.fetch;
  now?: () => Date;
  random?: () => number;
  randomUUID?: () => string;
  sleep?: (milliseconds: number) => Promise<void>;
  defer?: (work: () => Promise<void>) => void;
  log?: (event: ProviderLogEvent) => void;
}>;

type ReadOptions = Readonly<{
  forceRefresh?: boolean;
  backgroundRefresh?: boolean;
}>;

const defaultSleep = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export class ProviderEngine {
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;
  private readonly baseRetryDelayMs: number;
  private readonly maxRetryDelayMs: number;
  private readonly leaseSeconds: number;
  private readonly failureBackoffSeconds: number;
  private readonly dependencies: Required<ProviderEngineDependencies>;

  constructor(
    private readonly store: ProviderStore,
    private readonly options: ProviderEngineOptions,
    dependencies: ProviderEngineDependencies = {},
  ) {
    this.timeoutMs = options.timeoutMs ?? 8_000;
    this.maxAttempts = options.maxAttempts ?? 3;
    this.baseRetryDelayMs = options.baseRetryDelayMs ?? 250;
    this.maxRetryDelayMs = options.maxRetryDelayMs ?? 4_000;
    this.leaseSeconds = options.leaseSeconds ?? 30;
    this.failureBackoffSeconds = options.failureBackoffSeconds ?? 60;

    if (this.timeoutMs < 1 || this.maxAttempts < 1) {
      throw new Error("Provider timeout and attempt count must be positive");
    }
    if (this.leaseSeconds < 10 || this.leaseSeconds > 900) {
      throw new Error("Provider lease must be between 10 and 900 seconds");
    }

    this.dependencies = {
      fetch: dependencies.fetch ?? globalThis.fetch,
      now: dependencies.now ?? (() => new Date()),
      random: dependencies.random ?? Math.random,
      randomUUID: dependencies.randomUUID ?? randomUUID,
      sleep: dependencies.sleep ?? defaultSleep,
      defer:
        dependencies.defer ??
        ((work) => {
          queueMicrotask(() => void work());
        }),
      log: dependencies.log ?? (() => undefined),
    };
  }

  async read<TPayload, TRecord>(
    adapter: ProviderAdapter<TPayload, TRecord>,
    readOptions: ReadOptions = {},
  ): Promise<ProviderReadResult<TRecord>> {
    const key = this.key(adapter);
    const now = this.dependencies.now();
    const cached = await this.store.readSnapshot<TRecord>(key);
    const evaluated = evaluateFreshness(
      cached?.fetchedAt ?? null,
      now,
      adapter.freshness,
    );
    const snapshot = cached
      ? this.decorateSnapshot(
          cached,
          evaluated.state,
          evaluated.ageSeconds,
          evaluated.reason,
        )
      : null;
    const health = await this.healthWithFreshness(key, evaluated.state);

    if (!readOptions.forceRefresh && !shouldRefresh(evaluated.state)) {
      this.log(key, "cache_hit", {
        recordsWritten: snapshot?.records.length ?? 0,
      });
      return {
        status: "cache_hit",
        freshness: evaluated.state,
        snapshot,
        health,
        refreshScheduled: false,
      };
    }

    if (this.isBackedOff(health, now)) {
      return this.fallbackResult(snapshot, evaluated.state, health);
    }

    if (readOptions.backgroundRefresh && snapshot) {
      this.log(key, "stale_while_revalidate", {
        recordsWritten: snapshot.records.length,
      });
      this.dependencies.defer(async () => {
        await this.refresh(adapter);
      });
      return {
        status: "stale_while_revalidate",
        freshness: evaluated.state,
        snapshot,
        health,
        refreshScheduled: true,
      };
    }

    return this.refresh(adapter, snapshot, evaluated.state);
  }

  private async refresh<TPayload, TRecord>(
    adapter: ProviderAdapter<TPayload, TRecord>,
    fallbackSnapshot: ProviderSnapshot<TRecord> | null = null,
    fallbackFreshness: FreshnessState = "unavailable",
  ): Promise<ProviderReadResult<TRecord>> {
    const key = this.key(adapter);
    const startedAt = this.dependencies.now();
    const lease = await this.store.acquireLease(key, {
      token: this.dependencies.randomUUID(),
      now: startedAt,
      leaseSeconds: this.leaseSeconds,
    });

    if (!lease) {
      this.log(key, "lease_contended", {
        recordsWritten: fallbackSnapshot?.records.length ?? 0,
      });
      const health = await this.healthWithFreshness(key, fallbackFreshness);
      return {
        status: fallbackSnapshot ? "lease_contended" : "unavailable",
        freshness: fallbackFreshness,
        snapshot: fallbackSnapshot,
        health,
        refreshScheduled: false,
      };
    }

    const leaseHealth = await this.store.readHealth(key);

    let attempts = 0;
    let lastFailure: ProviderFailure | null = null;

    while (attempts < this.maxAttempts) {
      attempts += 1;
      const attemptStartedAt = this.dependencies.now();
      this.log(key, "refresh_attempt", { attempt: attempts });

      try {
        const fetchedAt = this.dependencies.now().toISOString();
        const payload = await this.loadPayload(adapter);
        const parsed = adapter.payloadSchema.safeParse(payload);
        if (!parsed.success) {
          throw new ProviderRefreshError("validation", {
            retryable: false,
            cause: parsed.error,
          });
        }

        const records = this.validateRecords(
          adapter.normalize(parsed.data, {
            fetchedAt,
            provider: adapter.provider,
            providerLabel: adapter.providerLabel,
            dataset: adapter.dataset,
            adapterVersion: adapter.adapterVersion,
            sourceUrl: adapter.request().url,
          }),
          adapter,
        );
        const finishedAt = this.dependencies.now();
        const durationMs = Math.max(
          0,
          finishedAt.getTime() - startedAt.getTime(),
        );
        const committed = await this.store.commitRefresh(lease, {
          records,
          fetchedAt,
          finishedAt,
          durationMs,
          attempts,
          recordsReceived: records.length,
        });

        if (!committed) {
          const latest = await this.store.readSnapshot<TRecord>(key);
          const latestEvaluation = evaluateFreshness(
            latest?.fetchedAt ?? null,
            finishedAt,
            adapter.freshness,
          );
          return {
            status: latest ? "lease_contended" : "unavailable",
            freshness: latestEvaluation.state,
            snapshot: latest
              ? this.decorateSnapshot(
                  latest,
                  latestEvaluation.state,
                  latestEvaluation.ageSeconds,
                  latestEvaluation.reason,
                )
              : null,
            health: await this.healthWithFreshness(key, latestEvaluation.state),
            refreshScheduled: false,
          };
        }

        const resultSnapshot: ProviderSnapshot<TRecord> = {
          provider: adapter.provider,
          dataset: adapter.dataset,
          records,
          fetchedAt,
        };
        const fresh = evaluateFreshness(
          fetchedAt,
          finishedAt,
          adapter.freshness,
        );
        this.log(key, "refresh_succeeded", {
          attempt: attempts,
          durationMs,
          recordsReceived: records.length,
          recordsWritten: records.length,
        });
        return {
          status: "refreshed",
          freshness: fresh.state,
          snapshot: this.decorateSnapshot(
            resultSnapshot,
            fresh.state,
            fresh.ageSeconds,
            fresh.reason,
          ),
          health: await this.healthWithFreshness(key, fresh.state),
          refreshScheduled: false,
        };
      } catch (error) {
        lastFailure = toProviderFailure(error);
        const attemptDuration = Math.max(
          0,
          this.dependencies.now().getTime() - attemptStartedAt.getTime(),
        );
        this.log(key, "refresh_failed", {
          attempt: attempts,
          durationMs: attemptDuration,
          errorCode: lastFailure.code,
        });

        if (
          !lastFailure.retryable ||
          attempts >= this.maxAttempts ||
          (lastFailure.retryAfterMs !== null &&
            lastFailure.retryAfterMs > this.maxRetryDelayMs)
        ) {
          break;
        }
        await this.dependencies.sleep(this.retryDelay(attempts, lastFailure));
      }
    }

    const failedAt = this.dependencies.now();
    const failure =
      lastFailure ?? toProviderFailure(new Error("Unknown refresh failure"));
    const nextEligibleRefreshAt = new Date(
      failedAt.getTime() +
        this.failureDelay(failure, leaseHealth?.consecutiveFailures ?? 0),
    );
    await this.store.failRefresh(lease, {
      failedAt,
      durationMs: Math.max(0, failedAt.getTime() - startedAt.getTime()),
      attempts,
      failure,
      nextEligibleRefreshAt,
    });
    this.log(key, "refresh_failed", {
      attempt: attempts,
      durationMs: Math.max(0, failedAt.getTime() - startedAt.getTime()),
      nextEligibleRefreshAt: nextEligibleRefreshAt.toISOString(),
      errorCode: failure.code,
    });
    const health = await this.healthWithFreshness(key, fallbackFreshness);
    return this.fallbackResult(fallbackSnapshot, fallbackFreshness, health);
  }

  private async loadPayload<TPayload, TRecord>(
    adapter: ProviderAdapter<TPayload, TRecord>,
  ): Promise<unknown> {
    if (this.options.mode === "fixture") {
      if (adapter.fixturePayload === undefined) {
        throw new ProviderRefreshError("internal", { retryable: false });
      }
      return adapter.fixturePayload;
    }

    return fetchJson(adapter.request(), this.timeoutMs, {
      fetch: this.dependencies.fetch,
      now: this.dependencies.now,
    });
  }

  private validateRecords<TPayload, TRecord>(
    records: readonly NormalizedProviderRecord<TRecord>[],
    adapter: ProviderAdapter<TPayload, TRecord>,
  ): readonly NormalizedProviderRecord<TRecord>[] {
    if (records.length === 0) {
      throw new ProviderRefreshError("empty_payload", { retryable: false });
    }

    const ids = new Set<string>();
    for (const record of records) {
      if (!record.id || !record.upstreamRecordId || !record.contentHash) {
        throw new ProviderRefreshError("validation", { retryable: false });
      }
      if (ids.has(record.id)) {
        throw new ProviderRefreshError("validation", { retryable: false });
      }
      ids.add(record.id);

      const source = sourceStampSchema.safeParse(record.source);
      if (
        !source.success ||
        source.data.provider !== adapter.provider ||
        source.data.adapterVersion !== adapter.adapterVersion
      ) {
        throw new ProviderRefreshError("validation", {
          retryable: false,
          cause: source.success ? undefined : source.error,
        });
      }
    }

    return records;
  }

  private decorateSnapshot<TRecord>(
    snapshot: ProviderSnapshot<TRecord>,
    state: FreshnessState,
    ageSeconds: number | null,
    reason: string | null,
  ): ProviderSnapshot<TRecord> {
    return {
      ...snapshot,
      records: snapshot.records.map((record) => ({
        ...record,
        source: {
          ...record.source,
          freshness: {
            ...record.source.freshness,
            state,
            ageSeconds,
            reason,
          },
        },
      })),
    };
  }

  private async healthWithFreshness(
    key: ProviderKey,
    freshness: FreshnessState,
  ): Promise<SourceHealth | null> {
    const health = await this.store.readHealth(key);
    return health ? { ...health, freshness } : null;
  }

  private fallbackResult<TRecord>(
    snapshot: ProviderSnapshot<TRecord> | null,
    freshness: FreshnessState,
    health: SourceHealth | null,
  ): ProviderReadResult<TRecord> {
    const usable = snapshot !== null && freshness !== "unavailable";
    return {
      status: usable ? "stale_fallback" : "unavailable",
      freshness,
      snapshot,
      health,
      refreshScheduled: false,
    };
  }

  private isBackedOff(health: SourceHealth | null, now: Date): boolean {
    if (!health?.nextEligibleRefreshAt) return false;
    return Date.parse(health.nextEligibleRefreshAt) > now.getTime();
  }

  private retryDelay(attempt: number, failure: ProviderFailure): number {
    const exponential = Math.min(
      this.maxRetryDelayMs,
      this.baseRetryDelayMs * 2 ** (attempt - 1),
    );
    const jittered = Math.round(
      exponential * (0.5 + this.dependencies.random()),
    );
    return Math.max(jittered, failure.retryAfterMs ?? 0);
  }

  private failureDelay(
    failure: ProviderFailure,
    previousConsecutiveFailures: number,
  ): number {
    const exponentialBackoff = Math.min(
      this.failureBackoffSeconds * 1000 * 2 ** previousConsecutiveFailures,
      60 * 60 * 1000,
    );
    return Math.max(
      exponentialBackoff,
      Math.min(failure.retryAfterMs ?? 0, 24 * 60 * 60 * 1000),
    );
  }

  private key<TPayload, TRecord>(
    adapter: ProviderAdapter<TPayload, TRecord>,
  ): ProviderKey {
    return { provider: adapter.provider, dataset: adapter.dataset };
  }

  private log(
    key: ProviderKey,
    event: ProviderLogEvent["event"],
    values: Partial<Omit<ProviderLogEvent, keyof ProviderKey | "event">> = {},
  ): void {
    this.dependencies.log({
      ...key,
      event,
      attempt: values.attempt ?? 0,
      durationMs: values.durationMs ?? 0,
      recordsReceived: values.recordsReceived ?? 0,
      recordsWritten: values.recordsWritten ?? 0,
      nextEligibleRefreshAt: values.nextEligibleRefreshAt ?? null,
      errorCode: values.errorCode ?? null,
    });
  }
}
