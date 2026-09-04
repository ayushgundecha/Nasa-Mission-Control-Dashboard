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

import { createCelestrakCatalogAdapter } from "./adapter";
import { celestrakCuration } from "./curation";
import { celestrakOmmFixture, celestrakSixDigitFixture } from "./fixtures";
import type { CelestrakOrbitalRecord } from "./types";

describe("CelesTrak OMM persistence integration", () => {
  let client: PGlite;
  let database: PgliteDatabase<typeof schema>;

  beforeAll(async () => {
    client = new PGlite();
    database = drizzle(client, { schema });
    await migrate(database, { migrationsFolder: "drizzle" });
  });

  afterAll(async () => client.close());

  it("honors the two-hour cache window and retains last-known-good data after a rejected refresh", async () => {
    const store = new DatabaseProviderStore(
      database as unknown as ProviderDatabase,
    );
    let now = new Date("2026-09-02T08:00:00.000Z");
    const provider = new ProviderEngine(
      store,
      { mode: "live", maxAttempts: 1 },
      {
        now: () => now,
        fetch: vi
          .fn<typeof globalThis.fetch>()
          .mockResolvedValueOnce(Response.json(celestrakOmmFixture))
          .mockResolvedValueOnce(new Response(null, { status: 403 })),
      },
    );
    const adapter = createCelestrakCatalogAdapter({
      curation: celestrakCuration[0]!,
    });

    expect((await provider.read(adapter)).status).toBe("refreshed");
    expect((await provider.read(adapter)).status).toBe("cache_hit");
    now = new Date("2026-09-02T10:00:01.000Z");
    const fallback = await provider.read(adapter);
    const snapshot = await store.readSnapshot<CelestrakOrbitalRecord>({
      provider: "celestrak",
      dataset: "omm_stations",
    });

    expect(fallback.status).toBe("stale_fallback");
    expect(snapshot?.records[0]?.data.object.catalogNumber).toBe("25544");
    expect(fallback.health?.error?.code).toBe("upstream_rejected");
  });

  it("replaces a successful group snapshot when a removed object no longer appears", async () => {
    const store = new DatabaseProviderStore(
      database as unknown as ProviderDatabase,
    );
    const provider = new ProviderEngine(
      store,
      { mode: "fixture", maxAttempts: 1 },
      {
        now: () => new Date("2026-09-02T12:00:00.000Z"),
      },
    );
    const curation = celestrakCuration[1]!;
    const first = createCelestrakCatalogAdapter({
      curation,
      fixturePayload: celestrakOmmFixture,
    });
    const changed = createCelestrakCatalogAdapter({
      curation,
      fixturePayload: celestrakSixDigitFixture,
    });

    expect((await provider.read(first)).status).toBe("refreshed");
    expect((await provider.read(changed, { forceRefresh: true })).status).toBe(
      "refreshed",
    );
    const snapshot = await store.readSnapshot<CelestrakOrbitalRecord>({
      provider: "celestrak",
      dataset: "omm_science_weather",
    });

    expect(snapshot?.records).toHaveLength(1);
    expect(snapshot?.records[0]?.data.object.catalogNumber).toBe("270001");
  });
});
