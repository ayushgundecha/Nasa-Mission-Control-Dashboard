import Link from "next/link";

import { DataStatePanel } from "@/components/data/data-state";
import { Panel } from "@/components/ui/panel";

const states = [
  {
    state: "loading" as const,
    title: "Loading provider records",
    detail:
      "Reserving the final content shape while a bounded request completes.",
  },
  {
    state: "empty" as const,
    title: "No launches match these filters",
    detail:
      "The data source is healthy. Clear one or more filters to widen the result set.",
  },
  {
    state: "error" as const,
    title: "Provider refresh unavailable",
    detail:
      "The last request timed out. AstraOps keeps last-known-good values and offers a recoverable path.",
  },
  {
    state: "stale" as const,
    title: "Serving last-known-good values",
    detail:
      "The source is older than its target cadence. Exact observed and fetched timestamps remain visible.",
  },
];

export default function SystemStatesPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/"
        className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--color-signal)] hover:underline"
      >
        ← Command center
      </Link>
      <p className="data-label mt-10">System state review</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] md:text-5xl">
        No blank panels. No hidden failures.
      </h1>
      <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--color-text-secondary)]">
        These fixture-backed states define what every data surface must
        communicate while loading, filtering, recovering, or serving stale
        information.
      </p>
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {states.map((state) => (
          <Panel key={state.state} className="min-h-56">
            <p className="data-label mb-6">{state.state}</p>
            <DataStatePanel {...state} />
          </Panel>
        ))}
      </div>
    </div>
  );
}
