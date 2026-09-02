import { z } from "zod";

const timestamp = z
  .string()
  .refine((value) => Number.isFinite(Date.parse(value)), {
    message: "Expected an ISO-compatible timestamp",
  });
const nullableTimestamp = timestamp.nullable();

const kpIndexSchema = z.object({
  observedTime: timestamp,
  kpIndex: z.number().min(0).max(9),
  source: z.string().nullable().optional(),
});

export const donkiFlareSchema = z.array(
  z.object({
    flrID: z.string().min(1),
    beginTime: timestamp,
    peakTime: nullableTimestamp,
    endTime: nullableTimestamp,
    classType: z.string().nullable(),
    sourceLocation: z.string().nullable(),
    note: z.string().nullable(),
    submissionTime: nullableTimestamp,
    link: z.url(),
  }),
);

export const donkiCmeSchema = z.array(
  z.object({
    activityID: z.string().min(1),
    startTime: timestamp,
    sourceLocation: z.string().nullable(),
    note: z.string().nullable(),
    submissionTime: nullableTimestamp,
    link: z.url(),
    cmeAnalyses: z
      .array(
        z.object({
          time21_5: nullableTimestamp.optional(),
          speed: z.number().nonnegative().nullable(),
          isMostAccurate: z.boolean(),
          note: z.string().nullable().optional(),
        }),
      )
      .nullable(),
  }),
);

export const donkiGeomagneticStormSchema = z.array(
  z.object({
    gstID: z.string().min(1),
    startTime: timestamp,
    allKpIndex: z.array(kpIndexSchema),
    submissionTime: nullableTimestamp,
    link: z.url(),
  }),
);

export const donkiNotificationSchema = z.array(
  z.object({
    messageType: z.string().min(1),
    messageID: z.string().min(1),
    messageURL: z.url(),
    messageIssueTime: timestamp,
    messageBody: z.string().nullable(),
  }),
);

export type DonkiFlarePayload = z.infer<typeof donkiFlareSchema>;
export type DonkiCmePayload = z.infer<typeof donkiCmeSchema>;
export type DonkiGeomagneticStormPayload = z.infer<
  typeof donkiGeomagneticStormSchema
>;
export type DonkiNotificationPayload = z.infer<typeof donkiNotificationSchema>;
