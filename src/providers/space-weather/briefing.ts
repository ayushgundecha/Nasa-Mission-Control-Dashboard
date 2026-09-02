import type {
  DonkiEvent,
  KpMeasurement,
  NoaaScaleSnapshot,
  SolarWindMeasurement,
  SpaceWeatherBriefing,
} from "./types";

export function buildSpaceWeatherBriefing(input: {
  kp: readonly KpMeasurement[];
  scales: readonly NoaaScaleSnapshot[];
  solarWind: readonly SolarWindMeasurement[];
  donki?: readonly DonkiEvent[] | null;
}): SpaceWeatherBriefing {
  const observations = input.kp
    .filter((item) => item.evidenceMode !== "predicted")
    .sort(
      (left, right) => Date.parse(right.validAt) - Date.parse(left.validAt),
    );
  const forecast = input.kp
    .filter((item) => item.evidenceMode === "predicted")
    .sort(
      (left, right) => Date.parse(left.validAt) - Date.parse(right.validAt),
    );
  const scales = input.scales.find((item) => item.period === "current") ?? null;
  const solarWind = [...input.solarWind].sort(
    (left, right) => Date.parse(right.observedAt) - Date.parse(left.observedAt),
  );
  const speed =
    solarWind.find((item) => item.speedKilometersPerSecond !== null) ?? null;
  const magneticField =
    solarWind.find(
      (item) =>
        item.totalMagneticFieldNanotesla !== null ||
        item.bzGsmNanotesla !== null,
    ) ?? null;
  const noaaAvailable =
    observations.length > 0 ||
    scales !== null ||
    speed !== null ||
    magneticField !== null;
  const donkiAvailable = input.donki !== undefined && input.donki !== null;

  return {
    currentKp: observations[0] ?? null,
    recentKp: [...observations].reverse(),
    forecastKp: forecast,
    scales,
    solarWind: { speed, magneticField, history: [...solarWind].reverse() },
    recentEvents: input.donki ?? [],
    availability: {
      noaa: noaaAvailable ? "available" : "unavailable",
      donki: donkiAvailable ? "available" : "unavailable",
    },
    warnings: [
      ...(!noaaAvailable ? ["NOAA current conditions are unavailable."] : []),
      ...(!donkiAvailable
        ? [
            "NASA DONKI event context is unavailable; NOAA conditions remain independent.",
          ]
        : []),
    ],
  };
}
