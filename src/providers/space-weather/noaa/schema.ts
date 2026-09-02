import { z } from "zod";

const noaaTimestamp = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z?$/);

export const noaaKpForecastSchema = z.array(
  z.object({
    time_tag: noaaTimestamp,
    kp: z.number().min(0).max(9).nullable(),
    observed: z.enum(["observed", "estimated", "predicted"]),
    noaa_scale: z.string().nullable(),
  }),
);

const scaleValueSchema = z.object({
  Scale: z.string().nullable(),
  Text: z.string().nullable(),
});

export const noaaScalesSchema = z.record(
  z.string(),
  z.object({
    DateStamp: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    TimeStamp: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
    R: scaleValueSchema,
    S: scaleValueSchema,
    G: scaleValueSchema,
  }),
);

const solarWindNumber = z.number().nullable();

const noaaSolarWindHeaderSchema = z.tuple([
  z.literal("time_tag"),
  z.literal("speed"),
  z.literal("density"),
  z.literal("temperature"),
  z.literal("bx"),
  z.literal("by"),
  z.literal("bz"),
  z.literal("bt"),
  z.literal("vx"),
  z.literal("vy"),
  z.literal("vz"),
  z.literal("propagated_time_tag"),
]);

const noaaSolarWindRowSchema = z.tuple([
  noaaTimestamp,
  solarWindNumber,
  solarWindNumber,
  solarWindNumber,
  solarWindNumber,
  solarWindNumber,
  solarWindNumber,
  solarWindNumber,
  solarWindNumber,
  solarWindNumber,
  solarWindNumber,
  noaaTimestamp,
]);

export const noaaSolarWindSchema = z
  .tuple([noaaSolarWindHeaderSchema])
  .rest(noaaSolarWindRowSchema);

export type NoaaKpForecast = z.infer<typeof noaaKpForecastSchema>;
export type NoaaScales = z.infer<typeof noaaScalesSchema>;
export type NoaaSolarWind = z.infer<typeof noaaSolarWindSchema>;
