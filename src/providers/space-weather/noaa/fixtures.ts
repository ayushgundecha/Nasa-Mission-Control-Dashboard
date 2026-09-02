import {
  noaaKpForecastSchema,
  noaaScalesSchema,
  noaaSolarWindSchema,
} from "./schema";

export const noaaKpFixture = noaaKpForecastSchema.parse([
  {
    time_tag: "2026-09-01T12:00:00",
    kp: 2,
    observed: "observed",
    noaa_scale: null,
  },
  {
    time_tag: "2026-09-01T18:00:00",
    kp: 2.67,
    observed: "observed",
    noaa_scale: null,
  },
  {
    time_tag: "2026-09-02T00:00:00",
    kp: 3.33,
    observed: "observed",
    noaa_scale: null,
  },
  {
    time_tag: "2026-09-02T03:00:00",
    kp: 1,
    observed: "observed",
    noaa_scale: null,
  },
  {
    time_tag: "2026-09-02T06:00:00",
    kp: 4.33,
    observed: "estimated",
    noaa_scale: null,
  },
  {
    time_tag: "2026-09-03T03:00:00",
    kp: 8,
    observed: "predicted",
    noaa_scale: "G4",
  },
  {
    time_tag: "2026-09-03T06:00:00",
    kp: null,
    observed: "predicted",
    noaa_scale: null,
  },
]);

export const noaaEmptyKpFixture = noaaKpForecastSchema.parse([]);

export const noaaScalesFixture = noaaScalesSchema.parse({
  "-1": {
    DateStamp: "2026-09-01",
    TimeStamp: "07:04:00",
    R: { Scale: "0", Text: "none" },
    S: { Scale: "0", Text: "none" },
    G: { Scale: "0", Text: "none" },
  },
  "0": {
    DateStamp: "2026-09-02",
    TimeStamp: "07:04:00",
    R: { Scale: "0", Text: "none" },
    S: { Scale: "0", Text: "none" },
    G: { Scale: "0", Text: "none" },
  },
  "1": {
    DateStamp: "2026-09-03",
    TimeStamp: "00:00:00",
    R: { Scale: null, Text: null },
    S: { Scale: null, Text: null },
    G: { Scale: "4", Text: "severe" },
  },
});

export const noaaSolarWindFixture = noaaSolarWindSchema.parse([
  [
    "time_tag",
    "speed",
    "density",
    "temperature",
    "bx",
    "by",
    "bz",
    "bt",
    "vx",
    "vy",
    "vz",
    "propagated_time_tag",
  ],
  [
    "2026-09-02T06:57:00Z",
    null,
    3.74,
    83486,
    -2.19,
    3.65,
    null,
    4.29,
    -381.4,
    11.6,
    -6.2,
    "2026-09-02T07:55:10Z",
  ],
  [
    "2026-09-02T06:58:00Z",
    385,
    3.66,
    79410,
    -2.41,
    3.44,
    0,
    4,
    -385,
    13.8,
    -2.7,
    "2026-09-02T07:55:38Z",
  ],
]);
