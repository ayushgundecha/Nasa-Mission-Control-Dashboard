import { GlobeHemisphereWest } from "@phosphor-icons/react/dist/ssr";

import { PhasePreview } from "@/components/shell/phase-preview";

export default function EnvironmentPage() {
  return (
    <PhasePreview
      eyebrow="Near-Earth environment"
      title="Read the space around a mission as one connected operating picture."
      description="NOAA conditions, DONKI events, curated orbital objects, and JPL approaches will share one honest interface without hiding their different cadences or certainty."
      phase="Phase 3"
      icon={GlobeHemisphereWest}
    />
  );
}
