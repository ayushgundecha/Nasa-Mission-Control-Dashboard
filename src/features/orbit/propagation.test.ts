// @vitest-environment node

import { describe, expect, it } from "vitest";

import type { OrbitalObject } from "@/domain";
import {
  celestrakCuration,
  celestrakOmmFixture,
  mapCelestrakOmm,
} from "@/providers/celestrak";

import { propagateCatalog, propagateOrbitalObject } from "./propagation";
import { handleOrbitWorkerRequest } from "./worker-protocol";

const context = {
  provider: "celestrak",
  providerLabel: "CelesTrak",
  dataset: "omm_stations",
  adapterVersion: "1.0.0",
  sourceUrl:
    "https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=JSON",
  fetchedAt: "2026-09-02T08:00:00.000Z",
};
const object = mapCelestrakOmm(
  celestrakOmmFixture[0]!,
  celestrakCuration[0]!,
  context,
).data.object;

describe("SGP4 orbital propagation", () => {
  it("matches the pinned satellite.js 7.1.0 OMM reference result", () => {
    const result = propagateOrbitalObject(
      object,
      new Date("2026-09-02T08:00:00.000Z"),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.position.positionEciKm.x).toBeCloseTo(1251.0916695316773, 6);
    expect(result.position.positionEciKm.y).toBeCloseTo(4910.275592633743, 6);
    expect(result.position.positionEciKm.z).toBeCloseTo(4516.677854170314, 6);
    expect(result.position.latitudeDegrees).toBeCloseTo(41.89207400972005, 6);
    expect(result.position.longitudeDegrees).toBeCloseTo(-25.78164819581533, 6);
    expect(result.position.altitudeKm).toBeCloseTo(419.31656557759925, 6);
    expect(result.position).toMatchObject({
      referenceFrame: "TEME",
      earthFixedFrame: "pseudo-ECEF",
      evidenceClass: "astraops_computed",
      staleEpoch: false,
    });
    expect(result.position.method).toContain("not direct telemetry");
  });

  it("fails gracefully for invalid time and invalid elements", () => {
    expect(propagateOrbitalObject(object, new Date("invalid"))).toMatchObject({
      ok: false,
      failure: { code: "invalid_time" },
    });
    const invalid = {
      ...object,
      eccentricity: { ...object.eccentricity, value: 1.2 },
    } as OrbitalObject;
    expect(
      propagateOrbitalObject(invalid, new Date("2026-09-02T08:00:00.000Z")),
    ).toMatchObject({
      ok: false,
      failure: { code: "invalid_elements" },
    });
  });

  it("warns when an element epoch is stale", () => {
    const result = propagateOrbitalObject(
      object,
      new Date("2026-10-02T08:00:00.000Z"),
    );
    expect(result.ok && result.position.staleEpoch).toBe(true);
    if (result.ok) expect(result.position.epochAgeDays).toBeGreaterThan(30);
  });

  it("reports a decayed object without exposing an unusable position", () => {
    const decayingObject: OrbitalObject = {
      ...object,
      id: "celestrak:45110",
      catalogNumber: "45110",
      name: "STARLINK-1228",
      internationalDesignator: "2020-011AL",
      epoch: "2023-08-20T19:25:00.000Z",
      meanMotionRevolutionsPerDay: {
        ...object.meanMotionRevolutionsPerDay,
        value: 15.34502222,
      },
      eccentricity: { ...object.eccentricity, value: 0.000974 },
      inclination: { ...object.inclination, value: 69.9913 },
      rightAscensionOfAscendingNode: {
        ...object.rightAscensionOfAscendingNode,
        value: 111.5649,
      },
      argumentOfPerigee: { ...object.argumentOfPerigee, value: 159.9373 },
      meanAnomaly: { ...object.meanAnomaly, value: 200.0626 },
      bstar: { ...object.bstar, value: 0.003275 },
      meanMotionDot: { ...object.meanMotionDot, value: 0.0011 },
      meanMotionDdot: { ...object.meanMotionDdot, value: 0 },
      revolutionNumberAtEpoch: {
        ...object.revolutionNumberAtEpoch,
        value: 19_772,
      },
    };

    expect(
      propagateOrbitalObject(
        decayingObject,
        new Date("2026-01-01T00:00:00.000Z"),
      ),
    ).toMatchObject({
      ok: false,
      failure: {
        objectId: "celestrak:45110",
        code: "decayed",
      },
    });
  });

  it("propagates the complete curated budget inside a worker-friendly batch", () => {
    const objects = Array.from({ length: 88 }, (_, index) => ({
      ...object,
      id: `celestrak:${100000 + index}`,
      catalogNumber: String(100000 + index),
    }));
    const started = performance.now();
    const results = propagateCatalog(
      objects,
      new Date("2026-09-02T08:00:00.000Z"),
    );
    expect(results).toHaveLength(88);
    expect(results.every((result) => result.ok)).toBe(true);
    expect(performance.now() - started).toBeLessThan(250);
  });

  it("returns a typed worker response without using animation-frame time", () => {
    const ticks = [10, 15];
    const response = handleOrbitWorkerRequest(
      {
        type: "propagate",
        requestId: "request-1",
        calculatedAt: "2026-09-02T08:00:00.000Z",
        objects: [object],
      },
      () => ticks.shift()!,
    );
    expect(response).toMatchObject({
      type: "propagation_result",
      requestId: "request-1",
      calculatedAt: "2026-09-02T08:00:00.000Z",
      durationMs: 5,
    });
    expect(response.results[0]?.ok).toBe(true);
  });
});
