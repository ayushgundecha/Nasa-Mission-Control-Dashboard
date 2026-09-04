// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
  readFixtureApproachFeed,
  readFixtureOrbitWatchCatalog,
} from "./orbit-watch-data";

describe("environment fixture presentation data", () => {
  it("builds a bounded, category-diverse, schema-validated orbit catalog", () => {
    const catalog = readFixtureOrbitWatchCatalog();
    expect(catalog).toHaveLength(8);
    expect(
      new Set(catalog.map((entry) => entry.object.catalogNumber)).size,
    ).toBe(8);
    expect(new Set(catalog.map((entry) => entry.category))).toEqual(
      new Set([
        "stations",
        "science_weather",
        "navigation",
        "commercial_communications",
      ]),
    );
    expect(
      catalog.every((entry) => entry.object.source.provider === "celestrak"),
    ).toBe(true);
  });

  it("retains both known and unknown size states in the approach feed", () => {
    const feed = readFixtureApproachFeed();
    expect(feed).toHaveLength(2);
    expect(feed.some(({ approach }) => approach.diameter !== null)).toBe(true);
    expect(feed.some(({ approach }) => approach.diameter === null)).toBe(true);
    expect(
      feed.every(({ approach }) => approach.closeApproachTimeScale === "TDB"),
    ).toBe(true);
  });
});
