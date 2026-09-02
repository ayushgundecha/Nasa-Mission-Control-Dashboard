# ADR 0001: AstraOps platform architecture and legacy migration

- Status: Accepted
- Date: 2026-09-02
- Owners: AstraOps maintainers
- Decision scope: Phase 1 foundation and all later product phases

## Context

The repository currently contains three loosely coupled npm projects: a React 17/Create React App client, an Express/Mongoose API, and a root script package that installs and runs both. The production build copies generated client assets into `server/public`, and the server deployment is configured independently through `server/vercel.json`. Runtime data depends on MongoDB and a SpaceX community API whose repository is now archived. The existing records are tutorial/demo data and do not have the provenance required by AstraOps.

AstraOps needs server-rendered, shareable operational views; strict source and freshness semantics; normalized multi-provider data; reproducible mission dossiers; and a deployment model that remains practical on free tiers.

## Decision

### Platform and repository boundary

AstraOps will become one root application using:

- Next.js App Router with TypeScript in strict mode;
- React Server Components by default, with Client Components only at interactive leaves;
- Tailwind CSS and locally owned, accessible component primitives following shadcn composition patterns;
- Zod at every untrusted boundary and for shared runtime contracts;
- Neon Postgres with Drizzle ORM and versioned SQL migrations;
- Vitest and Testing Library for unit/component coverage, plus Playwright for critical journeys;
- Vercel Hobby as the initial web and scheduled-job host.

The root `package.json` and root `package-lock.json` become the only active package-manager boundary. npm remains the package manager because the repository already uses npm lockfiles and the selected stack does not require a workspace tool. Application code lives in root `src/`; database code lives in root `src/db/`; migrations live in root `drizzle/`; public assets live in root `public/`; tests live beside their units or under root `tests/` for cross-cutting journeys.

The existing `client/` and `server/` trees remain read-only migration references until the replacement reaches the Phase 5 parity and release gate. They are not npm workspaces and their lockfiles do not participate in new installs. Generated files under `server/public` are never imported into the new build. Their eventual deletion is a separate, reviewable issue after rollback conditions are satisfied.

### Runtime ownership

Server Components own initial reads, SEO/share metadata, and non-interactive composition. Route Handlers own public API responses, share endpoints, provider refresh entry points, health/readiness responses, and downloadable dossier artifacts. Server Actions may own same-origin form mutations where progressive enhancement is useful; they do not replace externally consumable APIs.

Client Components own only browser-specific interaction: filters, optimistic form feedback, accessible dialogs, map/visualization controls, and optional motion or audio. Provider credentials, refresh orchestration, persistence, and scientific calculations never run in the browser. Client Components receive minimal serializable view models rather than database rows or provider payloads.

Shared domain contracts distinguish four evidence classes in both types and UI:

1. `provider_observed` — values reported directly by an upstream provider;
2. `authoritative_computed` — ephemerides or derived values supplied by an authoritative scientific service such as JPL;
3. `astraops_computed` — reproducible estimates calculated by AstraOps with method and version recorded;
4. `user_assumed` — explicit scenario inputs that are never presented as observed facts.

### Data and provider boundary

Each external source is implemented behind a server-only adapter with the same responsibilities: request construction, timeout and retry policy, response validation, normalization, provenance capture, and stable provider error mapping. Raw upstream payloads are not exposed to UI code.

Normalized records store provider, provider record ID, source URL when available, observation time, fetch time, schema/adapter version, and freshness state. Mission snapshots reference the exact normalized inputs and calculation version used to produce them. This makes a shared dossier reproducible even after live data changes.

The initial source set is Launch Library 2, NOAA SWPC, NASA DONKI, CelesTrak OMM/GP, JPL Close-Approach Data, JPL Horizons, and the NASA Exoplanet Archive. Source-specific licensing, attribution, limits, and failure behavior must be documented beside each adapter before it can be enabled.

### Cache, refresh, and failure ownership

Postgres is the durable last-known-good cache; process memory is never the source of truth because serverless instances are ephemeral. A refresh lease table prevents duplicate refreshes. Successful refreshes replace or upsert normalized records transactionally and retain audit metadata. Failed refreshes preserve the last-known-good dataset and record a sanitized failure event.

Pages serve stored data immediately and expose source, observed/fetched timestamps, and a freshness state of `live`, `fresh`, `stale`, or `unavailable`. User requests may trigger a non-blocking refresh when data exceeds its target age. A secured daily Vercel Cron reconciliation repairs missed refreshes. Provider-specific target ages are configuration, with the approved starting values: launches 60 minutes, NOAA 5 minutes, DONKI 30 minutes, CelesTrak 2 hours, JPL close approaches 6 hours, exoplanets 24 hours, and Horizons on demand with a 24-hour cache.

Retries are bounded, use exponential backoff with jitter, and apply only to retryable failures. Each outbound request has a timeout and a descriptive user agent. Rate-limit responses are respected. Public endpoints are cached only where their response is user-independent; mutation, share-creation, and health responses are not cached as static content.

### Persistence and environment management

Neon is the production database. Local development may use a separate Neon branch or a Postgres-compatible local database; there is no silent in-memory fallback. Drizzle migrations are the sole schema-change mechanism and run explicitly before code that requires them is promoted.

Secrets are server-only environment variables, validated once at server startup/use through a typed environment module. Browser-safe variables require a deliberate `NEXT_PUBLIC_` prefix and must contain no credentials. `.env.example` documents names and intent without real values. Vercel Preview and Production use separate database branches or credentials. Logs and API errors must not include secrets, complete upstream payloads, or private connection strings.

### Hosting and operational constraints

Vercel hosts the Next.js application and Route Handlers. The design must tolerate cold starts, short-lived compute, concurrent invocations, and Hobby-plan scheduling constraints. Long refreshes are split by provider, bounded, and idempotent. No feature relies on local disk persistence, sticky sessions, background processes continuing after a response, or an in-memory queue.

Free tiers are the starting constraint, not a promise of unlimited capacity. Refresh frequency degrades gracefully when a provider or hosting quota is reached, while the UI continues to show last-known-good data and honest freshness. Any future paid service must be introduced through a separate ADR.

### Data migration boundary

No MongoDB launch or planet record is migrated. The current database contains tutorial/demo state and cannot satisfy AstraOps provenance requirements. Production data is rehydrated from approved providers through the new adapters. Curated object allowlists and product-owned reference data are introduced as reviewed seed/configuration artifacts with their own source notes.

User-owned untracked files are outside the migration and must remain untouched. Existing audio and image assets may be reused only after provenance, licensing, size, accessibility, and design relevance are reviewed; copying the compiled CRA output is prohibited.

The SpaceX API integration is not carried forward as the canonical launch source. Launch Library 2 provides the global launch feed; provider-specific links or details may be added later through an adapter if their availability and terms are revalidated.

## Migration sequence

1. Establish this ADR, shared contracts, design system, quality gates, and a root Next.js shell while preserving the legacy folders.
2. Add the Postgres schema and provider adapters, then ingest clean normalized datasets into a fresh environment.
3. Build product surfaces against the new contracts and persistence layer; never couple them to legacy Mongo models or raw provider responses.
4. Deploy the new application as a Vercel Preview and validate responsive, accessibility, performance, failure, and end-to-end acceptance criteria.
5. Promote the new deployment only after the final review gate. Keep the last known-good legacy Vercel deployment available during the observation window.
6. Retire `client/`, `server/`, MongoDB credentials, and legacy deployment configuration in a separate reviewed change after the observation window and data/export checks pass.

## Rollback strategy

Before production promotion, rollback means discarding the preview deployment; the existing production deployment and MongoDB remain unchanged. After promotion, rollback means restoring the previous Vercel production deployment or alias. The new Postgres schema uses additive migrations during the observation window, so the previous AstraOps deployment can continue to read its schema.

Provider ingestion and mission snapshots are idempotent and versioned. A failed application release does not require deleting provider data. Destructive database migrations, legacy credential removal, legacy folder deletion, and domain cutover cleanup are forbidden until the observation window closes and receive their own explicit review. If rollback occurs, scheduled refreshes for the faulty release are disabled while stored data is retained for diagnosis.

## Consequences and tradeoffs

### Benefits

- One typed application removes duplicated request contracts and enables server-rendered share pages.
- Relational provenance and immutable snapshots support explainability and reproducibility.
- Durable last-known-good storage makes provider outages visible but non-catastrophic.
- A staged parallel migration preserves a simple deployment rollback throughout the rebuild.

### Costs and risks

- Running legacy and new structures in parallel temporarily increases repository size and cognitive load.
- Neon and Vercel introduce managed-service constraints and require disciplined connection pooling, idempotency, and quota monitoring.
- Multi-provider normalization is more work than displaying raw API payloads.
- A custom cinematic interface requires stronger accessibility and performance validation than a conventional dashboard.

### Rejected alternatives

- **Incremental CRA/Express/Mongo modernization:** lowest initial change, but retains split contracts, dated build plumbing, brittle startup coupling, and weak share metadata.
- **Vite SPA plus TypeScript Express:** modernizes tooling but preserves two deployments and makes server-rendered public dossiers harder.
- **Keep MongoDB:** viable for documents, but less natural for normalized source relationships, refresh leases, auditable provenance, and immutable relational snapshots.
- **Import existing demo records:** faster initial population, but their missing provenance would undermine the central data-honesty promise.
- **Depend on process-memory caching or continuous workers:** incompatible with reliable serverless execution and last-known-good guarantees.

## Follow-up constraints

All foundation and feature work must preserve this decision unless a superseding ADR is accepted. In particular, implementation may not expose provider payloads directly, invent real-time guarantees, hide stale data, label estimates as observations, or delete the legacy rollback path before the final release gate.
