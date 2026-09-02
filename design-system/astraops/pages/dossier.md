# Mission Dossier override

Routes: `/missions/[id]`, `/dossiers/[id]`

## Intent

Create the portfolio-defining payoff: a credible, shareable mission artifact whose assumptions, evidence, and limitations can be audited.

## Cover and narrative

The first screen resembles an editorial technical brief, not a form result. It contains mission title, destination/classification, generated timestamp, immutable snapshot ID, concise objective, readiness label, and one original trajectory schematic. Primary action: **Explore evidence**. Download/share actions are secondary.

Sections: executive brief; trajectory and timing; vehicle/payload assumptions; environment context; calculations and uncertainty; evidence ledger; limitations; reproducibility metadata. Each calculated result links to the inputs and method version that produced it.

The evidence ledger is a real table on desktop and grouped list on mobile. It can filter by Observed, Authority computed, AstraOps estimate, and User assumption. Print/PDF mode removes navigation and interaction chrome, preserves source URLs/timestamps, uses white background and black text, and never relies on dark-mode colors.

Shared dossiers require no account and are immutable. If current live data differs from the snapshot, show both: “Snapshot used for this dossier” and “Current source state,” with timestamps. Never silently recalculate a shared artifact.

```text
┌──────────────────────────────────────────────────────────────────┐
│ ASTRAOPS / MISSION DOSSIER               SNAPSHOT AO-9F31C2      │
│ LUNAR POLAR RECONCEPT                     OPERATIONAL ESTIMATE   │
│ Objective statement              [Explore evidence] [Share] [PDF]│
├────────────────────────────────────┬─────────────────────────────┤
│      TRAJECTORY SCHEMATIC          │ EXECUTIVE BRIEF             │
│                                    │ timing · mass · confidence  │
├────────────────────────────────────┴─────────────────────────────┤
│ Evidence ledger · calculations · limitations · reproducibility   │
└──────────────────────────────────────────────────────────────────┘
```
