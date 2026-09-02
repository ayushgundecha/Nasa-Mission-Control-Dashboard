import type { GeomagneticInterpretation } from "./types";

const THRESHOLD_SOURCE = "https://www.swpc.noaa.gov/noaa-scales-explanation";

export function interpretKp(kp: number | null): GeomagneticInterpretation {
  if (kp === null || !Number.isFinite(kp)) {
    return {
      band: "unknown",
      noaaScale: null,
      label: "Kp unavailable",
      operationalContext:
        "No geomagnetic interpretation is made without a valid Kp value.",
      thresholdSourceUrl: THRESHOLD_SOURCE,
    };
  }

  if (kp < 4) {
    return {
      band: "quiet",
      noaaScale: "G0",
      label: "Below geomagnetic storm level",
      operationalContext:
        "No NOAA geomagnetic storm level is indicated by this Kp value.",
      thresholdSourceUrl: THRESHOLD_SOURCE,
    };
  }
  if (kp < 5) {
    return {
      band: "elevated",
      noaaScale: "G0",
      label: "Elevated, below G1",
      operationalContext:
        "Activity is elevated but remains below NOAA's G1 storm threshold.",
      thresholdSourceUrl: THRESHOLD_SOURCE,
    };
  }

  const level = Math.min(5, Math.max(1, Math.floor(kp) - 4)) as
    1 | 2 | 3 | 4 | 5;
  const bands = ["minor", "moderate", "strong", "severe", "extreme"] as const;
  const labels = ["Minor", "Moderate", "Strong", "Severe", "Extreme"] as const;
  return {
    band: bands[level - 1]!,
    noaaScale: `G${level}`,
    label: `${labels[level - 1]!} geomagnetic storm level`,
    operationalContext:
      level === 1
        ? "NOAA notes that minor satellite-operation impacts are possible at G1."
        : "NOAA lists possible effects on spacecraft, navigation, radio, or power systems at this level; actual effects vary by system, location, and duration.",
    thresholdSourceUrl: THRESHOLD_SOURCE,
  };
}
