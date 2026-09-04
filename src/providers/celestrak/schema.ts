import { z } from "zod";

const finite = z.number().finite();
const catalogNumber = z.union([
  z.number().int().positive(),
  z.string().regex(/^\d{1,9}$/),
]);
const timestamp = z
  .string()
  .refine((value) => Number.isFinite(Date.parse(value)), {
    message: "Expected an ISO-compatible OMM epoch",
  });

/** CelesTrak GP JSON: OMM-compatible fields, never a legacy TLE boundary. */
export const celestrakOmmSchema = z
  .array(
    z
      .object({
        OBJECT_NAME: z.string().trim().min(1).max(180),
        OBJECT_ID: z.string().trim().min(1).max(24),
        EPOCH: timestamp,
        MEAN_MOTION: finite.positive(),
        ECCENTRICITY: finite.min(0).lt(1),
        INCLINATION: finite.min(0).max(180),
        RA_OF_ASC_NODE: finite.min(0).lte(360),
        ARG_OF_PERICENTER: finite.min(0).lte(360),
        MEAN_ANOMALY: finite.min(0).lte(360),
        BSTAR: finite,
        MEAN_MOTION_DOT: finite,
        MEAN_MOTION_DDOT: finite,
        NORAD_CAT_ID: catalogNumber,
        ELEMENT_SET_NO: finite.int().nonnegative(),
        REV_AT_EPOCH: finite.int().nonnegative(),
        EPHEMERIS_TYPE: finite.int().nonnegative(),
        CLASSIFICATION_TYPE: z.string().trim().min(1).max(8),
        OBJECT_TYPE: z.enum(["PAYLOAD", "ROCKET BODY", "DEBRIS", "UNKNOWN"]),
      })
      .strict(),
  )
  .max(5_000);

export type CelestrakOmm = z.infer<typeof celestrakOmmSchema>;
export type CelestrakOmmItem = CelestrakOmm[number];
