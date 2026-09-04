import { JPL_CAD_FIELDS, jplCadPayloadSchema } from "./schema";

export const jplCadKnownFixture = jplCadPayloadSchema.parse({
  signature: {
    source: "NASA/JPL SBDB Close Approach Data API",
    version: "1.5",
  },
  count: 1,
  total: 1,
  fields: [...JPL_CAD_FIELDS],
  data: [
    [
      "99942",
      "206",
      "2462240.407091595",
      "2029-Apr-13 21:46",
      "0.000254099098170977",
      "0.000254085852623379",
      "0.000254112343772133",
      "7.42249308586014",
      "5.84135545611464",
      "< 00:01",
      "19.7",
      "0.34",
      "0.04",
      " 99942 Apophis (2004 MN4) ",
    ],
  ],
});

export const jplCadUnknownFixture = jplCadPayloadSchema.parse({
  signature: {
    source: "NASA/JPL SBDB Close Approach Data API",
    version: "1.5",
  },
  count: 1,
  fields: [...JPL_CAD_FIELDS],
  data: [
    [
      "2001 AV43",
      "42",
      "2462452.142037054",
      "2029-Nov-11 15:25",
      "0.00209271674918052",
      "0.00209125158265035",
      "0.00209418316351851",
      "3.99789389003422",
      "3.66561381185116",
      "00:03",
      "24.6",
      null,
      null,
      "       (2001 AV43)",
    ],
  ],
});

/**
 * Deterministic product-demo feed anchored to the global 2026-09-02 fixture
 * clock. These synthetic rows intentionally avoid assigning invented encounter
 * dates to real small bodies while exercising known and unknown size states.
 */
export const jplCadApproachFeedFixture = jplCadPayloadSchema.parse({
  signature: {
    source: "NASA/JPL SBDB Close Approach Data API",
    version: "1.5",
  },
  count: 2,
  total: 2,
  fields: [...JPL_CAD_FIELDS],
  data: [
    [
      "ASTRA-DEMO-A",
      "fixture-1",
      "2461304.000000000",
      "2026-Sep-20 12:00",
      "0.0125000000000000",
      "0.0124000000000000",
      "0.0126000000000000",
      "8.25000000000000",
      "7.90000000000000",
      "00:04",
      "22.1",
      "0.18",
      "0.03",
      " AstraOps fixture object A ",
    ],
    [
      "ASTRA-DEMO-B",
      "fixture-2",
      "2461325.142361111",
      "2026-Oct-11 15:25",
      "0.0200000000000000",
      "0.0195000000000000",
      "0.0205000000000000",
      "4.10000000000000",
      "3.75000000000000",
      "00:09",
      "25.4",
      null,
      null,
      " AstraOps fixture object B ",
    ],
  ],
});

export const jplCadEmptyFixture = jplCadPayloadSchema.parse({
  signature: {
    source: "NASA/JPL SBDB Close Approach Data API",
    version: "1.5",
  },
  count: 0,
});
