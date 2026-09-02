import { z } from "zod";

import {
  CONTRACT_VERSION,
  agencySchema,
  launchSchema,
  launchStatusSchema,
  publicErrorSchema,
  sourceStampSchema,
  utcInstantSchema,
  vehicleProfileSchema,
} from "@/domain";

export const launchesQuerySchema = z
  .object({
    query: z.string().trim().max(160).optional(),
    status: z
      .string()
      .transform((value) => value.split(",").filter(Boolean))
      .pipe(z.array(launchStatusSchema).max(10))
      .optional(),
    provider: z.string().trim().min(1).max(120).optional(),
    sort: z.enum(["name", "status", "window"]).default("window"),
    direction: z.enum(["asc", "desc"]).default("asc"),
    cursor: z
      .string()
      .min(1)
      .max(120)
      .refine((value) => {
        try {
          return /^v1:\d+$/.test(
            Buffer.from(value, "base64url").toString("utf8"),
          );
        } catch {
          return false;
        }
      }, "Cursor is invalid or expired")
      .optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
  })
  .strict();

const scheduleChangeSchema = z
  .object({
    id: z.string(),
    kind: z.enum(["cancelled", "rescheduled", "scrubbed"]),
    changedAt: utcInstantSchema,
    comment: z.string(),
    sourceUrl: z.string().url().nullable(),
  })
  .strict();

export const launchDetailSchema = z
  .object({
    launch: launchSchema,
    agency: agencySchema.nullable(),
    vehicle: vehicleProfileSchema.nullable(),
    mission: z
      .object({
        upstreamId: z.number().int(),
        name: z.string(),
        type: z.string().nullable(),
        orbitName: z.string().nullable(),
        orbitAbbreviation: z.string().nullable(),
        customerAgencyIds: z.array(z.string()),
      })
      .strict()
      .nullable(),
    media: z
      .object({
        image: z
          .object({
            url: z.string().url(),
            thumbnailUrl: z.string().url().nullable(),
            credit: z.string().nullable(),
            licenseName: z.string().nullable(),
            licenseUrl: z.string().url().nullable(),
          })
          .strict()
          .nullable(),
        informationUrls: z.array(
          z
            .object({
              url: z.string().url(),
              title: z.string().nullable(),
              source: z.string().nullable(),
              type: z.string().nullable(),
            })
            .strict(),
        ),
        webcastUrls: z.array(
          z
            .object({
              url: z.string().url(),
              title: z.string().nullable(),
              publisher: z.string().nullable(),
              type: z.string().nullable(),
            })
            .strict(),
        ),
        webcastLive: z.boolean(),
      })
      .strict(),
    scheduleChanges: z.array(scheduleChangeSchema),
  })
  .strict();

const sourceSummarySchema = z
  .object({
    provider: z.string(),
    dataset: z.string(),
    freshness: z.enum(["live", "current", "delayed", "stale", "unavailable"]),
    fetchedAt: utcInstantSchema.nullable(),
  })
  .strict();

const interpretationSchema = z
  .object({
    band: z.enum([
      "elevated",
      "extreme",
      "minor",
      "moderate",
      "quiet",
      "severe",
      "strong",
      "unknown",
    ]),
    noaaScale: z.enum(["G0", "G1", "G2", "G3", "G4", "G5"]).nullable(),
    label: z.string(),
    operationalContext: z.string(),
    thresholdSourceUrl: z.string().url(),
  })
  .strict();

const kpMeasurementSchema = z
  .object({
    id: z.string(),
    validAt: utcInstantSchema,
    kp: z.number().min(0).max(9).nullable(),
    noaaScale: z.string().nullable(),
    evidenceMode: z.enum(["observed", "estimated", "predicted"]),
    interpretation: interpretationSchema,
    source: sourceStampSchema,
  })
  .strict();

const scaleValueSchema = z
  .object({
    scale: z.number().int().min(0).max(5).nullable(),
    text: z.string().nullable(),
  })
  .strict();

const scaleSnapshotSchema = z
  .object({
    id: z.string(),
    validAt: utcInstantSchema,
    period: z.enum([
      "current",
      "previous_day",
      "forecast_day_1",
      "forecast_day_2",
      "forecast_day_3",
    ]),
    evidenceMode: z.enum(["observed", "predicted"]),
    radioBlackout: scaleValueSchema,
    solarRadiation: scaleValueSchema,
    geomagneticStorm: scaleValueSchema,
    source: sourceStampSchema,
  })
  .strict();

const solarWindSchema = z
  .object({
    id: z.string(),
    observedAt: utcInstantSchema,
    speedKilometersPerSecond: z.number().nonnegative().nullable(),
    totalMagneticFieldNanotesla: z.number().nonnegative().nullable(),
    bzGsmNanotesla: z.number().nullable(),
    evidenceMode: z.literal("observed"),
    source: sourceStampSchema,
  })
  .strict();

const donkiEventSchema = z
  .object({
    id: z.string(),
    eventType: z.enum(["cme", "flare", "geomagnetic_storm", "notification"]),
    startedAt: utcInstantSchema,
    peakAt: utcInstantSchema.nullable(),
    submittedAt: utcInstantSchema.nullable(),
    classType: z.string().nullable(),
    sourceLocation: z.string().nullable(),
    summary: z.string().nullable(),
    measurements: z.array(
      z
        .object({
          observedAt: utcInstantSchema,
          name: z.enum(["cme_speed", "kp"]),
          value: z.number(),
          unit: z.enum(["km_per_s", "unitless"]),
        })
        .strict(),
    ),
    evidenceMode: z.literal("analyst_event"),
    source: sourceStampSchema,
  })
  .strict();

export const spaceWeatherBriefingSchema = z
  .object({
    currentKp: kpMeasurementSchema.nullable(),
    recentKp: z.array(kpMeasurementSchema),
    forecastKp: z.array(kpMeasurementSchema),
    scales: scaleSnapshotSchema.nullable(),
    solarWind: z
      .object({
        speed: solarWindSchema.nullable(),
        magneticField: solarWindSchema.nullable(),
        history: z.array(solarWindSchema).max(60),
      })
      .strict(),
    recentEvents: z.array(donkiEventSchema),
    availability: z
      .object({
        noaa: z.enum(["available", "unavailable"]),
        donki: z.enum(["available", "unavailable"]),
      })
      .strict(),
    warnings: z.array(z.string()),
  })
  .strict();

const envelopeFields = {
  contractVersion: z.literal(CONTRACT_VERSION),
  generatedAt: utcInstantSchema,
  partial: z.boolean(),
  warnings: z.array(z.string().min(1).max(500)),
  sources: z.array(sourceSummarySchema),
} as const;

export const launchesResponseSchema = z
  .object({
    ...envelopeFields,
    data: z.array(launchSchema),
    page: z
      .object({
        nextCursor: z.string().nullable(),
        hasNextPage: z.boolean(),
        returned: z.number().int().nonnegative(),
        total: z.number().int().nonnegative(),
      })
      .strict(),
  })
  .strict();

export const launchDetailResponseSchema = z
  .object({ ...envelopeFields, data: launchDetailSchema })
  .strict();

export const spaceWeatherResponseSchema = z
  .object({ ...envelopeFields, data: spaceWeatherBriefingSchema })
  .strict();

export const overviewResponseSchema = z
  .object({
    ...envelopeFields,
    data: z
      .object({
        nextLaunches: z.array(launchSchema).max(5),
        launchCount: z.number().int().nonnegative(),
        spaceWeather: spaceWeatherBriefingSchema,
      })
      .strict(),
  })
  .strict();

export const healthResponseSchema = z
  .object({
    ...envelopeFields,
    data: z.array(
      z
        .object({
          provider: z.string(),
          dataset: z.string(),
          state: z.enum(["idle", "refreshing", "succeeded", "failed"]),
          freshness: z.enum([
            "live",
            "current",
            "delayed",
            "stale",
            "unavailable",
          ]),
          lastSucceededAt: utcInstantSchema.nullable(),
          lastFailedAt: utcInstantSchema.nullable(),
          recordsWritten: z.number().int().nonnegative(),
          consecutiveFailures: z.number().int().nonnegative(),
          nextEligibleRefreshAt: utcInstantSchema.nullable(),
          error: z
            .object({
              code: z.string(),
              message: z.string(),
              retryable: z.boolean(),
            })
            .strict()
            .nullable(),
        })
        .strict(),
    ),
  })
  .strict();

export { publicErrorSchema, sourceStampSchema };
export type LaunchesQuery = z.infer<typeof launchesQuerySchema>;
export type LaunchDetail = z.infer<typeof launchDetailSchema>;
