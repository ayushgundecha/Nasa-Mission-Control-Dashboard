const JULIAN_UNIX_EPOCH = 2_440_587.5;
const SECONDS_PER_DAY = 86_400;
const TT_MINUS_UTC_SECONDS = 69.184;

/**
 * Convert JPL's TDB Julian date to UTC for the bounded current/future feed.
 * TT−UTC is valid from 2017 onward; TDB−TT uses the standard short periodic
 * approximation (millisecond scale). The authoritative TDB JD is retained.
 */
export function tdbJulianDateToUtc(julianDate: number): string {
  if (!Number.isFinite(julianDate) || julianDate < 2_457_754.5) {
    throw new Error(
      "JPL CAD time conversion supports finite dates from 2017 onward",
    );
  }
  const meanAnomalyDegrees = 357.53 + 0.9856003 * (julianDate - 2_451_545);
  const meanAnomalyRadians = (meanAnomalyDegrees * Math.PI) / 180;
  const tdbMinusTtSeconds =
    0.001657 * Math.sin(meanAnomalyRadians) +
    0.000022 * Math.sin(2 * meanAnomalyRadians);
  const milliseconds =
    (julianDate - JULIAN_UNIX_EPOCH) * SECONDS_PER_DAY * 1_000 -
    (TT_MINUS_UTC_SECONDS + tdbMinusTtSeconds) * 1_000;
  return new Date(milliseconds).toISOString();
}

export const JPL_TIME_CONVERSION_METHOD =
  "AstraOps conversion from retained JPL TDB Julian date to UTC using TT−UTC 69.184 s (valid from 2017) and the standard short periodic TDB−TT approximation.";
