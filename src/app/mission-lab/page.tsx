import { Flask } from "@phosphor-icons/react/dist/ssr";

import { PhasePreview } from "@/components/shell/phase-preview";

export default function MissionLabPage() {
  return (
    <PhasePreview
      eyebrow="Explainable mission planning"
      title="Build a mission whose assumptions can survive a second look."
      description="A guided Earth, Moon, and Mars planner—with permanently labeled exoplanet research concepts—will turn evidence, assumptions, estimates, and limitations into a reproducible dossier."
      phase="Phase 4"
      icon={Flask}
    />
  );
}
