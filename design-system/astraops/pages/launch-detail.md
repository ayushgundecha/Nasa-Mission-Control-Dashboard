# Launch Detail override

Route: `/launches/[id]`

## Intent

Turn a launch record into an evidence-rich public dossier that is useful before, during, and after the event.

## Composition

The cover uses mission name, status, net launch time, location, provider/source badge, and one primary action: **Add to mission context** before launch or **Review outcome** afterward. Do not show an empty media hero when no licensed image exists; use an original trajectory schematic.

Desktop places a sticky event rail at left and the dossier at right. Mobile uses an anchored section index, not a horizontal timeline.

Sections: status briefing; schedule confidence and changes; vehicle/provider; pad and location; mission/payload; event timeline; related environment conditions; source history. Schedule changes use a textual before/after log. Scrubbed, delayed, and uncertain states must not be encoded by color alone.

The event timeline is a semantic ordered list first and an enhanced line second. Each item includes local and UTC time where meaningful. Source disagreements remain visible with provider names and fetched timestamps.

```text
┌──────────────────────────────────────────────────────────────────┐
│ Launches / Mission                         SOURCE · FRESH 12m ago │
│ MISSION NAME                                      T−02:14:08:31  │
│ Scheduled · 03 Sep 2026 14:20 UTC       [Add to mission context] │
├───────────────────┬──────────────────────────────────────────────┤
│ EVENT RAIL        │ MISSION BRIEF                                │
│ ✓ announced       │ vehicle · pad · payload                      │
│ ○ window opens    ├──────────────────────────────────────────────┤
│ ○ launch          │ SCHEDULE CHANGES                             │
│ ○ outcome         │ evidence-rich before / after log             │
└───────────────────┴──────────────────────────────────────────────┘
```
