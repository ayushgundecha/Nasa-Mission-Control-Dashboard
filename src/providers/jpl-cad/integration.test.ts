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

import { createJplCadAdapter } from "./adapter";
import { jplCadEmptyFixture, jplCadKnownFixture } from "./fixtures";
import type { JplCadRecord } from "./types";

const options = { startDate: "2026-09-04", endDate: "2026-11-03" } as const;

describe("JPL CAD persistence integration", () => {
  let client: PGlite;
  let database: PgliteDatabase<typeof schema>;

  beforeAll(async () => {
    client = new PGlite();
    database = drizzle(client, { schema });
    await migrate(database, { migrationsFolder: "drizzle" });
  });

  afterAll(async () => client.close());

  it("preserves last-known-good predictions when JPL is unavailable", async () => {
    const store = new DatabaseProviderStore(
      database as unknown as ProviderDatabase,
    );
    let now = new Date("2026-09-04T00:00:00.000Z");
    const provider = new ProviderEngine(
      store,
      { mode: "live", maxAttempts: 1 },
      {
        now: () => now,
        fetch: vi
          .fn<typeof globalThis.fetch>()
          .mockResolvedValueOnce(Response.json(jplCadKnownFixture))
          .mockResolvedValueOnce(new Response(null, { status: 503 })),
      },
    );
    const adapter = createJplCadAdapter(options);
    expect((await provider.read(adapter)).status).toBe("refreshed");
    now = new Date("2026-09-04T06:00:01.000Z");
    const fallback = await provider.read(adapter);
    const stored = await store.readSnapshot<JplCadRecord>({
      provider: "jpl_cad",
      dataset: "earth_close_approaches",
    });
    expect(fallback.status).toBe("stale_fallback");
    expect(stored?.records).toHaveLength(1);
    expect(fallback.health?.error?.code).toBe("upstream_rejected");
  });

  it("persists a valid zero-result response as an authoritative empty snapshot", async () => {
    const store = new DatabaseProviderStore(
      database as unknown as ProviderDatabase,
    );
    const provider = new ProviderEngine(
      store,
      { mode: "fixture", maxAttempts: 1 },
      {
        now: () => new Date("2026-09-05T00:00:00.000Z"),
      },
    );
    const result = await provider.read(
      createJplCadAdapter({ ...options, fixturePayload: jplCadEmptyFixture }),
      { forceRefresh: true },
    );
    const stored = await store.readSnapshot<JplCadRecord>({
      provider: "jpl_cad",
      dataset: "earth_close_approaches",
    });
    expect(result.status).toBe("refreshed");
    expect(stored?.records).toEqual([]);
  });
});
