# AstraOps public read API

Version `1.1.0` exposes normalized AstraOps product contracts. Routes read the durable cache; they do not proxy raw provider payloads or wait for an upstream refresh. Every success includes a UTC generation time, partial-data flag, human-readable warnings, and per-dataset freshness metadata.

## Endpoints

| Route                    | Purpose                                                                                 | Shared-cache policy                         |
| ------------------------ | --------------------------------------------------------------------------------------- | ------------------------------------------- |
| `GET /api/overview`      | Five nearest launch records, total launch count, and the current space-weather briefing | 5 minutes, 10-minute stale-while-revalidate |
| `GET /api/launches`      | Searchable, filterable, cursor-paginated launch collection                              | 5 minutes, 10-minute stale-while-revalidate |
| `GET /api/launches/:id`  | Curated launch dossier by AstraOps ID or slug                                           | 5 minutes, 10-minute stale-while-revalidate |
| `GET /api/space-weather` | NOAA conditions/forecast plus optional NASA DONKI event context                         | 5 minutes, 10-minute stale-while-revalidate |
| `GET /api/health`        | Sanitized source freshness and refresh health                                           | 1 minute, 2-minute stale-while-revalidate   |

Errors always use `Cache-Control: no-store` and this shape:

```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "The request parameters are invalid.",
    "recovery": "Correct the fields listed in fieldErrors and try again.",
    "correlationId": "00000000-0000-4000-8000-000000000000",
    "fieldErrors": { "limit": ["Too big: expected number to be <=100"] }
  }
}
```

Correlation IDs vary per error. Environment values, request headers, connection strings, credentials, stack traces, provider bodies, and raw validation payloads are never returned.

## Launch collection query

`GET /api/launches` accepts only these parameters:

| Parameter   | Contract                                                                                                   |
| ----------- | ---------------------------------------------------------------------------------------------------------- |
| `query`     | Case-insensitive text search across launch, mission, agency, vehicle, and location; maximum 160 characters |
| `status`    | Comma-separated canonical statuses such as `go,scheduled`; maximum 10                                      |
| `provider`  | Case-insensitive launch-service-provider name filter; maximum 120 characters                               |
| `sort`      | `window` (default), `name`, or `status`                                                                    |
| `direction` | `asc` (default) or `desc`                                                                                  |
| `limit`     | Integer from 1 through 100; default 25                                                                     |
| `cursor`    | Opaque cursor returned by the previous response                                                            |

Unknown fields, invalid enum values, expired/malformed cursors, and out-of-range limits return `400 BAD_REQUEST` with field-level recovery details. An empty valid filter returns `200` with an empty `data` array. A missing detail returns `404 NOT_FOUND`.

Example:

```http
GET /api/launches?query=electron&status=go,scheduled&sort=window&direction=asc&limit=10
```

```json
{
  "contractVersion": "1.1.0",
  "generatedAt": "2026-09-02T08:00:00.000Z",
  "partial": false,
  "warnings": [],
  "sources": [
    {
      "provider": "launch_library_2",
      "dataset": "launches_upcoming",
      "freshness": "live",
      "fetchedAt": "2026-09-02T08:00:00.000Z"
    }
  ],
  "data": [],
  "page": {
    "nextCursor": null,
    "hasNextPage": false,
    "returned": 0,
    "total": 0
  }
}
```

The example is abbreviated only in the number of source records. Runtime responses are checked against the same strict Zod schemas used by route tests. Launch detail exposes selected agency, vehicle, mission, media, and schedule-change evidence, but omits the provider adapter's internal `upstream` object.

## Space-weather semantics

`currentKp` contains only observed or estimated NOAA data. Predicted values appear under `forecastKp`. Solar-wind units are explicit in field names, and missing observations remain `null`. DONKI entries are marked `analyst_event`; they provide recent context without claiming causality. The response can be partial and still contain usable NOAA data when DONKI is unavailable.

## Health semantics

Health exposes the source/dataset key, sync state, computed cache freshness, last success/failure times, bounded counters, retry eligibility, and a sanitized error class. Freshness is computed from the cached fetch time when the API request is served; a previous database label is not trusted as current.
