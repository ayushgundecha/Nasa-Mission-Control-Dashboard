// @vitest-environment node

import { describe, expect, it } from "vitest";

import { CELESTRAK_CATALOG_LIMIT, celestrakCuration } from "./curation";
import { createCelestrakCatalogAdapter } from "./adapter";
import { celestrakOmmFixture, celestrakSixDigitFixture } from "./fixtures";
import { mapCelestrakOmm, reconcileCelestrakCatalog } from "./mapper";
import { celestrakOmmSchema } from "./schema";

const curation = celestrakCuration[0]!;
const context = {
  provider: "celestrak",
  providerLabel: "CelesTrak",
  dataset: "omm_stations",
  adapterVersion: "1.0.0",
  sourceUrl:
    "https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=JSON",
  fetchedAt: "2026-09-02T08:00:00.000Z",
};

describe("CelesTrak OMM catalog mapper", () => {
  it("maps OMM elements and explicitly labels derived orbit measures", () => {
    const record = mapCelestrakOmm(celestrakOmmFixture[0]!, curation, context);

    expect(record.upstreamRecordId).toBe("25544");
    expect(record.data).toMatchObject({ category: "stations" });
    expect(record.data.object).toMatchObject({
      id: "celestrak:25544",
      epoch: "2026-09-02T06:12:13.123Z",
      inclination: {
        value: 51.639,
        unit: "degrees",
        evidenceClass: "provider_observed",
      },
      rightAscensionOfAscendingNode: { value: 31.166, unit: "degrees" },
      period: { unit: "minutes", evidenceClass: "astraops_computed" },
      apogee: { unit: "km", evidenceClass: "astraops_computed" },
    });
    expect(record.data.object.period?.method).toContain(
      "not propagated telemetry",
    );
    expect(record.source.sourceUrl).toBe(context.sourceUrl);
  });

  it("preserves six-digit catalog identifiers without legacy TLE assumptions", () => {
    const record = mapCelestrakOmm(
      celestrakSixDigitFixture[0]!,
      curation,
      context,
    );
    expect(record.upstreamRecordId).toBe("270001");
    expect(record.data.object.catalogNumber).toBe("270001");
  });

  it("fails closed for malformed elements and unexpected provider fields", () => {
    expect(
      celestrakOmmSchema.safeParse([
        { ...celestrakOmmFixture[0], ECCENTRICITY: 1 },
      ]).success,
    ).toBe(false);
    expect(
      celestrakOmmSchema.safeParse([
        { ...celestrakOmmFixture[0], NEW_FIELD: "drift" },
      ]).success,
    ).toBe(false);
  });

  it("deduplicates on catalog number, retains the newest epoch, and enforces the cap", () => {
    const older = mapCelestrakOmm(celestrakOmmFixture[0]!, curation, context);
    const newer = mapCelestrakOmm(
      { ...celestrakOmmFixture[0]!, EPOCH: "2026-09-02T09:12:13.123456Z" },
      curation,
      context,
    );
    const sixDigit = mapCelestrakOmm(
      celestrakSixDigitFixture[0]!,
      curation,
      context,
    );
    const records = reconcileCelestrakCatalog([older, newer, sixDigit], 1);

    expect(records).toHaveLength(1);
    expect(
      reconcileCelestrakCatalog([older, newer], 10)[0]?.data.object.epoch,
    ).toBe("2026-09-02T09:12:13.123Z");
    expect(CELESTRAK_CATALOG_LIMIT).toBeLessThanOrEqual(100);
    expect(celestrakCuration.map((entry) => entry.group)).not.toContain(
      "active",
    );
  });

  it("uses a documented OMM JSON group query and makes refresh eligible only after two hours", () => {
    const adapter = createCelestrakCatalogAdapter({ curation });
    expect(adapter.request().url).toBe(
      "https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=JSON",
    );
    expect(adapter.freshness.currentForSeconds).toBe(7_200);
    expect(adapter.freshness.delayedForSeconds).toBe(14_400);
  });
});
