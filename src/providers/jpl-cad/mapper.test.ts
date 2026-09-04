// @vitest-environment node

import { describe, expect, it } from "vitest";

import { createJplCadAdapter } from "./adapter";
import {
  jplCadEmptyFixture,
  jplCadKnownFixture,
  jplCadUnknownFixture,
} from "./fixtures";
import {
  ASTRONOMICAL_UNIT_KM,
  MEAN_LUNAR_DISTANCE_KM,
  mapJplCadRow,
} from "./mapper";
import { JPL_CAD_FIELDS, jplCadPayloadSchema } from "./schema";
import { tdbJulianDateToUtc } from "./time";

const context = {
  provider: "jpl_cad",
  providerLabel: "NASA/JPL SBDB Close Approach Data",
  dataset: "earth_close_approaches",
  adapterVersion: "1.0.0",
  sourceUrl: "https://ssd-api.jpl.nasa.gov/cad.api",
  fetchedAt: "2026-09-04T00:00:00.000Z",
};

describe("JPL CAD mapper", () => {
  it("retains authoritative distance bounds, TDB time, UTC conversion, and diameter uncertainty", () => {
    const record = mapJplCadRow(jplCadKnownFixture.data![0]!, context);
    const approach = record.data.approach;

    expect(approach).toMatchObject({
      designation: "99942",
      objectName: "99942 Apophis (2004 MN4)",
      orbitId: "206",
      closeApproachTimeScale: "TDB",
      nominalDistance: { unit: "au", evidenceClass: "authoritative_computed" },
      minimumDistance: { unit: "au" },
      maximumDistance: { unit: "au" },
      relativeVelocity: { value: 7.42249308586014, unit: "km_per_s" },
      diameter: { value: 0.34, unit: "km" },
      potentiallyHazardous: null,
    });
    expect(approach.diameter?.uncertainty?.lower).toBeCloseTo(0.3, 12);
    expect(approach.diameter?.uncertainty?.upper).toBeCloseTo(0.38, 12);
    expect(approach.nominalDistanceLunar.value).toBeCloseTo(
      (0.000254099098170977 * ASTRONOMICAL_UNIT_KM) / MEAN_LUNAR_DISTANCE_KM,
      10,
    );
    expect(approach.closeApproachAt).toBe(
      tdbJulianDateToUtc(2462240.407091595),
    );
    expect(record.data.distanceSummary).toContain("proximity alone");
  });

  it("keeps unknown diameter and uncertainty unavailable rather than inventing zero", () => {
    const approach = mapJplCadRow(jplCadUnknownFixture.data![0]!, context).data
      .approach;
    expect(approach.diameter).toBeNull();
    expect(approach.potentiallyHazardous).toBeNull();
  });

  it("accepts a valid zero-result response and rejects field/version drift", () => {
    expect(jplCadPayloadSchema.parse(jplCadEmptyFixture).count).toBe(0);
    expect(
      jplCadPayloadSchema.safeParse({
        ...jplCadKnownFixture,
        fields: [...JPL_CAD_FIELDS].reverse(),
      }).success,
    ).toBe(false);
    expect(
      jplCadPayloadSchema.safeParse({
        ...jplCadKnownFixture,
        signature: { ...jplCadKnownFixture.signature, version: "1.6" },
      }).success,
    ).toBe(false);
  });

  it("builds a bounded, explicit Earth/NEO query with a six-hour cache target", () => {
    const adapter = createJplCadAdapter({
      startDate: "2026-09-04",
      endDate: "2026-11-03",
      fixturePayload: jplCadKnownFixture,
    });
    const url = new URL(adapter.request().url);
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      "date-min": "2026-09-04",
      "date-max": "2026-11-03",
      "dist-max": "10LD",
      body: "Earth",
      neo: "true",
      limit: "100",
      diameter: "true",
      fullname: "true",
    });
    expect(adapter.freshness.currentForSeconds).toBe(21_600);
    expect(() =>
      createJplCadAdapter({ startDate: "2026-01-01", endDate: "2027-01-02" }),
    ).toThrow(/0–90 day/);
  });
});
