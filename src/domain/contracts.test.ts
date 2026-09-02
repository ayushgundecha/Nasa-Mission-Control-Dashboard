import { describe, expect, it } from "vitest";

import {
  launchSchema,
  missionEvaluationSchema,
  quantitySchema,
  sourceStampSchema,
} from "./contracts";
import {
  invalidFixtures,
  launchFixture,
  launchLibrarySourceFixture,
  missionEvaluationFixture,
} from "./__fixtures__/contracts.fixtures";

describe("AstraOps domain contracts", () => {
  it("accepts a provenance-complete launch", () => {
    expect(launchSchema.parse(launchFixture)).toEqual(launchFixture);
    expect(sourceStampSchema.parse(launchLibrarySourceFixture)).toEqual(
      launchLibrarySourceFixture,
    );
  });

  it("accepts an explainable mission evaluation", () => {
    expect(missionEvaluationSchema.parse(missionEvaluationFixture)).toEqual(
      missionEvaluationFixture,
    );
  });

  it("rejects timestamps that are not normalized to UTC", () => {
    expect(
      sourceStampSchema.safeParse(invalidFixtures.nonUtcSource).success,
    ).toBe(false);
  });

  it("requires a source for provider-observed values", () => {
    expect(
      quantitySchema.safeParse(invalidFixtures.missingExternalSource).success,
    ).toBe(false);
  });

  it("permanently classifies exoplanet work as research concept", () => {
    expect(
      missionEvaluationSchema.safeParse(
        invalidFixtures.exoplanetMarkedOperational,
      ).success,
    ).toBe(false);
  });

  it("fails closed when an upstream field bypasses normalization", () => {
    expect(
      launchSchema.safeParse(invalidFixtures.unknownLaunchField).success,
    ).toBe(false);
  });
});
