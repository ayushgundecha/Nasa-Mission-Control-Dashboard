# Mission Lab override

Route: `/mission-lab`

## Intent

Guide a curious user from a goal to an explainable, honest mission estimate without presenting a professional flight plan.

## Flow

Five steps: Goal → Destination → Vehicle assumptions → Timing/context → Review. Desktop uses a 7/5 workspace split with the form at left and a live evidence ledger at right. Mobile shows one step at a time with a persistent but non-obscuring summary disclosure.

```text
┌──────────────────────────────────────────────────────────────────┐
│ MISSION LAB        Step 2 of 5                       Saved locally │
├────────────────────────────────────┬─────────────────────────────┤
│ Where are you going?               │ EVIDENCE LEDGER             │
│ [Earth orbit] [Moon] [Mars]        │ Observed: launch context    │
│ [Exoplanet research concept]       │ Assumed: payload mass       │
│                                    │ Computed: delta-v estimate  │
│ Back                    Continue → │ Confidence / limitations    │
└────────────────────────────────────┴─────────────────────────────┘
```

Every scientific value shows unit, evidence class, method/source, and editable assumption where allowed. Advanced inputs are collapsed by default but remain deep-linkable. Changing an assumption updates affected outputs and briefly identifies what changed; correctness does not depend on animation.

Earth/Moon/Mars outputs are labeled **Operational estimate — educational planning only**. Selecting an exoplanet permanently changes the header, review step, shared artifact, and dossier to **Research concept — not flight ready** in concept purple plus text/icon. The user cannot dismiss this classification.

The sole primary action is Continue until Review, then **Generate mission dossier**. Invalid steps retain user input, focus a useful error summary, and link to each field. Destructive reset requires confirmation; drafts autosave locally without an account.
