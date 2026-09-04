import { createHash } from "node:crypto";

import { orbitalObjectSchema, type SourceStamp } from "@/domain";
import type { NormalizeContext, NormalizedProviderRecord } from "@/providers";

import type { CelestrakOmmItem } from "./schema";
import type { CelestrakCuration, CelestrakOrbitalRecord } from "./types";

const EARTH_EQUATORIAL_RADIUS_KM = 6_378.137;
const EARTH_GRAVITATIONAL_PARAMETER_KM3_S2 = 398_600.4418;

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function catalogNumber(item: CelestrakOmmItem): string {
  return String(item.NORAD_CAT_ID);
}

function normalizedEpoch(epoch: string): string {
  return new Date(epoch).toISOString();
}

function source(
  item: CelestrakOmmItem,
  context: NormalizeContext,
): SourceStamp {
  const epoch = normalizedEpoch(item.EPOCH);
  return {
    provider: context.provider,
    providerLabel: context.providerLabel,
    upstreamRecordId: catalogNumber(item),
    sourceUrl: context.sourceUrl,
    observedAt: epoch,
    fetchedAt: context.fetchedAt,
    upstreamVersion: `${epoch}|${item.ELEMENT_SET_NO}`,
    adapterVersion: context.adapterVersion,
    freshness: {
      state: "live",
      ageSeconds: 0,
      staleAfterSeconds: 7_200,
      reason: null,
    },
  };
}

function observed(
  value: number,
  unit: "unitless" | "degrees" | "revolutions_per_day" | "count",
  stamp: SourceStamp,
) {
  return {
    value,
    unit,
    evidenceClass: "provider_observed" as const,
    source: stamp,
    method: null,
    uncertainty: null,
  };
}

function derivedOrbit(item: CelestrakOmmItem) {
  const periodMinutes = 1_440 / item.MEAN_MOTION;
  const meanMotionRadiansPerSecond = (item.MEAN_MOTION * 2 * Math.PI) / 86_400;
  const semiMajorAxisKm = Math.cbrt(
    EARTH_GRAVITATIONAL_PARAMETER_KM3_S2 / meanMotionRadiansPerSecond ** 2,
  );
  const method =
    "AstraOps Keplerian estimate from CelesTrak OMM mean motion and eccentricity; not propagated telemetry.";
  const computed = (value: number, unit: "minutes" | "km") => ({
    value,
    unit,
    evidenceClass: "astraops_computed" as const,
    source: null,
    method,
    uncertainty: null,
  });
  return {
    period: computed(periodMinutes, "minutes"),
    apogee: computed(
      semiMajorAxisKm * (1 + item.ECCENTRICITY) - EARTH_EQUATORIAL_RADIUS_KM,
      "km",
    ),
    perigee: computed(
      semiMajorAxisKm * (1 - item.ECCENTRICITY) - EARTH_EQUATORIAL_RADIUS_KM,
      "km",
    ),
  };
}

function objectType(value: CelestrakOmmItem["OBJECT_TYPE"]) {
  if (value === "PAYLOAD") return "payload" as const;
  if (value === "ROCKET BODY") return "rocket_body" as const;
  if (value === "DEBRIS") return "debris" as const;
  return "unknown" as const;
}

export function mapCelestrakOmm(
  item: CelestrakOmmItem,
  curation: CelestrakCuration,
  context: NormalizeContext,
): NormalizedProviderRecord<CelestrakOrbitalRecord> {
  const stamp = source(item, context);
  const id = catalogNumber(item);
  const object = orbitalObjectSchema.parse({
    id: `celestrak:${id}`,
    catalogNumber: id,
    name: item.OBJECT_NAME,
    objectType: objectType(item.OBJECT_TYPE),
    internationalDesignator: item.OBJECT_ID,
    epoch: normalizedEpoch(item.EPOCH),
    inclination: observed(item.INCLINATION, "degrees", stamp),
    eccentricity: observed(item.ECCENTRICITY, "unitless", stamp),
    meanMotionRevolutionsPerDay: observed(
      item.MEAN_MOTION,
      "revolutions_per_day",
      stamp,
    ),
    rightAscensionOfAscendingNode: observed(
      item.RA_OF_ASC_NODE,
      "degrees",
      stamp,
    ),
    argumentOfPerigee: observed(item.ARG_OF_PERICENTER, "degrees", stamp),
    meanAnomaly: observed(item.MEAN_ANOMALY, "degrees", stamp),
    bstar: observed(item.BSTAR, "unitless", stamp),
    meanMotionDot: observed(item.MEAN_MOTION_DOT, "unitless", stamp),
    meanMotionDdot: observed(item.MEAN_MOTION_DDOT, "unitless", stamp),
    elementSetNumber: observed(item.ELEMENT_SET_NO, "count", stamp),
    revolutionNumberAtEpoch: observed(item.REV_AT_EPOCH, "count", stamp),
    ...derivedOrbit(item),
    curatedReason: curation.reason,
    source: stamp,
  });

  return {
    // Provider-record IDs must remain unique even if CelesTrak lists an object
    // in two small curation queries; the canonical object identity stays on data.object.
    id: `celestrak_omm:${curation.category}-${id}`,
    upstreamRecordId: id,
    data: {
      object,
      category: curation.category,
      sourceQuery: context.sourceUrl,
    },
    source: stamp,
    contentHash: hash(item),
  };
}

/** Retain a bounded deterministic snapshot; disappearance on a later success removes an object. */
export function reconcileCelestrakCatalog(
  records: readonly NormalizedProviderRecord<CelestrakOrbitalRecord>[],
  maximum: number,
): readonly NormalizedProviderRecord<CelestrakOrbitalRecord>[] {
  const newestByCatalog = new Map<
    string,
    NormalizedProviderRecord<CelestrakOrbitalRecord>
  >();
  for (const record of records) {
    const prior = newestByCatalog.get(record.upstreamRecordId);
    if (!prior || record.data.object.epoch > prior.data.object.epoch) {
      newestByCatalog.set(record.upstreamRecordId, record);
    }
  }
  return [...newestByCatalog.values()]
    .sort((left, right) =>
      left.upstreamRecordId.localeCompare(right.upstreamRecordId, undefined, {
        numeric: true,
      }),
    )
    .slice(0, maximum);
}
