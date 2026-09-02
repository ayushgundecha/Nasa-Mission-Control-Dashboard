import type { z } from "zod";

import type { FreshnessState, SourceStamp } from "@/domain";

export type DataMode = "fixture" | "live";

export type FreshnessPolicy = Readonly<{
  liveForSeconds: number;
  currentForSeconds: number;
  delayedForSeconds: number;
  usableForSeconds: number;
}>;

export type ProviderKey = Readonly<{
  provider: string;
  dataset: string;
}>;

export type ProviderRequest = Readonly<{
  url: string;
  init?: RequestInit;
}>;

export type NormalizeContext = Readonly<{
  fetchedAt: string;
  provider: string;
  providerLabel: string;
  dataset: string;
  adapterVersion: string;
  sourceUrl: string;
}>;

export type NormalizedProviderRecord<TRecord> = Readonly<{
  id: string;
  upstreamRecordId: string;
  data: TRecord;
  source: SourceStamp;
  contentHash: string;
}>;

export interface ProviderAdapter<TPayload, TRecord> extends ProviderKey {
  readonly providerLabel: string;
  readonly adapterVersion: string;
  readonly payloadSchema: z.ZodType<TPayload>;
  readonly freshness: FreshnessPolicy;
  readonly request: () => ProviderRequest;
  readonly fixturePayload?: TPayload;
  readonly normalize: (
    payload: TPayload,
    context: NormalizeContext,
  ) => readonly NormalizedProviderRecord<TRecord>[];
}

export type ProviderSnapshot<TRecord> = Readonly<{
  provider: string;
  dataset: string;
  records: readonly NormalizedProviderRecord<TRecord>[];
  fetchedAt: string;
}>;

export type ProviderLease = Readonly<
  ProviderKey & {
    token: string;
    expiresAt: string;
  }
>;

export type SafeProviderErrorCode =
  | "empty_payload"
  | "internal"
  | "network"
  | "rate_limited"
  | "timeout"
  | "upstream_rejected"
  | "validation";

export type ProviderFailure = Readonly<{
  code: SafeProviderErrorCode;
  message: string;
  retryable: boolean;
  retryAfterMs: number | null;
}>;

export type SourceHealth = Readonly<
  ProviderKey & {
    state: "idle" | "refreshing" | "succeeded" | "failed";
    freshness: FreshnessState;
    lastStartedAt: string | null;
    lastSucceededAt: string | null;
    lastFailedAt: string | null;
    lastDurationMs: number | null;
    lastAttemptCount: number;
    recordsReceived: number;
    recordsWritten: number;
    consecutiveFailures: number;
    nextEligibleRefreshAt: string | null;
    error: ProviderFailure | null;
  }
>;

export interface ProviderStore {
  readSnapshot<TRecord>(
    key: ProviderKey,
  ): Promise<ProviderSnapshot<TRecord> | null>;
  acquireLease(
    key: ProviderKey,
    input: { token: string; now: Date; leaseSeconds: number },
  ): Promise<ProviderLease | null>;
  commitRefresh<TRecord>(
    lease: ProviderLease,
    input: {
      records: readonly NormalizedProviderRecord<TRecord>[];
      fetchedAt: string;
      finishedAt: Date;
      durationMs: number;
      attempts: number;
      recordsReceived: number;
    },
  ): Promise<boolean>;
  failRefresh(
    lease: ProviderLease,
    input: {
      failedAt: Date;
      durationMs: number;
      attempts: number;
      failure: ProviderFailure;
      nextEligibleRefreshAt: Date;
    },
  ): Promise<boolean>;
  readHealth(key: ProviderKey): Promise<SourceHealth | null>;
}

export type ProviderLogEvent = Readonly<
  ProviderKey & {
    event:
      | "cache_hit"
      | "lease_contended"
      | "refresh_attempt"
      | "refresh_failed"
      | "refresh_succeeded"
      | "stale_while_revalidate";
    attempt: number;
    durationMs: number;
    recordsReceived: number;
    recordsWritten: number;
    nextEligibleRefreshAt: string | null;
    errorCode: SafeProviderErrorCode | null;
  }
>;

export type ProviderReadStatus =
  | "cache_hit"
  | "lease_contended"
  | "refreshed"
  | "stale_fallback"
  | "stale_while_revalidate"
  | "unavailable";

export type ProviderReadResult<TRecord> = Readonly<{
  status: ProviderReadStatus;
  freshness: FreshnessState;
  snapshot: ProviderSnapshot<TRecord> | null;
  health: SourceHealth | null;
  refreshScheduled: boolean;
}>;
