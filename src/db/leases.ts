import { sql } from "drizzle-orm";

type ExecutableDatabase = {
  execute: (query: ReturnType<typeof sql>) => Promise<unknown>;
};

export type RefreshLease = {
  provider: string;
  dataset: string;
  leaseToken: string;
  leaseExpiresAt: Date;
};

/**
 * Atomically creates or acquires a provider refresh lease. A concurrent owner
 * cannot replace an unexpired lease; the current owner may renew its token.
 */
export async function acquireRefreshLease(
  database: ExecutableDatabase,
  input: {
    provider: string;
    dataset: string;
    leaseToken: string;
    leaseSeconds: number;
  },
): Promise<RefreshLease | null> {
  if (
    !Number.isInteger(input.leaseSeconds) ||
    input.leaseSeconds < 10 ||
    input.leaseSeconds > 900
  ) {
    throw new Error("leaseSeconds must be an integer between 10 and 900");
  }

  const result = await database.execute(sql`
    INSERT INTO source_syncs (
      provider, dataset, state, lease_token, lease_expires_at, last_started_at, updated_at
    ) VALUES (
      ${input.provider}, ${input.dataset}, 'refreshing', ${input.leaseToken}::uuid,
      now() + (${input.leaseSeconds} * interval '1 second'), now(), now()
    )
    ON CONFLICT (provider, dataset) DO UPDATE SET
      state = 'refreshing',
      lease_token = EXCLUDED.lease_token,
      lease_expires_at = EXCLUDED.lease_expires_at,
      last_started_at = now(),
      updated_at = now()
    WHERE source_syncs.lease_expires_at IS NULL
       OR source_syncs.lease_expires_at <= now()
       OR source_syncs.lease_token = EXCLUDED.lease_token
    RETURNING provider, dataset, lease_token AS "leaseToken", lease_expires_at AS "leaseExpiresAt"
  `);

  const rows =
    (result as { rows?: RefreshLease[] }).rows ?? (result as RefreshLease[]);
  return rows[0] ?? null;
}

export async function completeRefreshLease(
  database: ExecutableDatabase,
  input: {
    provider: string;
    dataset: string;
    leaseToken: string;
    recordsWritten: number;
  },
): Promise<boolean> {
  const result = await database.execute(sql`
    UPDATE source_syncs SET
      state = 'succeeded',
      lease_token = NULL,
      lease_expires_at = NULL,
      last_succeeded_at = now(),
      records_written = ${input.recordsWritten},
      last_error_code = NULL,
      last_error_message = NULL,
      updated_at = now()
    WHERE provider = ${input.provider}
      AND dataset = ${input.dataset}
      AND lease_token = ${input.leaseToken}::uuid
    RETURNING provider
  `);
  const rows = (result as { rows?: unknown[] }).rows ?? (result as unknown[]);
  return rows.length === 1;
}
