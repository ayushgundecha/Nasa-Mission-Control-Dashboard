# Launch Library 2 integration

AstraOps uses the supported Launch Library 2 v2.3.0 API as its global launch source. The provider is operated by The Space Devs, not NASA, SpaceX, or AstraOps. Its production service allows 15 unauthenticated calls per hour and explicitly recommends server-side caching; its development host is unmetered but intentionally stale and limited.

Primary references:

- [LL2 v2.3 documentation and rate limits](https://ll.thespacedevs.com/)
- [The Space Dev getting-started tutorial](https://github.com/TheSpaceDevs/Tutorials/blob/main/tutorials/getting_started_LL2/README.md)
- [LL2 v2.3 release and schema notes](https://github.com/TheSpaceDevs/Tutorials/blob/main/announcements/LL_230_changelog.md)

## Retrieval policy

- Production uses `ll.thespacedevs.com`; local live development uses `lldev.thespacedevs.com`.
- Upcoming and previous launches are separate cached datasets. Each request asks for the maximum 100 detailed records and sorts by NET in the direction appropriate to the feed.
- Each dataset has a one-hour current window and its own atomic refresh lease. Normal page traffic reads Postgres; it does not call LL2 from the browser.
- The two routine feed refreshes consume at most two of the 15 unauthenticated hourly calls. Remaining budget is reserved for repair/backfill work rather than speculative client requests.
- The validated page retains upstream count and next/previous links at the provider boundary. AstraOps public pagination is database-backed and does not expose or proxy the LL2 cursor.

The initial operational history is the most recent 100 launches. A later scheduled backfill may walk older pages within the remaining hourly budget; UI copy must not claim the full 1957-present catalog until that backfill is implemented and health-checked.

## Normalization

The detailed response supplies the launch service provider, launcher configuration and manufacturer, mission and orbit, pad and location, images, official information URLs, webcast URLs, status, NET precision, updates, and last-updated timestamp. AstraOps keeps LL2 IDs and source URLs on every normalized entity.

NET precision is never discarded. Second, minute, hour, and day precision map directly. Morning, afternoon, week, month, quarter, half-year, year, fiscal-year, and decade values are represented as windows. When LL2 supplies a non-zero window it is preserved; otherwise AstraOps expands the calendar period rather than presenting LL2's placeholder timestamp as an exact launch time.

Official LL2 status IDs map to scheduled/TBD, go, hold, in-flight or payload-deployed, success, partial failure, and failure. LL2 does not currently publish separate scrubbed or cancelled status IDs. AstraOps therefore preserves schedule-change updates as provider-attributed evidence and only derives the current `scrubbed` or `cancelled` state when the newest LL2 update explicitly says so and the provider status remains scheduled/TBD. A later Go, Hold, or terminal provider status always wins.

Image URL, thumbnail, credit, license name, and license link are stored together. A missing credit or unknown license remains visibly unknown; AstraOps never invents attribution.

## Contract evidence

Deterministic fixtures cover minute-precision Go, scrubbed, cancelled, and year-window missions. Mapper tests cover nested agency/vehicle/mission/pad fields, unit conversion, media attribution, pagination metadata, schema drift, and stable upstream identity. A read-only live-contract check on 2 September 2026 validated and normalized current development records for Rocket Lab, SpaceX, and ISRO against the same schema.

The archived `r-spacex` tutorial remains only under the excluded legacy server tree. It is not a root dependency, runtime source, or CI path for AstraOps.
