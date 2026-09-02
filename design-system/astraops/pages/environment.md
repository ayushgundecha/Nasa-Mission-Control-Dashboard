# Environment and objects override

Routes: `/environment`, `/objects/[id]`, `/approaches/[id]`

## Intent

Make a complex multi-source environment understandable without pretending every feed shares the same cadence or certainty.

## Layout

Use three stable subviews—Space weather, Orbit watch, Near-Earth approaches—represented by links/tabs that update the URL. On desktop, filters occupy a 280px side panel; on mobile they use a sheet and active filter chips wrap below the header.

The spatial view is paired with a synchronized result list. Selecting an object highlights the list row and visualization marker but never steals focus. A 2D mode is the default on mobile and fallback everywhere. Each object detail begins with identity, current data age, orbit/approach facts, and why it is curated.

Charts use direct labels and a visible table. Space-weather severity uses text such as “Minor geomagnetic activity,” not unexplained scales alone. NEO distance is shown in kilometers and lunar distances with an explanation; no alarmist collision language. Empty filters say which constraint removed all results and offer Clear filters.

```text
┌──────────────────────────────────────────────────────────────────┐
│ ENVIRONMENT     [Weather] [Orbit watch] [Near-Earth approaches] │
├──────────────┬─────────────────────────────┬─────────────────────┤
│ FILTERS      │ 2D / 3D       RESET VIEW   │ SYNCHRONIZED LIST   │
│ source       │                             │ selected object     │
│ freshness    │       SPATIAL VIEW          │ current facts       │
│ object type  │                             │ source · fetched    │
│ [Clear]      │                             │ result rows…        │
├──────────────┴─────────────────────────────┴─────────────────────┤
│ Accessible data table · insight summary · methodology            │
└──────────────────────────────────────────────────────────────────┘
```
