// @vitest-environment node

import { PGlite } from "@electric-sql/pglite";
import { count, eq } from "drizzle-orm";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { missionEvaluationFixture } from "@/domain/__fixtures__/contracts.fixtures";

import { getFixtureLaunch, seedDeterministicFixtures } from "./fixtures";
import { acquireRefreshLease, completeRefreshLease } from "./leases";
import { missionDossiers, providerRecords, schema } from "./schema";

describe("AstraOps persistence foundation", () => {
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

  it("applies the migration from empty and safely skips it when repeated", async () => {
    await migrate(database, { migrationsFolder: "drizzle" });

    const result = await client.query<{ table_name: string }>(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('provider_records', 'source_syncs', 'vehicle_profiles', 'mission_dossiers', 'creation_rate_events')
      ORDER BY table_name
    `);

    expect(result.rows.map((row) => row.table_name)).toEqual([
      "creation_rate_events",
      "mission_dossiers",
      "provider_records",
      "source_syncs",
      "vehicle_profiles",
    ]);
  });

  it("seeds normalized fixtures idempotently", async () => {
    await seedDeterministicFixtures(database);
    await seedDeterministicFixtures(database);

    const [rowCount] = await database
      .select({ value: count() })
      .from(providerRecords);
    expect(rowCount?.value).toBe(1);
    expect((await getFixtureLaunch(database))?.dataset).toBe("launches");
  });

  it("acquires a refresh lease atomically and rejects a concurrent owner", async () => {
    const firstToken = "6fa459ea-ee8a-3ca4-894e-db77e160355e";
    const secondToken = "7c9e6679-7425-40de-944b-e07fc1f90ae7";

    const contenders = await Promise.all(
      [firstToken, secondToken].map((leaseToken) =>
        acquireRefreshLease(database, {
          provider: "launch_library_2",
          dataset: "launches",
          leaseToken,
          leaseSeconds: 60,
        }),
      ),
    );
    const winner = contenders.find((lease) => lease !== null);

    expect(contenders.filter((lease) => lease !== null)).toHaveLength(1);
    expect(winner?.leaseToken).toBe(firstToken);
    expect(contenders[1]).toBeNull();
    expect(
      await completeRefreshLease(database, {
        provider: "launch_library_2",
        dataset: "launches",
        leaseToken: winner!.leaseToken,
        recordsWritten: 1,
      }),
    ).toBe(true);
  });

  it("enforces immutable mission snapshots at the data layer", async () => {
    const [inserted] = await database
      .insert(missionDossiers)
      .values({
        publicId: "fixture-lunar-001",
        contractVersion: missionEvaluationFixture.contractVersion,
        calculationVersion: missionEvaluationFixture.calculationVersion,
        classification: missionEvaluationFixture.classification,
        title: missionEvaluationFixture.input.title,
        snapshot: missionEvaluationFixture,
        deletionTokenHash: "a".repeat(64),
      })
      .returning({ id: missionDossiers.id });

    expect(inserted?.id).toBeTruthy();
    await expect(
      database
        .update(missionDossiers)
        .set({ title: "Mutated title" })
        .where(eq(missionDossiers.publicId, "fixture-lunar-001")),
    ).rejects.toThrow();

    const [preserved] = await database
      .select({ title: missionDossiers.title })
      .from(missionDossiers)
      .where(eq(missionDossiers.publicId, "fixture-lunar-001"));
    expect(preserved?.title).toBe(missionEvaluationFixture.input.title);
  });
});
