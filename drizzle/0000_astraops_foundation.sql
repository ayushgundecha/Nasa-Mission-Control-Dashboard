CREATE TYPE "public"."freshness_state" AS ENUM ('live', 'fresh', 'stale', 'unavailable');
--> statement-breakpoint
CREATE TYPE "public"."sync_state" AS ENUM ('idle', 'refreshing', 'succeeded', 'failed');
--> statement-breakpoint
CREATE TYPE "public"."mission_classification" AS ENUM ('operational_estimate', 'research_concept_not_flight_ready');
--> statement-breakpoint
CREATE TABLE "provider_records" (
  "id" text PRIMARY KEY NOT NULL,
  "provider" text NOT NULL,
  "dataset" text NOT NULL,
  "upstream_record_id" text NOT NULL,
  "normalized_record" jsonb NOT NULL,
  "source_stamp" jsonb NOT NULL,
  "content_hash" text NOT NULL,
  "observed_at" timestamp with time zone,
  "fetched_at" timestamp with time zone NOT NULL,
  "freshness" "freshness_state" NOT NULL,
  "adapter_version" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "provider_records_upstream_unique" ON "provider_records" USING btree ("provider", "dataset", "upstream_record_id");
--> statement-breakpoint
CREATE INDEX "provider_records_dataset_observed_idx" ON "provider_records" USING btree ("dataset", "observed_at");
--> statement-breakpoint
CREATE INDEX "provider_records_freshness_fetched_idx" ON "provider_records" USING btree ("freshness", "fetched_at");
--> statement-breakpoint
CREATE TABLE "source_syncs" (
  "provider" text NOT NULL,
  "dataset" text NOT NULL,
  "state" "sync_state" DEFAULT 'idle' NOT NULL,
  "lease_token" uuid,
  "lease_expires_at" timestamp with time zone,
  "last_started_at" timestamp with time zone,
  "last_succeeded_at" timestamp with time zone,
  "last_failed_at" timestamp with time zone,
  "last_error_code" text,
  "last_error_message" text,
  "records_written" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "source_syncs_provider_dataset_pk" PRIMARY KEY ("provider", "dataset"),
  CONSTRAINT "source_syncs_records_written_nonnegative" CHECK ("records_written" >= 0)
);
--> statement-breakpoint
CREATE INDEX "source_syncs_lease_expiry_idx" ON "source_syncs" USING btree ("lease_expires_at");
--> statement-breakpoint
CREATE TABLE "vehicle_profiles" (
  "id" text PRIMARY KEY NOT NULL,
  "provider" text NOT NULL,
  "upstream_record_id" text NOT NULL,
  "name" text NOT NULL,
  "family" text,
  "status" text NOT NULL,
  "profile" jsonb NOT NULL,
  "source_stamp" jsonb NOT NULL,
  "content_hash" text NOT NULL,
  "fetched_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_profiles_upstream_unique" ON "vehicle_profiles" USING btree ("provider", "upstream_record_id");
--> statement-breakpoint
CREATE INDEX "vehicle_profiles_name_idx" ON "vehicle_profiles" USING btree ("name");
--> statement-breakpoint
CREATE TABLE "mission_dossiers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "public_id" text NOT NULL,
  "contract_version" text NOT NULL,
  "calculation_version" text NOT NULL,
  "classification" "mission_classification" NOT NULL,
  "title" text NOT NULL,
  "snapshot" jsonb NOT NULL,
  "deletion_token_hash" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "expires_at" timestamp with time zone,
  CONSTRAINT "mission_dossiers_deletion_hash_length" CHECK (char_length("deletion_token_hash") = 64)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "mission_dossiers_public_id_unique" ON "mission_dossiers" USING btree ("public_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "mission_dossiers_deletion_hash_unique" ON "mission_dossiers" USING btree ("deletion_token_hash");
--> statement-breakpoint
CREATE INDEX "mission_dossiers_created_idx" ON "mission_dossiers" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX "mission_dossiers_expires_idx" ON "mission_dossiers" USING btree ("expires_at");
--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_mission_dossier_update()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'mission dossiers are immutable; create a new snapshot instead';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "mission_dossiers_immutable"
BEFORE UPDATE ON "mission_dossiers"
FOR EACH ROW EXECUTE FUNCTION prevent_mission_dossier_update();
--> statement-breakpoint
CREATE TABLE "creation_rate_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "actor_hash" text NOT NULL,
  "scope" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "creation_rate_events_actor_hash_length" CHECK (char_length("actor_hash") = 64)
);
--> statement-breakpoint
CREATE INDEX "creation_rate_events_actor_scope_created_idx" ON "creation_rate_events" USING btree ("actor_hash", "scope", "created_at");
--> statement-breakpoint
CREATE INDEX "creation_rate_events_created_idx" ON "creation_rate_events" USING btree ("created_at");
