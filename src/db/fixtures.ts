import { createHash } from "node:crypto";

import { eq } from "drizzle-orm";
import type { PgliteDatabase } from "drizzle-orm/pglite";

import { launchFixture } from "@/domain/__fixtures__/contracts.fixtures";

import { providerRecords, schema } from "./schema";

type FixtureDatabase = PgliteDatabase<typeof schema>;

export async function seedDeterministicFixtures(
  database: FixtureDatabase,
): Promise<void> {
  const normalized = JSON.stringify(launchFixture);
  const contentHash = createHash("sha256").update(normalized).digest("hex");

  await database
    .insert(providerRecords)
    .values({
      id: launchFixture.id,
      provider: launchFixture.source.provider,
      dataset: "launches",
      upstreamRecordId:
        launchFixture.source.upstreamRecordId ?? launchFixture.id,
      normalizedRecord: launchFixture,
      sourceStamp: launchFixture.source,
      contentHash,
      observedAt: launchFixture.source.observedAt
        ? new Date(launchFixture.source.observedAt)
        : null,
      fetchedAt: new Date(launchFixture.source.fetchedAt),
      freshness: launchFixture.source.freshness.state,
      adapterVersion: launchFixture.source.adapterVersion,
      updatedAt: new Date(launchFixture.source.fetchedAt),
    })
    .onConflictDoUpdate({
      target: providerRecords.id,
      set: {
        normalizedRecord: launchFixture,
        sourceStamp: launchFixture.source,
        contentHash,
        fetchedAt: new Date(launchFixture.source.fetchedAt),
        freshness: launchFixture.source.freshness.state,
        adapterVersion: launchFixture.source.adapterVersion,
        updatedAt: new Date(launchFixture.source.fetchedAt),
      },
    });
}

export async function getFixtureLaunch(database: FixtureDatabase) {
  return database.query.providerRecords.findFirst({
    where: eq(providerRecords.id, launchFixture.id),
  });
}
