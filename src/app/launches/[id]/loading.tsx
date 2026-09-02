import { DataStatePanel } from "@/components/data/data-state";
import { Panel } from "@/components/ui/panel";

export default function LaunchDossierLoading() {
  return (
    <div role="status" aria-label="Loading launch dossier">
      <div className="h-11 w-48 animate-pulse rounded bg-[var(--color-line-subtle)]" />
      <div className="mt-5 h-16 w-3/4 animate-pulse rounded bg-[var(--color-surface-hover)]" />
      <Panel raised className="mt-8 min-h-64">
        <DataStatePanel
          state="loading"
          title="Loading mission dossier"
          detail="Reading the source-stamped launch record and its schedule evidence."
        />
      </Panel>
    </div>
  );
}
