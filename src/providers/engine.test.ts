// @vitest-environment node

import { z } from "zod";
import { describe, expect, it, vi } from "vitest";

import type { FreshnessState } from "@/domain";

import { ProviderEngine } from "./engine";
import type {
  NormalizedProviderRecord,
  ProviderAdapter,
  ProviderFailure,
  ProviderKey,
  ProviderLease,
  ProviderLogEvent,
  ProviderSnapshot,
  ProviderStore,
  SourceHealth,
} from "./types";

type ReferenceRecord = { value: number };
const payloadSchema = z.object({
  items: z.array(z.object({ id: z.string(), value: z.number() })),
});
type ReferencePayload = z.infer<typeof payloadSchema>;

function referenceAdapter(
  fixturePayload: ReferencePayload = { items: [{ id: "alpha", value: 42 }] },
): ProviderAdapter<ReferencePayload, ReferenceRecord> {
  return {
    provider: "reference_provider",
    providerLabel: "Reference Provider",
    dataset: "reference_records",
    adapterVersion: "1.0.0",
    freshness: {
      liveForSeconds: 5,
      currentForSeconds: 60,
      delayedForSeconds: 120,
      usableForSeconds: 3_600,
    },
    fixturePayload,
    payloadSchema,
    request: () => ({
      url: "https://example.test/reference",
      init: { headers: { Authorization: "Bearer never-log-this-secret" } },
    }),
    normalize: (payload, context) =>
      payload.items.map((item): NormalizedProviderRecord<ReferenceRecord> => ({
        id: `reference:${item.id}`,
        upstreamRecordId: item.id,
        data: { value: item.value },
        contentHash: `hash-${item.id}-${item.value}`,
        source: {
          provider: context.provider,
          providerLabel: context.providerLabel,
          upstreamRecordId: item.id,
          sourceUrl: context.sourceUrl,
          observedAt: context.fetchedAt,
          fetchedAt: context.fetchedAt,
          upstreamVersion: "fixture-v1",
          adapterVersion: context.adapterVersion,
          freshness: {
            state: "live",
            ageSeconds: 0,
            staleAfterSeconds: 120,
            reason: null,
          },
        },
      })),
  };
}

class MemoryProviderStore implements ProviderStore {
  snapshot: ProviderSnapshot<ReferenceRecord> | null = null;
  health: SourceHealth | null = null;
  contend = false;
  commits = 0;
  failures = 0;

  async readSnapshot<TRecord>(): Promise<ProviderSnapshot<TRecord> | null> {
    return this.snapshot as ProviderSnapshot<TRecord> | null;
  }

  async acquireLease(
    key: ProviderKey,
    input: { token: string; now: Date; leaseSeconds: number },
  ): Promise<ProviderLease | null> {
    if (this.contend) return null;
    this.health = {
      ...key,
      state: "refreshing",
      freshness: "unavailable",
      lastStartedAt: input.now.toISOString(),
      lastSucceededAt: this.health?.lastSucceededAt ?? null,
      lastFailedAt: this.health?.lastFailedAt ?? null,
      lastDurationMs: null,
      lastAttemptCount: 0,
      recordsReceived: 0,
      recordsWritten: 0,
      consecutiveFailures: this.health?.consecutiveFailures ?? 0,
      nextEligibleRefreshAt: null,
      error: null,
    };
    return {
      ...key,
      token: input.token,
      expiresAt: new Date(
        input.now.getTime() + input.leaseSeconds * 1000,
      ).toISOString(),
    };
  }

  async commitRefresh<TRecord>(
    lease: ProviderLease,
    input: {
      records: readonly NormalizedProviderRecord<TRecord>[];
      fetchedAt: string;
      finishedAt: Date;
      durationMs: number;
      attempts: number;
      recordsReceived: number;
    },
  ): Promise<boolean> {
    this.commits += 1;
    this.snapshot = {
      provider: lease.provider,
      dataset: lease.dataset,
      records:
        input.records as readonly NormalizedProviderRecord<ReferenceRecord>[],
      fetchedAt: input.fetchedAt,
    };
    this.health = {
      ...lease,
      state: "succeeded",
      freshness: "live",
      lastStartedAt: this.health?.lastStartedAt ?? null,
      lastSucceededAt: input.finishedAt.toISOString(),
      lastFailedAt: this.health?.lastFailedAt ?? null,
      lastDurationMs: input.durationMs,
      lastAttemptCount: input.attempts,
      recordsReceived: input.recordsReceived,
      recordsWritten: input.records.length,
      consecutiveFailures: 0,
      nextEligibleRefreshAt: null,
      error: null,
    };
    return true;
  }

  async failRefresh(
    lease: ProviderLease,
    input: {
      failedAt: Date;
      durationMs: number;
      attempts: number;
      failure: ProviderFailure;
      nextEligibleRefreshAt: Date;
    },
  ): Promise<boolean> {
    this.failures += 1;
    this.health = {
      ...lease,
      state: "failed",
      freshness: "unavailable",
      lastStartedAt: this.health?.lastStartedAt ?? null,
      lastSucceededAt: this.health?.lastSucceededAt ?? null,
      lastFailedAt: input.failedAt.toISOString(),
      lastDurationMs: input.durationMs,
      lastAttemptCount: input.attempts,
      recordsReceived: 0,
      recordsWritten: 0,
      consecutiveFailures: (this.health?.consecutiveFailures ?? 0) + 1,
      nextEligibleRefreshAt: input.nextEligibleRefreshAt.toISOString(),
      error: input.failure,
    };
    return true;
  }

  async readHealth(): Promise<SourceHealth | null> {
    return this.health;
  }
}

function cachedSnapshot(fetchedAt: string): ProviderSnapshot<ReferenceRecord> {
  const adapter = referenceAdapter();
  const records = adapter.normalize(adapter.fixturePayload!, {
    fetchedAt,
    provider: adapter.provider,
    providerLabel: adapter.providerLabel,
    dataset: adapter.dataset,
    adapterVersion: adapter.adapterVersion,
    sourceUrl: adapter.request().url,
  });
  return {
    provider: adapter.provider,
    dataset: adapter.dataset,
    records,
    fetchedAt,
  };
}

function engine(
  store: MemoryProviderStore,
  input: {
    mode?: "fixture" | "live";
    now?: () => Date;
    fetch?: typeof globalThis.fetch;
    logs?: ProviderLogEvent[];
    sleep?: (milliseconds: number) => Promise<void>;
    defer?: (work: () => Promise<void>) => void;
  } = {},
) {
  return new ProviderEngine(
    store,
    {
      mode: input.mode ?? "fixture",
      timeoutMs: 5,
      maxAttempts: 2,
      baseRetryDelayMs: 10,
      maxRetryDelayMs: 100,
      failureBackoffSeconds: 60,
    },
    {
      ...(input.now ? { now: input.now } : {}),
      ...(input.fetch ? { fetch: input.fetch } : {}),
      random: () => 0.5,
      randomUUID: () => "6fa459ea-ee8a-3ca4-894e-db77e160355e",
      sleep: input.sleep ?? (async () => undefined),
      ...(input.defer ? { defer: input.defer } : {}),
      log: (event) => input.logs?.push(event),
    },
  );
}

describe("ProviderEngine", () => {
  it("refreshes a fixture adapter and then serves a current cache hit", async () => {
    const store = new MemoryProviderStore();
    const now = new Date("2026-09-02T06:00:00.000Z");
    const provider = engine(store, { now: () => now });

    const refreshed = await provider.read(referenceAdapter());
    const cached = await provider.read(referenceAdapter());

    expect(refreshed.status).toBe("refreshed");
    expect(refreshed.freshness).toBe("live");
    expect(cached.status).toBe("cache_hit");
    expect(cached.snapshot?.records[0]?.data.value).toBe(42);
    expect(store.commits).toBe(1);
  });

  it("returns last-known-good data when another refresh owns the lease", async () => {
    const store = new MemoryProviderStore();
    store.snapshot = cachedSnapshot("2026-09-02T05:58:01.000Z");
    store.contend = true;
    const provider = engine(store, {
      now: () => new Date("2026-09-02T06:00:01.000Z"),
    });

    const result = await provider.read(referenceAdapter());

    expect(result.status).toBe("lease_contended");
    expect(result.freshness).toBe("delayed");
    expect(result.snapshot?.records).toHaveLength(1);
    expect(store.commits).toBe(0);
  });

  it("rejects malformed and empty payloads without overwriting the cache", async () => {
    const original = cachedSnapshot("2026-09-02T05:57:00.000Z");
    const malformedStore = new MemoryProviderStore();
    malformedStore.snapshot = original;
    const malformedFetch = vi.fn<typeof globalThis.fetch>(async () =>
      Response.json({ items: "secret-malformed-value" }),
    );
    const logs: ProviderLogEvent[] = [];

    const malformed = await engine(malformedStore, {
      mode: "live",
      now: () => new Date("2026-09-02T06:00:01.000Z"),
      fetch: malformedFetch,
      logs,
    }).read(referenceAdapter());

    const emptyStore = new MemoryProviderStore();
    emptyStore.snapshot = original;
    const empty = await engine(emptyStore, {
      now: () => new Date("2026-09-02T06:00:01.000Z"),
    }).read(referenceAdapter({ items: [] }));

    expect(malformed.status).toBe("stale_fallback");
    expect(malformed.health?.error?.code).toBe("validation");
    expect(empty.health?.error?.code).toBe("empty_payload");
    expect(malformedStore.snapshot).toBe(original);
    expect(emptyStore.snapshot).toBe(original);
    expect(JSON.stringify(logs)).not.toContain("secret-malformed-value");
    expect(JSON.stringify(logs)).not.toContain("never-log-this-secret");
  });

  it("honors rate-limit retry hints within a bounded retry and recovers", async () => {
    const store = new MemoryProviderStore();
    const sleeps: number[] = [];
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 429,
          headers: { "retry-after": "0.05" },
        }),
      )
      .mockResolvedValueOnce(
        Response.json({ items: [{ id: "alpha", value: 77 }] }),
      );

    const result = await engine(store, {
      mode: "live",
      now: () => new Date("2026-09-02T06:00:00.000Z"),
      fetch,
      sleep: async (milliseconds) => {
        sleeps.push(milliseconds);
      },
    }).read(referenceAdapter());

    expect(result.status).toBe("refreshed");
    expect(result.snapshot?.records[0]?.data.value).toBe(77);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(sleeps).toEqual([50]);
    expect(result.health?.lastAttemptCount).toBe(2);
  });

  it("times out safely, keeps a stale snapshot, and records backoff", async () => {
    const store = new MemoryProviderStore();
    store.snapshot = cachedSnapshot("2026-09-02T05:57:00.000Z");
    const fetch = vi.fn<typeof globalThis.fetch>(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("provider secret", "AbortError")),
          );
        }),
    );

    const result = await engine(store, {
      mode: "live",
      now: () => new Date("2026-09-02T06:00:00.000Z"),
      fetch,
    }).read(referenceAdapter());

    expect(result.status).toBe("stale_fallback");
    expect(result.health?.error?.code).toBe("timeout");
    expect(result.health?.nextEligibleRefreshAt).toBe(
      "2026-09-02T06:01:00.000Z",
    );
    expect(store.snapshot?.records[0]?.data.value).toBe(42);
  });

  it("serves stale-while-revalidate and performs deferred recovery", async () => {
    const store = new MemoryProviderStore();
    store.snapshot = cachedSnapshot("2026-09-02T05:57:00.000Z");
    const deferred: Array<() => Promise<void>> = [];
    const provider = engine(store, {
      now: () => new Date("2026-09-02T06:00:00.000Z"),
      defer: (work) => deferred.push(work),
    });

    const immediate = await provider.read(referenceAdapter(), {
      backgroundRefresh: true,
    });
    expect(immediate.status).toBe("stale_while_revalidate");
    expect(immediate.refreshScheduled).toBe(true);
    expect(store.commits).toBe(0);

    await deferred[0]?.();
    expect(store.commits).toBe(1);
    expect(store.health?.state).toBe("succeeded");
  });

  it("recovers after a failed refresh once its backoff expires", async () => {
    const store = new MemoryProviderStore();
    store.snapshot = cachedSnapshot("2026-09-02T05:57:00.000Z");
    let current = new Date("2026-09-02T06:00:00.000Z");
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(
        Response.json({ items: [{ id: "alpha", value: 99 }] }),
      );
    const provider = engine(store, {
      mode: "live",
      now: () => current,
      fetch,
    });

    const failed = await provider.read(referenceAdapter());
    const backedOff = await provider.read(referenceAdapter());
    current = new Date("2026-09-02T06:01:01.000Z");
    const recovered = await provider.read(referenceAdapter());

    expect(failed.health?.error?.code).toBe("upstream_rejected");
    expect(backedOff.status).toBe("stale_fallback");
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(recovered.status).toBe("refreshed");
    expect(recovered.snapshot?.records[0]?.data.value).toBe(99);
    expect(recovered.health?.consecutiveFailures).toBe(0);
  });

  it.each<[number, FreshnessState]>([
    [0, "live"],
    [30, "current"],
    [90, "delayed"],
    [300, "stale"],
    [4_000, "unavailable"],
  ])("classifies a %ss-old snapshot as %s", async (ageSeconds, expected) => {
    const store = new MemoryProviderStore();
    const now = new Date("2026-09-02T06:00:00.000Z");
    store.snapshot = cachedSnapshot(
      new Date(now.getTime() - ageSeconds * 1000).toISOString(),
    );
    if (
      expected === "delayed" ||
      expected === "stale" ||
      expected === "unavailable"
    ) {
      store.contend = true;
    }

    const result = await engine(store, { now: () => now }).read(
      referenceAdapter(),
    );
    expect(result.freshness).toBe(expected);
  });
});
