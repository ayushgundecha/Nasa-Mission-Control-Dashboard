import { RocketLaunch } from "@phosphor-icons/react/dist/ssr";

import { PhasePreview } from "@/components/shell/phase-preview";

export default function LaunchesPage() {
  return (
    <PhasePreview
      eyebrow="Global launch intelligence"
      title="Every launch becomes an auditable event, not another card in a feed."
      description="Searchable global schedules, change history, evidence-rich mission details, and clear source freshness arrive in the next approved phase."
      phase="Phase 2"
      icon={RocketLaunch}
    />
  );
}
