import {
  launchSchema,
  nearEarthApproachSchema,
  orbitalObjectSchema,
  sourceStampSchema,
  spaceWeatherSnapshotSchema,
} from "@/domain";
import {
  launchFixture,
  launchLibrarySourceFixture,
} from "@/domain/__fixtures__/contracts.fixtures";

const noaaSource = sourceStampSchema.parse({
  provider: "noaa_swpc",
  providerLabel: "NOAA SWPC",
  upstreamRecordId: "fixture-planetary-k-index",
  sourceUrl: "https://www.swpc.noaa.gov/products/planetary-k-index",
  observedAt: "2026-09-02T03:45:00.000Z",
  fetchedAt: "2026-09-02T04:00:00.000Z",
  upstreamVersion: "fixture-2026-09-02",
  adapterVersion: "1.0.0",
  freshness: {
    state: "stale",
    ageSeconds: 1080,
    staleAfterSeconds: 300,
    reason:
      "Fixture demonstrates last-known-good behavior after a delayed refresh.",
  },
});

const celestrakSource = sourceStampSchema.parse({
  provider: "celestrak",
  providerLabel: "CelesTrak",
  upstreamRecordId: "25544",
  sourceUrl:
    "https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=JSON",
  observedAt: "2026-09-02T02:10:00.000Z",
  fetchedAt: "2026-09-02T03:55:00.000Z",
  upstreamVersion: null,
  adapterVersion: "1.0.0",
  freshness: {
    state: "current",
    ageSeconds: 6600,
    staleAfterSeconds: 7200,
    reason: null,
  },
});

const jplSource = sourceStampSchema.parse({
  provider: "jpl_cad",
  providerLabel: "JPL CAD",
  upstreamRecordId: "fixture-2026-ab",
  sourceUrl: "https://ssd-api.jpl.nasa.gov/cad.api",
  observedAt: "2026-09-02T00:00:00.000Z",
  fetchedAt: "2026-09-02T03:30:00.000Z",
  upstreamVersion: "1.5",
  adapterVersion: "1.0.0",
  freshness: {
    state: "current",
    ageSeconds: 12600,
    staleAfterSeconds: 21600,
    reason: null,
  },
});

function observedQuantity(
  value: number,
  unit: string,
  source: typeof noaaSource,
) {
  return {
    value,
    unit,
    evidenceClass: "provider_observed" as const,
    source,
    method: null,
    uncertainty: null,
  };
}

export const commandLaunches = [
  launchSchema.parse(launchFixture),
  launchSchema.parse({
    ...launchFixture,
    id: "ll2:fixture-lunar-pathfinder",
    name: "Lunar Pathfinder",
    slug: "lunar-pathfinder",
    window: {
      start: "2026-09-04T06:15:00.000Z",
      end: "2026-09-04T08:15:00.000Z",
      precision: "minute",
    },
    missionDescription:
      "Technology demonstration bound for a lunar transfer trajectory.",
    source: {
      ...launchLibrarySourceFixture,
      upstreamRecordId: "fixture-lunar-pathfinder",
    },
  }),
  launchSchema.parse({
    ...launchFixture,
    id: "ll2:fixture-polar-observer",
    name: "Polar Observer 3",
    slug: "polar-observer-3",
    window: {
      start: "2026-09-05T21:40:00.000Z",
      end: "2026-09-05T22:10:00.000Z",
      precision: "minute",
    },
    missionDescription: "Earth-observation mission to a sun-synchronous orbit.",
    source: {
      ...launchLibrarySourceFixture,
      upstreamRecordId: "fixture-polar-observer",
    },
  }),
] as const;

export const weatherFixture = spaceWeatherSnapshotSchema.parse({
  id: "noaa_swpc:fixture-2026-09-02t0345z",
  validAt: "2026-09-02T03:45:00.000Z",
  summary:
    "Minor geomagnetic activity; last-known-good values remain available while the fixture refresh is delayed.",
  geomagneticLevel: "minor",
  solarRadiationLevel: "none",
  radioBlackoutLevel: "none",
  solarWindSpeed: observedQuantity(462, "km_per_s", noaaSource),
  interplanetaryMagneticField: observedQuantity(5.8, "nanotesla", noaaSource),
  activeEventIds: [],
  source: noaaSource,
});

export const orbitalObjectFixture = orbitalObjectSchema.parse({
  id: "celestrak:25544",
  catalogNumber: "25544",
  name: "International Space Station",
  objectType: "payload",
  internationalDesignator: "1998-067A",
  epoch: "2026-09-02T02:10:00.000Z",
  inclination: observedQuantity(51.64, "degrees", celestrakSource),
  eccentricity: observedQuantity(0.00035, "unitless", celestrakSource),
  meanMotionRevolutionsPerDay: observedQuantity(
    15.5,
    "revolutions_per_day",
    celestrakSource,
  ),
  period: observedQuantity(92.9, "minutes", celestrakSource),
  apogee: observedQuantity(423, "km", celestrakSource),
  perigee: observedQuantity(417, "km", celestrakSource),
  curatedReason:
    "A familiar crewed platform that makes live orbital data tangible.",
  source: celestrakSource,
});

export const approachFixture = nearEarthApproachSchema.parse({
  id: "jpl_cad:fixture-2026-ab",
  designation: "2026 AB",
  objectName: null,
  closeApproachAt: "2026-09-07T11:20:00.000Z",
  nominalDistance: {
    ...observedQuantity(3.82, "lunar_distance", jplSource),
    evidenceClass: "authoritative_computed",
  },
  minimumDistance: null,
  relativeVelocity: {
    ...observedQuantity(12.4, "km_per_s", jplSource),
    evidenceClass: "authoritative_computed",
  },
  absoluteMagnitude: {
    ...observedQuantity(24.7, "unitless", jplSource),
    evidenceClass: "authoritative_computed",
  },
  potentiallyHazardous: false,
  orbitConditionCode: "5",
  source: jplSource,
});
