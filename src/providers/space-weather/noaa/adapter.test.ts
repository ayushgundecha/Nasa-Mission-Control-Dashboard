// @vitest-environment node

import { describe, expect, it } from "vitest";

import { buildSpaceWeatherBriefing } from "../briefing";
import { interpretKp } from "../interpretation";
import {
  createNoaaKpAdapter,
  createNoaaScalesAdapter,
  createNoaaSolarWindAdapter,
} from "./adapter";
import {
  noaaKpFixture,
  noaaScalesFixture,
  noaaSolarWindFixture,
} from "./fixtures";

const context = {
  provider: "noaa_swpc",
  providerLabel: "NOAA Space Weather Prediction Center",
  dataset: "kp_forecast",
  adapterVersion: "1.0.0",
  sourceUrl: "https://services.swpc.noaa.gov/",
  fetchedAt: "2026-09-02T07:05:00.000Z",
};

describe("NOAA SWPC adapters", () => {
  it("keeps observed, estimated, and predicted Kp distinct in a bounded window", () => {
    const adapter = createNoaaKpAdapter(noaaKpFixture);
    const records = adapter.normalize(noaaKpFixture, context);

    expect(records).toHaveLength(7);
    expect(records.map((record) => record.data.evidenceMode)).toEqual([
      "observed",
      "observed",
      "observed",
      "observed",
      "estimated",
      "predicted",
      "predicted",
    ]);
    expect(records[4]?.data.interpretation.band).toBe("elevated");
    expect(records[5]?.data.interpretation).toMatchObject({
      band: "severe",
      noaaScale: "G4",
    });
    expect(records[6]?.data.kp).toBeNull();
    expect(records[6]?.data.interpretation.band).toBe("unknown");
  });

  it("uses documented Kp thresholds without making impact claims", () => {
    expect(interpretKp(1)).toMatchObject({ band: "quiet", noaaScale: "G0" });
    expect(interpretKp(4.67)).toMatchObject({
      band: "elevated",
      noaaScale: "G0",
    });
    expect(interpretKp(5)).toMatchObject({ band: "minor", noaaScale: "G1" });
    expect(interpretKp(9)).toMatchObject({ band: "extreme", noaaScale: "G5" });
    expect(interpretKp(null).operationalContext).toContain("No geomagnetic");
  });

  it("preserves null scale values separately from a measured zero", () => {
    const adapter = createNoaaScalesAdapter(noaaScalesFixture);
    const records = adapter.normalize(noaaScalesFixture, context);
    const current = records.find((record) => record.data.period === "current");
    const forecast = records.find(
      (record) => record.data.period === "forecast_day_1",
    );

    expect(current?.data.radioBlackout.scale).toBe(0);
    expect(forecast?.data.radioBlackout.scale).toBeNull();
    expect(forecast?.data.geomagneticStorm.scale).toBe(4);
    expect(forecast?.data.evidenceMode).toBe("predicted");
  });

  it("retains solar-wind units and does not coerce missing values to zero", () => {
    const adapter = createNoaaSolarWindAdapter(noaaSolarWindFixture);
    const records = adapter.normalize(noaaSolarWindFixture, context);

    expect(records[0]?.data.speedKilometersPerSecond).toBeNull();
    expect(records[0]?.data.bzGsmNanotesla).toBeNull();
    expect(records[1]?.data.speedKilometersPerSecond).toBe(385);
    expect(records[1]?.data.totalMagneticFieldNanotesla).toBe(4);
    expect(records[1]?.data.bzGsmNanotesla).toBe(0);
    expect(records[1]?.data.observedAt).toBe("2026-09-02T06:58:00Z");
  });

  it("keeps NOAA usable when optional DONKI context is absent", () => {
    const kp = createNoaaKpAdapter(noaaKpFixture)
      .normalize(noaaKpFixture, context)
      .map((record) => record.data);
    const scales = createNoaaScalesAdapter(noaaScalesFixture)
      .normalize(noaaScalesFixture, context)
      .map((record) => record.data);
    const solarWind = createNoaaSolarWindAdapter(noaaSolarWindFixture)
      .normalize(noaaSolarWindFixture, context)
      .map((record) => record.data);
    const briefing = buildSpaceWeatherBriefing({
      kp,
      scales,
      solarWind,
      donki: null,
    });

    expect(briefing.availability).toEqual({
      noaa: "available",
      donki: "unavailable",
    });
    expect(briefing.currentKp?.evidenceMode).toBe("estimated");
    expect(briefing.solarWind.speed?.speedKilometersPerSecond).toBe(385);
    expect(briefing.solarWind.magneticField?.bzGsmNanotesla).toBe(0);
    expect(briefing.warnings).toHaveLength(1);
  });
});
