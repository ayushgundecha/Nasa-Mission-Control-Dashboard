ALTER TYPE "public"."freshness_state" RENAME VALUE 'fresh' TO 'current';
--> statement-breakpoint
ALTER TYPE "public"."freshness_state" ADD VALUE IF NOT EXISTS 'delayed' AFTER 'current';
--> statement-breakpoint
ALTER TABLE "source_syncs" ADD COLUMN "last_error_retryable" integer;
--> statement-breakpoint
ALTER TABLE "source_syncs" ADD COLUMN "last_error_retry_after_ms" integer;
--> statement-breakpoint
ALTER TABLE "source_syncs" ADD COLUMN "last_duration_ms" integer;
--> statement-breakpoint
ALTER TABLE "source_syncs" ADD COLUMN "last_attempt_count" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "source_syncs" ADD COLUMN "records_received" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "source_syncs" ADD COLUMN "consecutive_failures" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "source_syncs" ADD COLUMN "next_eligible_refresh_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "source_syncs" ADD CONSTRAINT "source_syncs_health_counters_nonnegative" CHECK ("last_attempt_count" >= 0 AND "records_received" >= 0 AND "consecutive_failures" >= 0);
