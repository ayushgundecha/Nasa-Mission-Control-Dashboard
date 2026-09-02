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

import { buildSpaceWeatherBriefing } from "./briefing";
import { createDonkiFlareAdapter } from "./donki/adapter";
import { donkiEmptyFixture, donkiFlareFixture } from "./donki/fixtures";
import { createNoaaKpAdapter, createNoaaScalesAdapter } from "./noaa/adapter";
import {
  noaaEmptyKpFixture,
  noaaKpFixture,
  noaaScalesFixture,
} from "./noaa/fixtures";
import type { DonkiEvent } from "./types";

describe("space-weather failure isolation", () => {
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

  it("retains stale NOAA data when a later payload is empty", async () => {
    let now = new Date("2026-09-02T07:05:00.000Z");
    const provider = new ProviderEngine(
      store,
      { mode: "fixture", maxAttempts: 1 },
      { now: () => now },
    );
    const initial = await provider.read(createNoaaKpAdapter(noaaKpFixture));
    expect(initial.snapshot?.records).toHaveLength(7);

    now = new Date("2026-09-02T07:25:00.000Z");
    const failed = await provider.read(
      createNoaaKpAdapter(noaaEmptyKpFixture),
      {
        forceRefresh: true,
      },
    );

    expect(failed.status).toBe("stale_fallback");
    expect(failed.freshness).toBe("stale");
    expect(failed.health?.error?.code).toBe("empty_payload");
    expect(failed.snapshot?.records).toHaveLength(7);
  });

  it("keeps cached NOAA scales when the provider rejects a refresh", async () => {
    let now = new Date("2026-09-02T07:05:00.000Z");
    const fixtureProvider = new ProviderEngine(
      store,
      { mode: "fixture", maxAttempts: 1 },
      { now: () => now },
    );
    await fixtureProvider.read(createNoaaScalesAdapter(noaaScalesFixture));

    now = new Date("2026-09-02T07:25:00.000Z");
    const fetch = vi.fn<typeof globalThis.fetch>(
      async () => new Response(null, { status: 503 }),
    );
    const liveProvider = new ProviderEngine(
      store,
      { mode: "live", maxAttempts: 1 },
      { now: () => now, fetch },
    );
    const failed = await liveProvider.read(createNoaaScalesAdapter(), {
      forceRefresh: true,
    });

    expect(fetch).toHaveBeenCalledOnce();
    expect(failed.status).toBe("stale_fallback");
    expect(failed.health?.error?.code).toBe("upstream_rejected");
    expect(failed.snapshot?.records.length).toBeGreaterThan(0);
  });

  it("persists a valid zero-event DONKI window as available", async () => {
    const now = new Date("2026-09-02T08:00:00.000Z");
    const provider = new ProviderEngine(
      store,
      { mode: "fixture", maxAttempts: 1 },
      { now: () => now },
    );
    const options = { apiKey: "fixture-only", endDate: "2026-09-02" };

    await provider.read(
      createDonkiFlareAdapter({
        ...options,
        fixturePayload: donkiFlareFixture,
      }),
      { forceRefresh: true },
    );
    const empty = await provider.read(
      createDonkiFlareAdapter({
        ...options,
        fixturePayload: donkiEmptyFixture,
      }),
      { forceRefresh: true },
    );
    const persisted = await store.readSnapshot<DonkiEvent>({
      provider: "nasa_donki",
      dataset: "donki_flares",
    });
    const briefing = buildSpaceWeatherBriefing({
      kp: [],
      scales: [],
      solarWind: [],
      donki: persisted?.records.map((record) => record.data) ?? null,
    });

    expect(empty.status).toBe("refreshed");
    expect(empty.health?.recordsWritten).toBe(0);
    expect(persisted?.records).toEqual([]);
    expect(briefing.availability).toEqual({
      noaa: "unavailable",
      donki: "available",
    });
    expect(briefing.recentEvents).toEqual([]);
  });

  it("isolates NASA DONKI schema drift from cached NOAA conditions", async () => {
    const now = new Date("2026-09-02T08:20:00.000Z");
    const fixtureProvider = new ProviderEngine(
      store,
      { mode: "fixture", maxAttempts: 1 },
      { now: () => now },
    );
    const noaa = await fixtureProvider.read(
      createNoaaKpAdapter(noaaKpFixture),
      {
        forceRefresh: true,
      },
    );
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      Response.json({ providerContract: "unexpected-object" }),
    );
    const liveProvider = new ProviderEngine(
      store,
      { mode: "live", maxAttempts: 1 },
      { now: () => now, fetch },
    );
    const donki = await liveProvider.read(
      createDonkiFlareAdapter({
        apiKey: "server-only-test-key",
        endDate: "2026-09-02",
      }),
      { forceRefresh: true },
    );

    expect(donki.status).toBe("stale_fallback");
    expect(donki.health?.error?.code).toBe("validation");
    expect(noaa.snapshot?.records).toHaveLength(7);
    const persistedNoaa = await store.readSnapshot({
      provider: "noaa_swpc",
      dataset: "kp_forecast",
    });
    expect(persistedNoaa?.records).toHaveLength(7);
    expect(JSON.stringify(donki)).not.toContain("server-only-test-key");
  });
});
