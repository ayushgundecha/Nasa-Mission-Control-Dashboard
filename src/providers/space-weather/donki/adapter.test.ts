// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
  createDonkiCmeAdapter,
  createDonkiFlareAdapter,
  createDonkiGeomagneticStormAdapter,
  createDonkiNotificationAdapter,
} from "./adapter";
import {
  donkiCmeFixture,
  donkiEmptyFixture,
  donkiFlareFixture,
  donkiNotificationFixture,
  donkiStormFixture,
} from "./fixtures";

const context = {
  provider: "nasa_donki",
  providerLabel: "NASA DONKI",
  dataset: "donki_events",
  adapterVersion: "1.0.0",
  sourceUrl: "https://api.nasa.gov/DONKI",
  fetchedAt: "2026-09-02T08:00:00.000Z",
};
const options = { apiKey: "server-only-fixture-key", endDate: "2026-09-02" };

describe("NASA DONKI adapters", () => {
  it("normalizes analyst events without asserting causal relationships", () => {
    const flare = createDonkiFlareAdapter({
      ...options,
      fixturePayload: donkiFlareFixture,
    }).normalize(donkiFlareFixture, context)[0];
    const cme = createDonkiCmeAdapter({
      ...options,
      fixturePayload: donkiCmeFixture,
    }).normalize(donkiCmeFixture, context)[0];
    const storm = createDonkiGeomagneticStormAdapter({
      ...options,
      fixturePayload: donkiStormFixture,
    }).normalize(donkiStormFixture, context)[0];

    expect(flare?.data).toMatchObject({
      eventType: "flare",
      evidenceMode: "analyst_event",
      classType: "M1.2",
    });
    expect(cme?.data.measurements).toEqual([
      {
        observedAt: "2026-09-01T11:12:00.000Z",
        name: "cme_speed",
        value: 674,
        unit: "km_per_s",
      },
    ]);
    expect(storm?.data.measurements[0]).toMatchObject({
      name: "kp",
      value: 6,
      unit: "unitless",
    });
    expect(cme?.data.summary).toBe(donkiCmeFixture[0]?.note);
  });

  it("keeps the NASA key server-side and strips it from persisted evidence", () => {
    const adapter = createDonkiNotificationAdapter({
      ...options,
      fixturePayload: donkiNotificationFixture,
    });
    const request = adapter.request().url;
    const notification = adapter.normalize(
      donkiNotificationFixture,
      context,
    )[0];

    expect(request).toContain("api_key=server-only-fixture-key");
    expect(request).toContain("startDate=2026-08-26");
    expect(notification?.source.sourceUrl).not.toContain("api_key");
    expect(JSON.stringify(notification)).not.toContain(
      "server-only-fixture-key",
    );
    expect(notification?.data.summary).toContain("No causal inference");
  });

  it("refuses to construct a live DONKI request without a key", () => {
    const adapter = createDonkiFlareAdapter({
      apiKey: "",
      endDate: "2026-09-02",
      fixturePayload: donkiFlareFixture,
    });
    expect(() => adapter.request()).toThrow(/NASA_API_KEY/);
  });

  it("represents an empty event window without inventing events", () => {
    const adapter = createDonkiFlareAdapter({
      ...options,
      fixturePayload: donkiEmptyFixture,
    });

    expect(adapter.normalize(donkiEmptyFixture, context)).toEqual([]);
  });
});
