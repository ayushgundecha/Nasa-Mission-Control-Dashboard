// @vitest-environment node

import { describe, expect, it } from "vitest";

import { createLaunchLibraryAdapter } from "./adapter";
import {
  ll2LaunchFixture,
  ll2ScheduleStateFixture,
  ll2UpcomingFixture,
} from "./fixtures";
import { mapLl2Launch } from "./mapper";
import { ll2LaunchPageSchema } from "./schema";

const context = {
  provider: "launch_library_2",
  providerLabel: "Launch Library 2",
  dataset: "launches_upcoming",
  adapterVersion: "1.0.0",
  sourceUrl: "https://lldev.thespacedevs.com/2.3.0/launches/upcoming/",
  fetchedAt: "2026-09-02T08:00:00.000Z",
};

describe("Launch Library 2 mapper", () => {
  it("maps provider, vehicle, mission, pad, media, and provenance losslessly", () => {
    const record = mapLl2Launch(ll2LaunchFixture, "upcoming", context);

    expect(record.upstreamRecordId).toBe(ll2LaunchFixture.id);
    expect(record.data.launch).toMatchObject({
      id: `ll2:${ll2LaunchFixture.id}`,
      status: "go",
      window: {
        start: "2026-09-03T14:20:00Z",
        end: "2026-09-03T14:20:00Z",
        precision: "minute",
      },
      launchServiceProviderId: "ll2_agency:147",
      vehicleId: "ll2_vehicle:26",
      pad: {
        locationName: "Mahia Peninsula, New Zealand",
        position: {
          latitudeDegrees: -39.260881,
          longitudeDegrees: 177.865826,
        },
      },
    });
    expect(record.data.agency).toMatchObject({
      name: "Rocket Lab",
      type: "commercial",
      countryCodes: ["US"],
    });
    expect(record.data.vehicle).toMatchObject({
      name: "Electron",
      payloadToLeo: { value: 300, unit: "kg" },
      height: { value: 18, unit: "m" },
      reusable: false,
    });
    expect(record.data.mission).toMatchObject({
      name: "Owl Around The World",
      orbitAbbreviation: "LEO",
    });
    expect(record.data.media).toMatchObject({
      image: {
        credit: "Rocket Lab",
        licenseName: "Rocket Lab Image Use Policy",
      },
      webcastUrls: [{ publisher: "Rocket Lab", type: "Webcast" }],
    });
    expect(record.source).toMatchObject({
      provider: "launch_library_2",
      observedAt: "2026-08-30T21:12:03Z",
      fetchedAt: "2026-09-02T08:00:00.000Z",
    });
    expect(record.contentHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("keeps scrubs and cancellations distinct from the LL2 schedule status", () => {
    const [scrubbed, cancelled] = ll2ScheduleStateFixture.results.map(
      (launch) => mapLl2Launch(launch, "upcoming", context),
    );

    expect(scrubbed?.data.launch.status).toBe("scrubbed");
    expect(scrubbed?.data.scheduleChanges[0]?.kind).toBe("scrubbed");
    expect(cancelled?.data.launch.status).toBe("cancelled");
    expect(cancelled?.data.scheduleChanges[0]?.kind).toBe("cancelled");
  });

  it("turns a year-only NET into an honest full-year window", () => {
    const yearLaunch = ll2ScheduleStateFixture.results[1]!;
    const record = mapLl2Launch(yearLaunch, "upcoming", context);

    expect(record.data.launch.window).toEqual({
      start: "2027-01-01T00:00:00.000Z",
      end: "2027-12-31T23:59:59.999Z",
      precision: "window",
    });
  });

  it("rejects schema drift before normalization", () => {
    expect(
      ll2LaunchPageSchema.safeParse({
        ...ll2UpcomingFixture,
        results: [{ ...ll2LaunchFixture, window_start: null }],
      }).success,
    ).toBe(false);
  });
});

describe("Launch Library 2 adapter", () => {
  it("uses supported v2.3 development and production feeds with one-hour freshness", () => {
    const development = createLaunchLibraryAdapter({
      feed: "upcoming",
      environment: "development",
      fixturePayload: ll2UpcomingFixture,
    });
    const production = createLaunchLibraryAdapter({
      feed: "previous",
      environment: "production",
    });

    expect(development.request().url).toBe(
      "https://lldev.thespacedevs.com/2.3.0/launches/upcoming/?limit=100&mode=detailed&ordering=net",
    );
    expect(production.request().url).toBe(
      "https://ll.thespacedevs.com/2.3.0/launches/previous/?limit=100&mode=detailed&ordering=-net",
    );
    expect(development.freshness.currentForSeconds).toBe(3_600);
    expect(development.dataset).toBe("launches_upcoming");
    expect(production.dataset).toBe("launches_previous");
  });

  it("preserves pagination metadata at the validated upstream boundary", () => {
    const parsed = ll2LaunchPageSchema.parse({
      ...ll2UpcomingFixture,
      count: 189,
      next: "https://lldev.thespacedevs.com/2.3.0/launches/upcoming/?limit=100&offset=100",
    });
    expect(parsed.count).toBe(189);
    expect(parsed.next).toContain("offset=100");
  });
});
