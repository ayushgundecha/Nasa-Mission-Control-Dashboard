// @vitest-environment node

import { PGlite } from "@electric-sql/pglite";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { schema } from "@/db/schema";

import { DatabaseProviderStore, type ProviderDatabase } from "./database-store";
import type { NormalizedProviderRecord } from "./types";

describe("DatabaseProviderStore", () => {
  let client: PGlite;
  let database: PgliteDatabase<typeof schema>;
  let store: DatabaseProviderStore;

  beforeAll(async () => {
    client = new PGlite();
    database = drizzle(client, { schema });
    await migrate(database, { migrationsFolder: "drizzle" });
    store = new DatabaseProviderStore(database as unknown as ProviderDatabase);
  });

  afterAll(async () => {
    await client.close();
  });

  it("atomically commits normalized records and exposes structured health", async () => {
    const now = new Date("2026-09-02T07:00:00.000Z");
    const key = {
      provider: "reference_provider",
      dataset: "reference_records",
    };
    const lease = await store.acquireLease(key, {
      token: "6fa459ea-ee8a-3ca4-894e-db77e160355e",
      now,
      leaseSeconds: 30,
    });
    expect(lease).not.toBeNull();

    const record: NormalizedProviderRecord<{ value: number }> = {
      id: "reference:alpha",
      upstreamRecordId: "alpha",
      data: { value: 42 },
      contentHash: "hash-alpha-42",
      source: {
        provider: "reference_provider",
        providerLabel: "Reference Provider",
        upstreamRecordId: "alpha",
        sourceUrl: "https://example.test/reference/alpha",
        observedAt: now.toISOString(),
        fetchedAt: now.toISOString(),
        upstreamVersion: "fixture-v1",
        adapterVersion: "1.0.0",
        freshness: {
          state: "current",
          ageSeconds: 0,
          staleAfterSeconds: 120,
          reason: null,
        },
      },
    };

    expect(
      await store.commitRefresh(lease!, {
        records: [record],
        fetchedAt: now.toISOString(),
        finishedAt: now,
        durationMs: 48,
        attempts: 2,
        recordsReceived: 1,
      }),
    ).toBe(true);

    const snapshot = await store.readSnapshot<{ value: number }>(key);
    const health = await store.readHealth(key);
    expect(snapshot?.records[0]?.data).toEqual({ value: 42 });
    expect(snapshot?.fetchedAt).toBe(now.toISOString());
    expect(health).toMatchObject({
      state: "succeeded",
      lastDurationMs: 48,
      lastAttemptCount: 2,
      recordsReceived: 1,
      recordsWritten: 1,
      consecutiveFailures: 0,
      error: null,
    });
  });

  it("rejects a lost lease without changing last-known-good records", async () => {
    const key = {
      provider: "reference_provider",
      dataset: "reference_records",
    };
    const replacementLease = await store.acquireLease(key, {
      token: "75442486-0878-440c-9db1-a7006c25a39f",
      now: new Date("2026-09-02T07:05:00.000Z"),
      leaseSeconds: 30,
    });
    const current = await store.readSnapshot<{ value: number }>(key);
    const replacement = {
      ...current!.records[0]!,
      data: { value: 43 },
      contentHash: "hash-alpha-43",
    };
    expect(
      await store.commitRefresh(replacementLease!, {
        records: [replacement],
        fetchedAt: "2026-09-02T07:05:00.000Z",
        finishedAt: new Date("2026-09-02T07:05:00.000Z"),
        durationMs: 20,
        attempts: 1,
        recordsReceived: 1,
      }),
    ).toBe(true);

    const count = await client.query<{ count: number }>(`
      SELECT count(*)::integer AS count
      FROM provider_records
      WHERE provider = 'reference_provider' AND dataset = 'reference_records'
    `);
    expect(count.rows[0]?.count).toBe(1);
    expect(
      (await store.readSnapshot<{ value: number }>(key))?.records[0]?.data
        .value,
    ).toBe(43);

    const wrongLease = {
      ...key,
      token: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      expiresAt: "2026-09-02T07:10:00.000Z",
    };

    expect(
      await store.commitRefresh(wrongLease, {
        records: [],
        fetchedAt: "2026-09-02T07:09:00.000Z",
        finishedAt: new Date("2026-09-02T07:09:00.000Z"),
        durationMs: 1,
        attempts: 1,
        recordsReceived: 0,
      }),
    ).toBe(false);
    expect(
      (await store.readSnapshot<{ value: number }>(key))?.records[0]?.data
        .value,
    ).toBe(43);
  });

  it("records sanitized failures while retaining normalized data", async () => {
    const key = {
      provider: "reference_provider",
      dataset: "reference_records",
    };
    const lease = await store.acquireLease(key, {
      token: "67e55044-10b1-426f-9247-bb680e5fe0c8",
      now: new Date("2026-09-02T07:20:00.000Z"),
      leaseSeconds: 30,
    });
    expect(lease).not.toBeNull();

    expect(
      await store.failRefresh(lease!, {
        failedAt: new Date("2026-09-02T07:20:01.000Z"),
        durationMs: 1_000,
        attempts: 3,
        failure: {
          code: "rate_limited",
          message: "Provider temporarily limited refresh requests.",
          retryable: true,
          retryAfterMs: 60_000,
        },
        nextEligibleRefreshAt: new Date("2026-09-02T07:21:01.000Z"),
      }),
    ).toBe(true);

    expect(await store.readHealth(key)).toMatchObject({
      state: "failed",
      lastAttemptCount: 3,
      consecutiveFailures: 1,
      nextEligibleRefreshAt: "2026-09-02T07:21:01.000Z",
      error: {
        code: "rate_limited",
        retryable: true,
        retryAfterMs: 60_000,
      },
    });
    expect(
      (await store.readSnapshot<{ value: number }>(key))?.records[0]?.data
        .value,
    ).toBe(43);
  });
});
