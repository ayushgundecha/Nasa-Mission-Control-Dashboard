import {
  SatRecError,
  degreesLat,
  degreesLong,
  eciToEcf,
  eciToGeodetic,
  gstime,
  json2satrec,
  propagate,
} from "@/vendor/satellite-js";

import type { OrbitalObject } from "@/domain";

export const SGP4_METHOD =
  "AstraOps computed with satellite.js 7.1.0 SGP4 from CelesTrak OMM mean elements in TEME; geodetic output uses GMST/WGS-84 transforms and is not direct telemetry.";
export const STALE_ORBIT_EPOCH_DAYS = 14;

export type CartesianKilometers = Readonly<{ x: number; y: number; z: number }>;

export type PropagatedOrbitPosition = Readonly<{
  objectId: string;
  calculatedAt: string;
  elementEpoch: string;
  referenceFrame: "TEME";
  earthFixedFrame: "pseudo-ECEF";
  positionEciKm: CartesianKilometers;
  positionEcfKm: CartesianKilometers;
  velocityEciKmPerSecond: CartesianKilometers;
  latitudeDegrees: number;
  longitudeDegrees: number;
  altitudeKm: number;
  epochAgeDays: number;
  staleEpoch: boolean;
  evidenceClass: "astraops_computed";
  method: string;
}>;

export type PropagationFailure = Readonly<{
  objectId: string;
  code: "invalid_time" | "invalid_elements" | "decayed" | "impossible_result";
  message: string;
}>;

export type PropagationResult =
  | Readonly<{ ok: true; position: PropagatedOrbitPosition }>
  | Readonly<{ ok: false; failure: PropagationFailure }>;

function finiteVector(vector: CartesianKilometers): boolean {
  return [vector.x, vector.y, vector.z].every(Number.isFinite);
}

function failure(
  objectId: string,
  code: PropagationFailure["code"],
  message: string,
): PropagationResult {
  return { ok: false, failure: { objectId, code, message } };
}

function toOmm(object: OrbitalObject) {
  return {
    OBJECT_NAME: object.name,
    OBJECT_ID: object.internationalDesignator ?? object.catalogNumber,
    EPOCH: object.epoch,
    MEAN_MOTION: object.meanMotionRevolutionsPerDay.value,
    ECCENTRICITY: object.eccentricity.value,
    INCLINATION: object.inclination.value,
    RA_OF_ASC_NODE: object.rightAscensionOfAscendingNode.value,
    ARG_OF_PERICENTER: object.argumentOfPerigee.value,
    MEAN_ANOMALY: object.meanAnomaly.value,
    EPHEMERIS_TYPE: 0 as const,
    CLASSIFICATION_TYPE: "U" as const,
    NORAD_CAT_ID: object.catalogNumber,
    ELEMENT_SET_NO: object.elementSetNumber.value,
    REV_AT_EPOCH: object.revolutionNumberAtEpoch.value,
    BSTAR: object.bstar.value,
    MEAN_MOTION_DOT: object.meanMotionDot.value,
    MEAN_MOTION_DDOT: object.meanMotionDdot.value,
  };
}

export function propagateOrbitalObject(
  object: OrbitalObject,
  at: Date,
): PropagationResult {
  if (!Number.isFinite(at.getTime())) {
    return failure(
      object.id,
      "invalid_time",
      "Propagation time must be a valid UTC instant.",
    );
  }

  let satrec;
  try {
    satrec = json2satrec(toOmm(object));
  } catch {
    return failure(
      object.id,
      "invalid_elements",
      "The stored OMM elements could not initialize SGP4.",
    );
  }

  if (satrec.error !== SatRecError.None) {
    return failure(
      object.id,
      "invalid_elements",
      `SGP4 rejected the mean elements (code ${satrec.error}).`,
    );
  }

  const propagated = propagate(satrec, at, {
    communityDecayCheckEnabled: true,
  });
  if (!propagated) {
    // `propagate` mutates SatRec.error; Number() avoids TypeScript preserving
    // the pre-call narrowing to SatRecError.None across that mutation boundary.
    const decayed = Number(satrec.error) === Number(SatRecError.Decayed);
    return failure(
      object.id,
      decayed ? "decayed" : "invalid_elements",
      decayed
        ? "The object appears decayed at this time; no position is displayed."
        : `SGP4 could not produce a position (code ${satrec.error}).`,
    );
  }

  const positionEciKm = { ...propagated.position };
  const velocityEciKmPerSecond = { ...propagated.velocity };
  const siderealTime = gstime(at);
  const positionEcfKm = { ...eciToEcf(propagated.position, siderealTime) };
  const geodetic = eciToGeodetic(propagated.position, siderealTime);
  if (
    !finiteVector(positionEciKm) ||
    !finiteVector(positionEcfKm) ||
    !finiteVector(velocityEciKmPerSecond) ||
    ![geodetic.latitude, geodetic.longitude, geodetic.height].every(
      Number.isFinite,
    ) ||
    geodetic.height < -50 ||
    geodetic.height > 100_000
  ) {
    return failure(
      object.id,
      "impossible_result",
      "SGP4 returned a physically unusable position.",
    );
  }

  const epochAgeDays =
    Math.abs(at.getTime() - Date.parse(object.epoch)) / 86_400_000;
  return {
    ok: true,
    position: {
      objectId: object.id,
      calculatedAt: at.toISOString(),
      elementEpoch: object.epoch,
      referenceFrame: "TEME",
      earthFixedFrame: "pseudo-ECEF",
      positionEciKm,
      positionEcfKm,
      velocityEciKmPerSecond,
      latitudeDegrees: degreesLat(geodetic.latitude),
      longitudeDegrees: degreesLong(geodetic.longitude),
      altitudeKm: geodetic.height,
      epochAgeDays,
      staleEpoch: epochAgeDays > STALE_ORBIT_EPOCH_DAYS,
      evidenceClass: "astraops_computed",
      method: SGP4_METHOD,
    },
  };
}

export function propagateCatalog(
  objects: readonly OrbitalObject[],
  at: Date,
): readonly PropagationResult[] {
  return objects.map((object) => propagateOrbitalObject(object, at));
}
