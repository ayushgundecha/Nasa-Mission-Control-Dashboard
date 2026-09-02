# Provider runtime contract

The provider runtime is the single entry point for external AstraOps datasets. Provider-specific adapters describe the request, validate the upstream payload with Zod, and normalize it into source-stamped records. The runtime owns transport reliability, leases, persistence, freshness, and safe health reporting.

## Read behavior

1. Serve `live` or `current` normalized data directly from Postgres.
2. For `delayed` or `stale` data, optionally return the snapshot immediately and schedule one stale-while-revalidate refresh through an injected platform-safe defer function.
3. Acquire the provider/dataset lease before contacting an upstream source. Concurrent visitors receive the same last-known-good snapshot and never multiply upstream requests.
4. Bound every request with a timeout. Retry only retryable failures, with bounded exponential backoff and jitter. Honor a short `Retry-After`; persist a longer hint as the next eligible refresh instead of holding a server request open.
5. Parse the full payload before normalization. Reject malformed payloads, duplicate normalized IDs, invalid provenance, and zero-record responses.
6. Commit validated normalized records and success health atomically. A failed or lost lease cannot mutate provider records.
7. On failure, retain the prior snapshot, persist only a sanitized error class, and apply bounded exponential refresh backoff. A provider retry hint may extend that window up to 24 hours.

## Freshness language

Each adapter owns four ordered thresholds. The runtime derives the public state from the age of the last successful fetch:

| State         | Meaning                                                                                                                |
| ------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `live`        | Inside a provider-specific near-live window. This label is optional and intentionally strict.                          |
| `current`     | Inside the normal target refresh cadence.                                                                              |
| `delayed`     | Beyond target cadence but still recent; refresh should run.                                                            |
| `stale`       | Retained last-known-good data; the UI must show a caution and timestamps.                                              |
| `unavailable` | No snapshot exists, its timestamp is invalid, or it is outside the safe display window. Retained rows are not deleted. |

The database keeps source-observed time, AstraOps fetch time, adapter version, content hash, and the source URL. UI code must not infer “real time” from a successful HTTP request.

## Safe health and logging

Structured events and `SourceHealth` expose provider, dataset, event, attempt count, duration, received/written record counts, last success/failure timestamps, consecutive failure count, next eligible refresh, and a public error code. They never contain request headers, provider response bodies, Zod issue payloads, raw exception messages, credentials, or URLs with secrets.

Supported public failure codes are `timeout`, `network`, `rate_limited`, `upstream_rejected`, `validation`, `empty_payload`, and `internal`.

## Modes

- `fixture` validates and normalizes a deterministic payload without network access. It exercises the same lease, storage, freshness, and health path as live data.
- `live` performs the adapter request through the bounded transport. Production live mode requires the server-only environment and database configuration validated at startup.

Process memory is never the production cache. Tests use an in-memory store only to make retry and failure transitions deterministic; integration tests run the production migration and database store against isolated PGlite.
