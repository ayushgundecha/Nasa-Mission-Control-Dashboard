import type { SourceStamp } from "@/domain";

export type WeatherEvidenceMode =
  "analyst_event" | "estimated" | "observed" | "predicted";

export type GeomagneticBand =
  | "elevated"
  | "extreme"
  | "minor"
  | "moderate"
  | "quiet"
  | "severe"
  | "strong"
  | "unknown";

export type GeomagneticInterpretation = Readonly<{
  band: GeomagneticBand;
  noaaScale: "G0" | "G1" | "G2" | "G3" | "G4" | "G5" | null;
  label: string;
  operationalContext: string;
  thresholdSourceUrl: string;
}>;

export type KpMeasurement = Readonly<{
  id: string;
  validAt: string;
  kp: number | null;
  noaaScale: string | null;
  evidenceMode: Exclude<WeatherEvidenceMode, "analyst_event">;
  interpretation: GeomagneticInterpretation;
  source: SourceStamp;
}>;

export type NoaaScaleSnapshot = Readonly<{
  id: string;
  validAt: string;
  period:
    | "current"
    | "previous_day"
    | "forecast_day_1"
    | "forecast_day_2"
    | "forecast_day_3";
  evidenceMode: "observed" | "predicted";
  radioBlackout: Readonly<{ scale: number | null; text: string | null }>;
  solarRadiation: Readonly<{ scale: number | null; text: string | null }>;
  geomagneticStorm: Readonly<{ scale: number | null; text: string | null }>;
  source: SourceStamp;
}>;

export type SolarWindMeasurement = Readonly<{
  id: string;
  observedAt: string;
  speedKilometersPerSecond: number | null;
  totalMagneticFieldNanotesla: number | null;
  bzGsmNanotesla: number | null;
  evidenceMode: "observed";
  source: SourceStamp;
}>;

export type DonkiEventType =
  "cme" | "flare" | "geomagnetic_storm" | "notification";

export type DonkiEvent = Readonly<{
  id: string;
  eventType: DonkiEventType;
  startedAt: string;
  peakAt: string | null;
  submittedAt: string | null;
  classType: string | null;
  sourceLocation: string | null;
  summary: string | null;
  measurements: readonly Readonly<{
    observedAt: string;
    name: "cme_speed" | "kp";
    value: number;
    unit: "km_per_s" | "unitless";
  }>[];
  evidenceMode: "analyst_event";
  source: SourceStamp;
}>;

export type SpaceWeatherBriefing = Readonly<{
  currentKp: KpMeasurement | null;
  recentKp: readonly KpMeasurement[];
  forecastKp: readonly KpMeasurement[];
  scales: NoaaScaleSnapshot | null;
  solarWind: Readonly<{
    speed: SolarWindMeasurement | null;
    magneticField: SolarWindMeasurement | null;
    history: readonly SolarWindMeasurement[];
  }>;
  recentEvents: readonly DonkiEvent[];
  availability: Readonly<{
    noaa: "available" | "unavailable";
    donki: "available" | "unavailable";
  }>;
  warnings: readonly string[];
}>;
