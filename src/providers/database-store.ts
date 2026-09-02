import { sql } from "drizzle-orm";

import type { FreshnessState, SourceStamp } from "@/domain";
import { acquireRefreshLease } from "@/db/leases";

import type {
  NormalizedProviderRecord,
  ProviderKey,
  ProviderLease,
  ProviderSnapshot,
  ProviderStore,
  SafeProviderErrorCode,
  SourceHealth,
} from "./types";

type QueryResult = { rows?: unknown[] } | unknown[];
type TransactionDatabase = {
  execute: (query: ReturnType<typeof sql>) => Promise<QueryResult>;
};
export type ProviderDatabase = TransactionDatabase & {
  transaction: <T>(
    work: (transaction: TransactionDatabase) => Promise<T>,
  ) => Promise<T>;
};

type ProviderRecordRow = {
  id: string;
  upstreamRecordId: string;
  normalizedRecord: unknown;
  sourceStamp: SourceStamp;
  contentHash: string;
  fetchedAt: Date | string;
};

type HealthRow = {
  provider: string;
  dataset: string;
  state: SourceHealth["state"];
  lastStartedAt: Date | string | null;
  lastSucceededAt: Date | string | null;
  lastFailedAt: Date | string | null;
  lastDurationMs: number | null;
  lastAttemptCount: number;
  recordsReceived: number;
  recordsWritten: number;
  consecutiveFailures: number;
  nextEligibleRefreshAt: Date | string | null;
  lastErrorCode: SafeProviderErrorCode | null;
  lastErrorMessage: string | null;
  lastErrorRetryable: number | null;
  lastErrorRetryAfterMs: number | null;
};

function rows<T>(result: QueryResult): T[] {
  return ((result as { rows?: T[] }).rows ?? result) as T[];
}

function iso(value: Date | string | null): string | null {
  if (value === null) return null;
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}

export class DatabaseProviderStore implements ProviderStore {
  constructor(private readonly database: ProviderDatabase) {}

  async readSnapshot<TRecord>(
    key: ProviderKey,
  ): Promise<ProviderSnapshot<TRecord> | null> {
    const result = await this.database.execute(sql`
      SELECT
        id,
        upstream_record_id AS "upstreamRecordId",
        normalized_record AS "normalizedRecord",
        source_stamp AS "sourceStamp",
        content_hash AS "contentHash",
        fetched_at AS "fetchedAt"
      FROM provider_records
      WHERE provider = ${key.provider} AND dataset = ${key.dataset}
      ORDER BY upstream_record_id ASC
    `);
    const records = rows<ProviderRecordRow>(result);
    if (records.length === 0) return null;

    const fetchedAt = records.reduce((latest, record) => {
      const current = iso(record.fetchedAt) ?? latest;
      return current > latest ? current : latest;
    }, "");

    return {
      ...key,
      fetchedAt,
      records: records.map((record) => ({
        id: record.id,
        upstreamRecordId: record.upstreamRecordId,
        data: record.normalizedRecord as TRecord,
        source: record.sourceStamp,
        contentHash: record.contentHash,
      })),
    };
  }

  async acquireLease(
    key: ProviderKey,
    input: { token: string; now: Date; leaseSeconds: number },
  ): Promise<ProviderLease | null> {
    void input.now;
    const lease = await acquireRefreshLease(this.database, {
      ...key,
      leaseToken: input.token,
      leaseSeconds: input.leaseSeconds,
    });
    return lease
      ? {
          ...key,
          token: lease.leaseToken,
          expiresAt: iso(lease.leaseExpiresAt) ?? input.now.toISOString(),
        }
      : null;
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
    return this.database.transaction(async (transaction) => {
      const ownership = rows<{ provider: string }>(
        await transaction.execute(sql`
          UPDATE source_syncs SET
            state = 'succeeded',
            lease_token = NULL,
            lease_expires_at = NULL,
            last_succeeded_at = ${input.finishedAt},
            last_error_code = NULL,
            last_error_message = NULL,
            last_error_retryable = NULL,
            last_error_retry_after_ms = NULL,
            last_duration_ms = ${input.durationMs},
            last_attempt_count = ${input.attempts},
            records_received = ${input.recordsReceived},
            records_written = ${input.records.length},
            consecutive_failures = 0,
            next_eligible_refresh_at = NULL,
            updated_at = ${input.finishedAt}
          WHERE provider = ${lease.provider}
            AND dataset = ${lease.dataset}
            AND lease_token = ${lease.token}::uuid
          RETURNING provider
        `),
      );
      if (ownership.length !== 1) return false;

      for (const record of input.records) {
        const observedAt = record.source.observedAt
          ? new Date(record.source.observedAt)
          : null;
        await transaction.execute(sql`
          INSERT INTO provider_records (
            id, provider, dataset, upstream_record_id, normalized_record,
            source_stamp, content_hash, observed_at, fetched_at, freshness,
            adapter_version, created_at, updated_at
          ) VALUES (
            ${record.id}, ${lease.provider}, ${lease.dataset},
            ${record.upstreamRecordId}, ${JSON.stringify(record.data)}::jsonb,
            ${JSON.stringify(record.source)}::jsonb, ${record.contentHash},
            ${observedAt}, ${new Date(input.fetchedAt)},
            ${record.source.freshness.state}::freshness_state,
            ${record.source.adapterVersion}, ${input.finishedAt}, ${input.finishedAt}
          )
          ON CONFLICT (provider, dataset, upstream_record_id) DO UPDATE SET
            id = EXCLUDED.id,
            normalized_record = EXCLUDED.normalized_record,
            source_stamp = EXCLUDED.source_stamp,
            content_hash = EXCLUDED.content_hash,
            observed_at = EXCLUDED.observed_at,
            fetched_at = EXCLUDED.fetched_at,
            freshness = EXCLUDED.freshness,
            adapter_version = EXCLUDED.adapter_version,
            updated_at = EXCLUDED.updated_at
        `);
      }

      return true;
    });
  }

  async failRefresh(
    lease: ProviderLease,
    input: Parameters<ProviderStore["failRefresh"]>[1],
  ): Promise<boolean> {
    const result = await this.database.execute(sql`
      UPDATE source_syncs SET
        state = 'failed',
        lease_token = NULL,
        lease_expires_at = NULL,
        last_failed_at = ${input.failedAt},
        last_error_code = ${input.failure.code},
        last_error_message = ${input.failure.message},
        last_error_retryable = ${input.failure.retryable ? 1 : 0},
        last_error_retry_after_ms = ${input.failure.retryAfterMs},
        last_duration_ms = ${input.durationMs},
        last_attempt_count = ${input.attempts},
        records_received = 0,
        records_written = 0,
        consecutive_failures = consecutive_failures + 1,
        next_eligible_refresh_at = ${input.nextEligibleRefreshAt},
        updated_at = ${input.failedAt}
      WHERE provider = ${lease.provider}
        AND dataset = ${lease.dataset}
        AND lease_token = ${lease.token}::uuid
      RETURNING provider
    `);
    return rows(result).length === 1;
  }

  async readHealth(key: ProviderKey): Promise<SourceHealth | null> {
    const result = await this.database.execute(sql`
      SELECT
        provider,
        dataset,
        state,
        last_started_at AS "lastStartedAt",
        last_succeeded_at AS "lastSucceededAt",
        last_failed_at AS "lastFailedAt",
        last_duration_ms AS "lastDurationMs",
        last_attempt_count AS "lastAttemptCount",
        records_received AS "recordsReceived",
        records_written AS "recordsWritten",
        consecutive_failures AS "consecutiveFailures",
        next_eligible_refresh_at AS "nextEligibleRefreshAt",
        last_error_code AS "lastErrorCode",
        last_error_message AS "lastErrorMessage",
        last_error_retryable AS "lastErrorRetryable",
        last_error_retry_after_ms AS "lastErrorRetryAfterMs"
      FROM source_syncs
      WHERE provider = ${key.provider} AND dataset = ${key.dataset}
    `);
    const row = rows<HealthRow>(result)[0];
    if (!row) return null;

    return {
      provider: row.provider,
      dataset: row.dataset,
      state: row.state,
      freshness: "unavailable" as FreshnessState,
      lastStartedAt: iso(row.lastStartedAt),
      lastSucceededAt: iso(row.lastSucceededAt),
      lastFailedAt: iso(row.lastFailedAt),
      lastDurationMs: row.lastDurationMs,
      lastAttemptCount: row.lastAttemptCount,
      recordsReceived: row.recordsReceived,
      recordsWritten: row.recordsWritten,
      consecutiveFailures: row.consecutiveFailures,
      nextEligibleRefreshAt: iso(row.nextEligibleRefreshAt),
      error: row.lastErrorCode
        ? {
            code: row.lastErrorCode,
            message: row.lastErrorMessage ?? "Provider refresh failed.",
            retryable: row.lastErrorRetryable === 1,
            retryAfterMs: row.lastErrorRetryAfterMs,
          }
        : null,
    };
  }
}
