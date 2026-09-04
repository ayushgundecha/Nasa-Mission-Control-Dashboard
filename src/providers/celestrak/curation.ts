import type { CelestrakCuration } from "./types";

/**
 * Small, purpose-specific GP queries. We deliberately do not query Active or
 * Starlink: CelesTrak treats those large, overlapping groups especially
 * strictly under its one-download-per-update policy.
 */
export const celestrakCuration: readonly CelestrakCuration[] = [
  {
    category: "stations",
    group: "stations",
    maxObjects: 16,
    reason: "Human spaceflight and research stations selected for orbit watch.",
  },
  {
    category: "science_weather",
    group: "weather",
    maxObjects: 24,
    reason: "Representative environmental and weather-observation spacecraft.",
  },
  {
    category: "navigation",
    group: "gps-ops",
    maxObjects: 24,
    reason:
      "Operational navigation spacecraft selected as a bounded constellation view.",
  },
  {
    category: "commercial_communications",
    group: "iridium-NEXT",
    maxObjects: 24,
    reason:
      "Representative commercial communications spacecraft; not a bulk constellation feed.",
  },
] as const;

export const CELESTRAK_CATALOG_LIMIT = celestrakCuration.reduce(
  (total, selection) => total + selection.maxObjects,
  0,
);
