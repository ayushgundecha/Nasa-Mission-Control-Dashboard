import { DataStatePanel } from "@/components/data/data-state";
import { Panel } from "@/components/ui/panel";

export default function LaunchesLoading() {
  return (
    <div role="status" aria-label="Loading launch intelligence">
      <div className="h-12 w-2/3 animate-pulse rounded bg-[var(--color-surface-hover)]" />
      <Panel raised className="mt-8">
        <DataStatePanel
          state="loading"
          title="Loading global launch intelligence"
          detail="Reading the validated schedule and restoring URL filters."
        />
      </Panel>
      <Panel className="mt-5 min-h-72">
        <DataStatePanel
          state="loading"
          title="Preparing launch results"
          detail="No placeholder schedule values are shown."
        />
      </Panel>
    </div>
  );
}
