import { createHash } from "node:crypto";

import {
  nearEarthApproachSchema,
  type Quantity,
  type SourceStamp,
} from "@/domain";
import type { NormalizeContext, NormalizedProviderRecord } from "@/providers";

import { JPL_CAD_VERSION, type JplCadRow } from "./schema";
import { JPL_TIME_CONVERSION_METHOD, tdbJulianDateToUtc } from "./time";
import type { JplCadRecord } from "./types";

export const ASTRONOMICAL_UNIT_KM = 149_597_870.7;
export const MEAN_LUNAR_DISTANCE_KM = 384_400;

function required(row: JplCadRow, index: number, field: string): string {
  const value = row[index]?.trim();
  if (!value) throw new Error(`JPL CAD ${field} is required`);
  return value;
}

function optional(row: JplCadRow, index: number): string | null {
  return row[index]?.trim() || null;
}

function number(value: string, field: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`JPL CAD ${field} is invalid`);
  return parsed;
}

function stamp(
  context: NormalizeContext,
  upstreamRecordId: string,
  observedAt: string,
): SourceStamp {
  return {
    provider: context.provider,
    providerLabel: context.providerLabel,
    upstreamRecordId,
    sourceUrl: context.sourceUrl,
    observedAt,
    fetchedAt: context.fetchedAt,
    upstreamVersion: JPL_CAD_VERSION,
    adapterVersion: context.adapterVersion,
    freshness: {
      state: "live",
      ageSeconds: 0,
      staleAfterSeconds: 21_600,
      reason: null,
    },
  };
}

function authoritative(
  value: number,
  unit: Quantity["unit"],
  source: SourceStamp,
): Quantity {
  return {
    value,
    unit,
    evidenceClass: "authoritative_computed",
    source,
    method: null,
    uncertainty: null,
  };
}

function observed(
  value: number,
  unit: Quantity["unit"],
  source: SourceStamp,
): Quantity {
  return {
    value,
    unit,
    evidenceClass: "provider_observed",
    source,
    method: null,
    uncertainty: null,
  };
}

function lunarDistance(au: number): Quantity {
  return {
    value: (au * ASTRONOMICAL_UNIT_KM) / MEAN_LUNAR_DISTANCE_KM,
    unit: "lunar_distance",
    evidenceClass: "astraops_computed",
    source: null,
    method:
      "AstraOps conversion using 1 au = 149,597,870.7 km and mean lunar distance = 384,400 km.",
    uncertainty: null,
  };
}

export function describeApproachDistance(lunarDistances: number): string {
  if (lunarDistances < 1)
    return "Passes within one mean lunar distance; proximity alone does not indicate impact risk.";
  if (lunarDistances < 5)
    return "Passes between one and five mean lunar distances from Earth.";
  return "Passes at least five mean lunar distances from Earth.";
}

export function mapJplCadRow(
  row: JplCadRow,
  context: NormalizeContext,
): NormalizedProviderRecord<JplCadRecord> {
  const designation = required(row, 0, "designation");
  const orbitId = required(row, 1, "orbit_id");
  const julianDate = number(required(row, 2, "jd"), "jd");
  const nominalAu = number(required(row, 4, "dist"), "dist");
  const minimumText = optional(row, 5);
  const maximumText = optional(row, 6);
  const relativeVelocity = number(required(row, 7, "v_rel"), "v_rel");
  const absoluteMagnitudeText = optional(row, 10);
  const diameterText = optional(row, 11);
  const diameterSigmaText = optional(row, 12);
  const closeApproachAt = tdbJulianDateToUtc(julianDate);
  const upstreamRecordId = `${designation}|${orbitId}|${julianDate}`;
  const source = stamp(context, upstreamRecordId, closeApproachAt);
  const minimumAu = minimumText ? number(minimumText, "dist_min") : null;
  const maximumAu = maximumText ? number(maximumText, "dist_max") : null;
  const diameterKm = diameterText ? number(diameterText, "diameter") : null;
  const diameterSigmaKm = diameterSigmaText
    ? number(diameterSigmaText, "diameter_sigma")
    : null;
  if (diameterSigmaKm !== null && diameterKm === null) {
    throw new Error("JPL CAD diameter uncertainty requires a diameter");
  }
  const idHash = createHash("sha256")
    .update(upstreamRecordId)
    .digest("hex")
    .slice(0, 20);
  const nominalDistanceLunar = lunarDistance(nominalAu);
  const approach = nearEarthApproachSchema.parse({
    id: `jpl_cad:${idHash}`,
    designation,
    objectName: optional(row, 13),
    closeApproachAt,
    closeApproachJulianDate: authoritative(julianDate, "julian_date", source),
    closeApproachTimeScale: "TDB",
    timeConversionMethod: JPL_TIME_CONVERSION_METHOD,
    nominalDistance: authoritative(nominalAu, "au", source),
    minimumDistance:
      minimumAu === null ? null : authoritative(minimumAu, "au", source),
    maximumDistance:
      maximumAu === null ? null : authoritative(maximumAu, "au", source),
    nominalDistanceLunar,
    minimumDistanceLunar: minimumAu === null ? null : lunarDistance(minimumAu),
    maximumDistanceLunar: maximumAu === null ? null : lunarDistance(maximumAu),
    relativeVelocity: authoritative(relativeVelocity, "km_per_s", source),
    absoluteMagnitude:
      absoluteMagnitudeText === null
        ? null
        : authoritative(number(absoluteMagnitudeText, "h"), "unitless", source),
    diameter:
      diameterKm === null
        ? null
        : {
            ...observed(diameterKm, "km", source),
            uncertainty:
              diameterSigmaKm === null
                ? null
                : {
                    lower: Math.max(0, diameterKm - diameterSigmaKm),
                    upper: diameterKm + diameterSigmaKm,
                    confidenceLabel: "1σ supplied by JPL CAD",
                  },
          },
    closeApproachTimeUncertainty: optional(row, 9),
    orbitId,
    potentiallyHazardous: null,
    orbitConditionCode: null,
    source,
  });

  return {
    id: approach.id,
    upstreamRecordId,
    data: {
      approach,
      distanceSummary: describeApproachDistance(nominalDistanceLunar.value),
    },
    source,
    contentHash: createHash("sha256").update(JSON.stringify(row)).digest("hex"),
  };
}
