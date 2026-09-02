import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import type {
  Launch,
  MissionEvaluation,
  SourceStamp,
  VehicleProfile,
} from "@/domain";

export const freshnessState = pgEnum("freshness_state", [
  "live",
  "current",
  "delayed",
  "stale",
  "unavailable",
]);
export const syncState = pgEnum("sync_state", [
  "idle",
  "refreshing",
  "succeeded",
  "failed",
]);
export const missionClassification = pgEnum("mission_classification", [
  "operational_estimate",
  "research_concept_not_flight_ready",
]);

export const providerRecords = pgTable(
  "provider_records",
  {
    id: text("id").primaryKey(),
    provider: text("provider").notNull(),
    dataset: text("dataset").notNull(),
    upstreamRecordId: text("upstream_record_id").notNull(),
    normalizedRecord: jsonb("normalized_record")
      .$type<Launch | Record<string, unknown>>()
      .notNull(),
    sourceStamp: jsonb("source_stamp").$type<SourceStamp>().notNull(),
    contentHash: text("content_hash").notNull(),
    observedAt: timestamp("observed_at", { withTimezone: true, mode: "date" }),
    fetchedAt: timestamp("fetched_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    freshness: freshnessState("freshness").notNull(),
    adapterVersion: text("adapter_version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("provider_records_upstream_unique").on(
      table.provider,
      table.dataset,
      table.upstreamRecordId,
    ),
    index("provider_records_dataset_observed_idx").on(
      table.dataset,
      table.observedAt,
    ),
    index("provider_records_freshness_fetched_idx").on(
      table.freshness,
      table.fetchedAt,
    ),
  ],
);

export const sourceSyncs = pgTable(
  "source_syncs",
  {
    provider: text("provider").notNull(),
    dataset: text("dataset").notNull(),
    state: syncState("state").default("idle").notNull(),
    leaseToken: uuid("lease_token"),
    leaseExpiresAt: timestamp("lease_expires_at", {
      withTimezone: true,
      mode: "date",
    }),
    lastStartedAt: timestamp("last_started_at", {
      withTimezone: true,
      mode: "date",
    }),
    lastSucceededAt: timestamp("last_succeeded_at", {
      withTimezone: true,
      mode: "date",
    }),
    lastFailedAt: timestamp("last_failed_at", {
      withTimezone: true,
      mode: "date",
    }),
    lastErrorCode: text("last_error_code"),
    lastErrorMessage: text("last_error_message"),
    lastErrorRetryable: integer("last_error_retryable"),
    lastErrorRetryAfterMs: integer("last_error_retry_after_ms"),
    lastDurationMs: integer("last_duration_ms"),
    lastAttemptCount: integer("last_attempt_count").default(0).notNull(),
    recordsReceived: integer("records_received").default(0).notNull(),
    recordsWritten: integer("records_written").default(0).notNull(),
    consecutiveFailures: integer("consecutive_failures").default(0).notNull(),
    nextEligibleRefreshAt: timestamp("next_eligible_refresh_at", {
      withTimezone: true,
      mode: "date",
    }),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.provider, table.dataset] }),
    index("source_syncs_lease_expiry_idx").on(table.leaseExpiresAt),
    check(
      "source_syncs_records_written_nonnegative",
      sql`${table.recordsWritten} >= 0`,
    ),
    check(
      "source_syncs_health_counters_nonnegative",
      sql`${table.lastAttemptCount} >= 0 AND ${table.recordsReceived} >= 0 AND ${table.consecutiveFailures} >= 0`,
    ),
  ],
);

export const vehicleProfiles = pgTable(
  "vehicle_profiles",
  {
    id: text("id").primaryKey(),
    provider: text("provider").notNull(),
    upstreamRecordId: text("upstream_record_id").notNull(),
    name: text("name").notNull(),
    family: text("family"),
    status: text("status").notNull(),
    profile: jsonb("profile").$type<VehicleProfile>().notNull(),
    sourceStamp: jsonb("source_stamp").$type<SourceStamp>().notNull(),
    contentHash: text("content_hash").notNull(),
    fetchedAt: timestamp("fetched_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("vehicle_profiles_upstream_unique").on(
      table.provider,
      table.upstreamRecordId,
    ),
    index("vehicle_profiles_name_idx").on(table.name),
  ],
);

export const missionDossiers = pgTable(
  "mission_dossiers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull(),
    contractVersion: text("contract_version").notNull(),
    calculationVersion: text("calculation_version").notNull(),
    classification: missionClassification("classification").notNull(),
    title: text("title").notNull(),
    snapshot: jsonb("snapshot").$type<MissionEvaluation>().notNull(),
    deletionTokenHash: text("deletion_token_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    uniqueIndex("mission_dossiers_public_id_unique").on(table.publicId),
    uniqueIndex("mission_dossiers_deletion_hash_unique").on(
      table.deletionTokenHash,
    ),
    index("mission_dossiers_created_idx").on(table.createdAt),
    index("mission_dossiers_expires_idx").on(table.expiresAt),
    check(
      "mission_dossiers_deletion_hash_length",
      sql`char_length(${table.deletionTokenHash}) = 64`,
    ),
  ],
);

export const creationRateEvents = pgTable(
  "creation_rate_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorHash: text("actor_hash").notNull(),
    scope: text("scope").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("creation_rate_events_actor_scope_created_idx").on(
      table.actorHash,
      table.scope,
      table.createdAt,
    ),
    index("creation_rate_events_created_idx").on(table.createdAt),
    check(
      "creation_rate_events_actor_hash_length",
      sql`char_length(${table.actorHash}) = 64`,
    ),
  ],
);

export const schema = {
  providerRecords,
  sourceSyncs,
  vehicleProfiles,
  missionDossiers,
  creationRateEvents,
};
