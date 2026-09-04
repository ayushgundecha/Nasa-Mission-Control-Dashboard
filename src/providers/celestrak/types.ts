import type { OrbitalObject } from "@/domain";

export const celestrakCurationCategories = [
  "stations",
  "science_weather",
  "navigation",
  "commercial_communications",
] as const;

export type CelestrakCurationCategory =
  (typeof celestrakCurationCategories)[number];

export type CelestrakCuration = Readonly<{
  category: CelestrakCurationCategory;
  group: "stations" | "weather" | "gps-ops" | "iridium-NEXT";
  maxObjects: number;
  reason: string;
}>;

export type CelestrakOrbitalRecord = Readonly<{
  object: OrbitalObject;
  category: CelestrakCurationCategory;
  sourceQuery: string;
}>;
