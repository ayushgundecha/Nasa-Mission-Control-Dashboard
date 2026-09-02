import { z } from "zod";

export const CONTRACT_VERSION = "1.1.0" as const;

const finiteNumber = z.number().finite();
const nonNegativeNumber = finiteNumber.nonnegative();
const positiveNumber = finiteNumber.positive();

/** UTC instants are serialized at API boundaries with a trailing Z. */
export const utcInstantSchema = z
  .string()
  .datetime({ offset: true })
  .refine(
    (value) => value.endsWith("Z"),
    "Timestamp must be normalized to UTC with a trailing Z",
  );

export const entityIdSchema = z
  .string()
  .min(3)
  .max(180)
  .regex(
    /^[a-z][a-z0-9_-]*:[A-Za-z0-9._~-]+$/,
    "ID must use namespace:value format",
  );

export const providerIdSchema = z
  .string()
  .min(2)
  .max(48)
  .regex(/^[a-z][a-z0-9_-]+$/);

export const freshnessStateSchema = z.enum([
  "live",
  "current",
  "delayed",
  "stale",
  "unavailable",
]);
export type FreshnessState = z.infer<typeof freshnessStateSchema>;

export const freshnessSchema = z
  .object({
    state: freshnessStateSchema,
    ageSeconds: nonNegativeNumber.nullable(),
    staleAfterSeconds: positiveNumber,
    reason: z.string().min(1).max(240).nullable(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.state === "unavailable" && value.reason === null) {
      context.addIssue({
        code: "custom",
        message: "Unavailable data requires a reason",
        path: ["reason"],
      });
    }
    if (value.state !== "unavailable" && value.ageSeconds === null) {
      context.addIssue({
        code: "custom",
        message: "Available data requires an age",
        path: ["ageSeconds"],
      });
    }
  });

export const sourceStampSchema = z
  .object({
    provider: providerIdSchema,
    providerLabel: z.string().min(1).max(100),
    upstreamRecordId: z.string().min(1).max(300).nullable(),
    sourceUrl: z.string().url(),
    observedAt: utcInstantSchema.nullable(),
    fetchedAt: utcInstantSchema,
    upstreamVersion: z.string().min(1).max(120).nullable(),
    adapterVersion: z.string().min(1).max(32),
    freshness: freshnessSchema,
  })
  .strict();
export type SourceStamp = z.infer<typeof sourceStampSchema>;

export const evidenceClassSchema = z.enum([
  "provider_observed",
  "authoritative_computed",
  "astraops_computed",
  "user_assumed",
]);
export type EvidenceClass = z.infer<typeof evidenceClassSchema>;

export const unitSchema = z.enum([
  "unitless",
  "percent",
  "count",
  "kg",
  "m",
  "km",
  "au",
  "lunar_distance",
  "km_per_s",
  "m_per_s",
  "m_per_s2",
  "degrees",
  "revolutions_per_day",
  "minutes",
  "hours",
  "days",
  "years",
  "kelvin",
  "nanotesla",
  "particles_per_cm3",
  "watts_per_m2",
]);
export type Unit = z.infer<typeof unitSchema>;

export const quantitySchema = z
  .object({
    value: finiteNumber,
    unit: unitSchema,
    evidenceClass: evidenceClassSchema,
    source: sourceStampSchema.nullable(),
    method: z.string().min(1).max(160).nullable(),
    uncertainty: z
      .object({
        lower: finiteNumber,
        upper: finiteNumber,
        confidenceLabel: z.string().min(1).max(80),
      })
      .strict()
      .nullable(),
  })
  .strict()
  .superRefine((value, context) => {
    const isExternal =
      value.evidenceClass === "provider_observed" ||
      value.evidenceClass === "authoritative_computed";
    if (isExternal && value.source === null) {
      context.addIssue({
        code: "custom",
        message: "External evidence requires a source",
        path: ["source"],
      });
    }
    if (value.evidenceClass === "astraops_computed" && value.method === null) {
      context.addIssue({
        code: "custom",
        message: "AstraOps computations require a method",
        path: ["method"],
      });
    }
    if (
      value.uncertainty &&
      value.uncertainty.lower > value.uncertainty.upper
    ) {
      context.addIssue({
        code: "custom",
        message: "Uncertainty lower bound exceeds upper bound",
        path: ["uncertainty"],
      });
    }
  });
export type Quantity = z.infer<typeof quantitySchema>;

export const timePrecisionSchema = z.enum([
  "second",
  "minute",
  "hour",
  "day",
  "window",
  "unknown",
]);
export type TimePrecision = z.infer<typeof timePrecisionSchema>;

export const timeWindowSchema = z
  .object({
    start: utcInstantSchema,
    end: utcInstantSchema,
    precision: timePrecisionSchema,
  })
  .strict()
  .refine((value) => Date.parse(value.start) <= Date.parse(value.end), {
    message: "Time window start must not be after end",
    path: ["end"],
  });

export const geoPointSchema = z
  .object({
    latitudeDegrees: finiteNumber.min(-90).max(90),
    longitudeDegrees: finiteNumber.min(-180).max(180),
  })
  .strict();

export const agencySchema = z
  .object({
    id: entityIdSchema,
    name: z.string().min(1).max(180),
    abbreviation: z.string().min(1).max(32).nullable(),
    type: z.enum([
      "commercial",
      "government",
      "multinational",
      "academic",
      "unknown",
    ]),
    countryCodes: z.array(z.string().length(2)).max(24),
    websiteUrl: z.string().url().nullable(),
    source: sourceStampSchema,
  })
  .strict();
export type Agency = z.infer<typeof agencySchema>;

export const vehicleProfileSchema = z
  .object({
    id: entityIdSchema,
    name: z.string().min(1).max(180),
    family: z.string().min(1).max(120).nullable(),
    manufacturerAgencyId: entityIdSchema.nullable(),
    status: z.enum(["active", "development", "retired", "unknown"]),
    payloadToLeo: quantitySchema.nullable(),
    height: quantitySchema.nullable(),
    reusable: z.boolean().nullable(),
    source: sourceStampSchema,
  })
  .strict();
export type VehicleProfile = z.infer<typeof vehicleProfileSchema>;

export const launchStatusSchema = z.enum([
  "scheduled",
  "go",
  "hold",
  "scrubbed",
  "in_flight",
  "success",
  "partial_failure",
  "failure",
  "cancelled",
  "unknown",
]);
export type LaunchStatus = z.infer<typeof launchStatusSchema>;

export const launchSchema = z
  .object({
    id: entityIdSchema,
    name: z.string().min(1).max(240),
    slug: z.string().min(1).max(240),
    status: launchStatusSchema,
    window: timeWindowSchema,
    launchServiceProviderId: entityIdSchema.nullable(),
    vehicleId: entityIdSchema.nullable(),
    missionDescription: z.string().min(1).max(8_000).nullable(),
    pad: z
      .object({
        name: z.string().min(1).max(240),
        locationName: z.string().min(1).max(240),
        position: geoPointSchema.nullable(),
      })
      .strict()
      .nullable(),
    webcastUrl: z.string().url().nullable(),
    imageUrl: z.string().url().nullable(),
    source: sourceStampSchema,
  })
  .strict();
export type Launch = z.infer<typeof launchSchema>;

export const orbitalObjectSchema = z
  .object({
    id: entityIdSchema,
    catalogNumber: z.string().min(1).max(24),
    name: z.string().min(1).max(180),
    objectType: z.enum(["payload", "rocket_body", "debris", "unknown"]),
    internationalDesignator: z.string().min(1).max(24).nullable(),
    epoch: utcInstantSchema,
    inclination: quantitySchema,
    eccentricity: quantitySchema,
    meanMotionRevolutionsPerDay: quantitySchema,
    period: quantitySchema.nullable(),
    apogee: quantitySchema.nullable(),
    perigee: quantitySchema.nullable(),
    curatedReason: z.string().min(1).max(300),
    source: sourceStampSchema,
  })
  .strict();
export type OrbitalObject = z.infer<typeof orbitalObjectSchema>;

export const nearEarthApproachSchema = z
  .object({
    id: entityIdSchema,
    designation: z.string().min(1).max(80),
    objectName: z.string().min(1).max(180).nullable(),
    closeApproachAt: utcInstantSchema,
    nominalDistance: quantitySchema,
    minimumDistance: quantitySchema.nullable(),
    relativeVelocity: quantitySchema,
    absoluteMagnitude: quantitySchema.nullable(),
    potentiallyHazardous: z.boolean().nullable(),
    orbitConditionCode: z.string().min(1).max(12).nullable(),
    source: sourceStampSchema,
  })
  .strict();
export type NearEarthApproach = z.infer<typeof nearEarthApproachSchema>;

export const spaceWeatherLevelSchema = z.enum([
  "none",
  "minor",
  "moderate",
  "strong",
  "severe",
  "extreme",
  "unknown",
]);

export const spaceWeatherSnapshotSchema = z
  .object({
    id: entityIdSchema,
    validAt: utcInstantSchema,
    summary: z.string().min(1).max(800),
    geomagneticLevel: spaceWeatherLevelSchema,
    solarRadiationLevel: spaceWeatherLevelSchema,
    radioBlackoutLevel: spaceWeatherLevelSchema,
    solarWindSpeed: quantitySchema.nullable(),
    interplanetaryMagneticField: quantitySchema.nullable(),
    activeEventIds: z.array(entityIdSchema).max(200),
    source: sourceStampSchema,
  })
  .strict();
export type SpaceWeatherSnapshot = z.infer<typeof spaceWeatherSnapshotSchema>;

export const celestialTargetSchema = z
  .object({
    id: entityIdSchema,
    name: z.string().min(1).max(180),
    targetClass: z.enum(["earth_orbit", "moon", "mars", "exoplanet"]),
    parentSystem: z.string().min(1).max(180).nullable(),
    distance: quantitySchema.nullable(),
    orbitalPeriod: quantitySchema.nullable(),
    equilibriumTemperature: quantitySchema.nullable(),
    disposition: z.string().min(1).max(120).nullable(),
    source: sourceStampSchema,
  })
  .strict();
export type CelestialTarget = z.infer<typeof celestialTargetSchema>;

export const missionInputSchema = z
  .object({
    contractVersion: z.literal(CONTRACT_VERSION),
    title: z.string().min(3).max(120),
    objective: z.string().min(10).max(1_000),
    targetId: entityIdSchema,
    targetClass: z.enum(["earth_orbit", "moon", "mars", "exoplanet"]),
    departureWindow: timeWindowSchema.nullable(),
    payloadMass: quantitySchema,
    vehicleId: entityIdSchema.nullable(),
    assumptions: z.array(
      z
        .object({
          key: z.string().min(1).max(80),
          label: z.string().min(1).max(120),
          value: quantitySchema,
          rationale: z.string().min(1).max(600),
        })
        .strict(),
    ),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.payloadMass.unit !== "kg") {
      context.addIssue({
        code: "custom",
        message: "Payload mass must use kg",
        path: ["payloadMass", "unit"],
      });
    }
    if (value.payloadMass.evidenceClass !== "user_assumed") {
      context.addIssue({
        code: "custom",
        message: "Planner payload mass must be explicitly user-assumed",
        path: ["payloadMass", "evidenceClass"],
      });
    }
  });
export type MissionInput = z.infer<typeof missionInputSchema>;

export const evaluationFindingSchema = z
  .object({
    code: z
      .string()
      .min(2)
      .max(80)
      .regex(/^[A-Z][A-Z0-9_]+$/),
    severity: z.enum(["info", "warning", "hard_constraint"]),
    title: z.string().min(1).max(160),
    explanation: z.string().min(1).max(1_200),
    recovery: z.string().min(1).max(600).nullable(),
    relatedInputKeys: z.array(z.string().min(1).max(80)).max(20),
  })
  .strict();

export const missionEvaluationSchema = z
  .object({
    id: entityIdSchema,
    contractVersion: z.literal(CONTRACT_VERSION),
    calculationVersion: z.string().min(1).max(32),
    classification: z.enum([
      "operational_estimate",
      "research_concept_not_flight_ready",
    ]),
    evaluatedAt: utcInstantSchema,
    input: missionInputSchema,
    outputs: z
      .object({
        estimatedDuration: quantitySchema.nullable(),
        estimatedDeltaV: quantitySchema.nullable(),
        payloadMargin: quantitySchema.nullable(),
      })
      .strict(),
    findings: z.array(evaluationFindingSchema).max(100),
    evidenceSourceIds: z.array(entityIdSchema).max(500),
  })
  .strict()
  .superRefine((value, context) => {
    const mustBeConcept = value.input.targetClass === "exoplanet";
    if (
      mustBeConcept &&
      value.classification !== "research_concept_not_flight_ready"
    ) {
      context.addIssue({
        code: "custom",
        message: "Exoplanet evaluations must remain research concepts",
        path: ["classification"],
      });
    }
  });
export type MissionEvaluation = z.infer<typeof missionEvaluationSchema>;

export const providerErrorCodeSchema = z.enum([
  "PROVIDER_TIMEOUT",
  "PROVIDER_RATE_LIMITED",
  "PROVIDER_UNAVAILABLE",
  "PROVIDER_AUTH_FAILED",
  "PROVIDER_SCHEMA_DRIFT",
  "PROVIDER_INVALID_RESPONSE",
  "REFRESH_LEASE_CONFLICT",
  "NO_LAST_KNOWN_GOOD_DATA",
  "INTERNAL_ERROR",
]);

export const providerErrorSchema = z
  .object({
    code: providerErrorCodeSchema,
    provider: providerIdSchema,
    message: z.string().min(1).max(500),
    retryable: z.boolean(),
    retryAfterSeconds: nonNegativeNumber.nullable(),
    occurredAt: utcInstantSchema,
    correlationId: z.string().uuid(),
    cause: z.string().min(1).max(500).nullable(),
  })
  .strict();
export type ProviderError = z.infer<typeof providerErrorSchema>;

export const publicErrorCodeSchema = z.enum([
  "BAD_REQUEST",
  "NOT_FOUND",
  "CONFLICT",
  "RATE_LIMITED",
  "UPSTREAM_UNAVAILABLE",
  "INTERNAL_ERROR",
]);

export const publicErrorSchema = z
  .object({
    error: z
      .object({
        code: publicErrorCodeSchema,
        message: z.string().min(1).max(500),
        recovery: z.string().min(1).max(500).nullable(),
        correlationId: z.string().uuid(),
        fieldErrors: z
          .record(z.string(), z.array(z.string().min(1)))
          .nullable(),
      })
      .strict(),
  })
  .strict();
export type PublicError = z.infer<typeof publicErrorSchema>;

export const sortDirectionSchema = z.enum(["asc", "desc"]);

export const pageRequestSchema = z
  .object({
    cursor: z.string().min(1).max(500).nullable().default(null),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    sort: z.string().min(1).max(80).nullable().default(null),
    direction: sortDirectionSchema.default("asc"),
    query: z.string().trim().max(160).nullable().default(null),
    freshness: z.array(freshnessStateSchema).max(5).default([]),
  })
  .strict();
export type PageRequest = z.infer<typeof pageRequestSchema>;

export const pageInfoSchema = z
  .object({
    nextCursor: z.string().min(1).max(500).nullable(),
    hasNextPage: z.boolean(),
    returned: z.number().int().nonnegative(),
  })
  .strict();

export const paginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z
    .object({
      contractVersion: z.literal(CONTRACT_VERSION),
      data: z.array(itemSchema),
      page: pageInfoSchema,
      generatedAt: utcInstantSchema,
      partial: z.boolean(),
      warnings: z.array(z.string().min(1).max(500)),
    })
    .strict();

export const launchPageSchema = paginatedResponseSchema(launchSchema);

/** Parse provider/public boundaries; callers must map failures to schema-drift errors. */
export function parseContract<T>(schema: z.ZodType<T>, input: unknown): T {
  return schema.parse(input);
}
