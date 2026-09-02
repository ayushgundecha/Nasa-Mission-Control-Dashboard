# AstraOps persistence operations

## Production shape

Neon Postgres is the durable source of truth for normalized provider records, refresh state, vehicle profiles, and immutable mission dossiers. Vercel Functions connect through the Neon HTTP driver, which avoids holding long-lived TCP connections across ephemeral invocations. Fixture mode never opens a production connection.

Create separate Neon branches/credentials for Preview and Production. Set `ASTRAOPS_DATA_MODE=live` and `DATABASE_URL` only in server-side environment configuration. `DATABASE_URL` must never use a `NEXT_PUBLIC_` prefix or appear in browser bundles, logs, screenshots, or committed files.

The free tier can suspend or cold-start. Application reads therefore tolerate connection latency, keep provider refreshes bounded and idempotent, and surface last-known-good freshness instead of inventing live status. Connection or quota failures map to typed public errors; they do not delete cached records.

## Migrations

Migrations are ordered SQL under `drizzle/` and applied through Drizzle's runtime migrator:

```bash
ASTRAOPS_DATA_MODE=live DATABASE_URL='postgresql://…' npm run db:migrate
```

Run migrations explicitly against Preview before promoting application code. During the release observation window, migrations are additive. Never edit a migration already applied to a shared environment; add the next numbered file and journal entry. The initial migration applies from an empty database and is skipped safely after Drizzle records its hash/time.

Drizzle Kit is intentionally not a dependency: its current stable release pulls a development-only esbuild chain with a known moderate advisory. Schema changes are reviewed as TypeScript schema plus explicit SQL migration, and database tests catch drift.

## Transaction and idempotency rules

- Normalize and validate a complete provider response before opening a write transaction.
- Upsert one dataset batch transactionally: normalized records and the successful `source_syncs` completion belong to the same logical operation.
- Use `(provider, dataset, upstream_record_id)` as the provider idempotency key and a SHA-256 content hash to avoid meaningless writes.
- Acquire refresh ownership with `acquireRefreshLease`; its single `INSERT … ON CONFLICT … WHERE` statement prevents concurrent owners from replacing an unexpired lease.
- Complete or fail a lease only when the caller still owns the same UUID token.
- Mission dossier inserts are one transaction containing the immutable snapshot and its deletion-token hash. Never store the plaintext deletion token.
- Creation-rate records store only a salted/peppered actor hash and scope; never persist a raw IP address.

## Retention and deletion

- Provider last-known-good records remain until replaced or a source-specific retention issue defines archival; refresh failure never purges them.
- Sync errors retain only sanitized code/message metadata and are overwritten by later state; operational logs have separate platform retention.
- Mission dossiers remain until their owner presents the deletion token or a future explicit expiry policy applies. The database trigger rejects every dossier update; changed inputs create a new snapshot.
- Deleting a dossier is an explicit authenticated-by-token transaction. The immutable trigger blocks updates, not authorized deletion.
- Creation-rate events are operational abuse data and should be deleted after 24 hours by a bounded reconciliation query.

## Local isolation and fixtures

Database tests create a fresh in-memory PGlite instance, run the production PostgreSQL migration, seed deterministic normalized fixtures twice, and close the instance after the suite. No local test may read a developer or production `DATABASE_URL`. Run:

```bash
npm run db:test
```

The fixture seed is an idempotent upsert and carries the same validated source/freshness contract used by later provider adapters.
