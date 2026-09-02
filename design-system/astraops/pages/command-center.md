# Command Center override

Route: `/`

## Intent

Deliver the immediate “wow” moment while answering what is happening across the space environment now. The page is a briefing, not a wall of equal KPI cards.

## First viewport

Desktop uses an asymmetric 8/4 split. The left signature panel is an orbital Earth schematic with launch and environment markers; the right is “Now in orbit,” a textual briefing with next launch countdown, current space-weather state, closest monitored approach, and freshness summary. Mobile renders the briefing first, followed by a 2D schematic; 3D is opt-in.

```text
Desktop
┌──────── nav ────────┬──────────────────────────────────────────────┐
│ AstraOps            │ COMMAND / 02 SEP 2026 · DATA HEALTH NOMINAL │
│ Command             ├──────────────────────────────┬───────────────┤
│ Launches            │                              │ NOW IN ORBIT  │
│ Environment         │       ORBITAL EARTH          │ next launch   │
│ Mission Lab         │       signature view         │ weather       │
│ Methodology         │                              │ approach      │
│                     ├──────────────────────────────┴───────────────┤
│ sources 6/7 current │ Launch stream · environment briefing         │
└─────────────────────┴──────────────────────────────────────────────┘
```

## Sections

1. Live briefing and spatial view.
2. Launch stream: next three, then “Explore all launches.”
3. Environment briefing: NOAA conditions, notable DONKI event, curated orbit objects, nearest approach.
4. “Plan against reality” Mission Lab invitation using one current launch/window as context.
5. Methodology and provider attribution strip.

Use one primary CTA: **Open mission briefing**. Countdown numbers never animate continuously for reduced-motion users. If providers are stale, the data-health label becomes the dominant message without hiding last-known-good facts.
