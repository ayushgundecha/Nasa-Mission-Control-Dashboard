// @vitest-environment node

import { PGlite } from "@electric-sql/pglite";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { schema } from "@/db/schema";
import {
  DatabaseProviderStore,
  ProviderEngine,
  type ProviderDatabase,
} from "@/providers";

import { createLaunchLibraryAdapter } from "./adapter";
import { ll2UpcomingFixture } from "./fixtures";
import { ll2LaunchPageSchema } from "./schema";
import type { LaunchIntelligenceRecord } from "./types";

describe("Launch Library 2 persistence integration", () => {
  let client: PGlite;
  let database: PgliteDatabase<typeof schema>;

  beforeAll(async () => {
    client = new PGlite();
    database = drizzle(client, { schema });
    await migrate(database, { migrationsFolder: "drizzle" });
  });

  afterAll(async () => {
    await client.close();
  });

  it("populates and reconciles an updated launch without duplication", async () => {
    const store = new DatabaseProviderStore(
      database as unknown as ProviderDatabase,
    );
    const provider = new ProviderEngine(
      store,
      { mode: "fixture", maxAttempts: 1 },
      { now: () => new Date("2026-09-02T08:00:00.000Z") },
    );
    const initialAdapter = createLaunchLibraryAdapter({
      feed: "upcoming",
      environment: "development",
      fixturePayload: ll2UpcomingFixture,
    });

    const initial = await provider.read(initialAdapter);
    expect(initial.status).toBe("refreshed");

    const updatedPayload = ll2LaunchPageSchema.parse({
      ...ll2UpcomingFixture,
      results: [
        {
          ...ll2UpcomingFixture.results[0],
          name: "Electron | Owl Around The World — Updated",
          last_updated: "2026-09-02T07:59:00Z",
        },
      ],
    });
    const updated = await provider.read(
      createLaunchLibraryAdapter({
        feed: "upcoming",
        environment: "development",
        fixturePayload: updatedPayload,
      }),
      { forceRefresh: true },
    );
    const snapshot = await store.readSnapshot<LaunchIntelligenceRecord>({
      provider: "launch_library_2",
      dataset: "launches_upcoming",
    });
    const count = await client.query<{ count: number }>(`
      SELECT count(*)::integer AS count
      FROM provider_records
      WHERE provider = 'launch_library_2' AND dataset = 'launches_upcoming'
    `);

    expect(updated.status).toBe("refreshed");
    expect(count.rows[0]?.count).toBe(1);
    expect(snapshot?.records[0]?.data.launch.name).toContain("Updated");
    expect(snapshot?.records[0]?.data.upstream.lastUpdatedAt).toBe(
      "2026-09-02T07:59:00Z",
    );
  });

  it("honors Launch Library 2 rate limiting and succeeds within its retry budget", async () => {
    const store = new DatabaseProviderStore(
      database as unknown as ProviderDatabase,
    );
    const sleeps: number[] = [];
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 429,
          headers: { "retry-after": "0.025" },
        }),
      )
      .mockResolvedValueOnce(Response.json(ll2UpcomingFixture));
    const provider = new ProviderEngine(
      store,
      {
        mode: "live",
        maxAttempts: 2,
        baseRetryDelayMs: 10,
        maxRetryDelayMs: 100,
      },
      {
        now: () => new Date("2026-09-02T08:30:00.000Z"),
        fetch,
        sleep: async (milliseconds) => {
          sleeps.push(milliseconds);
        },
      },
    );

    const result = await provider.read(
      createLaunchLibraryAdapter({
        feed: "upcoming",
        environment: "development",
      }),
      { forceRefresh: true },
    );

    expect(result.status).toBe("refreshed");
    expect(result.snapshot?.records).toHaveLength(1);
    expect(result.health?.lastAttemptCount).toBe(2);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(sleeps).toEqual([25]);
  });
});
