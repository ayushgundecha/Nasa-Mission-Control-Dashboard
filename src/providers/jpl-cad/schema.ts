import { z } from "zod";

export const JPL_CAD_VERSION = "1.5" as const;

export const JPL_CAD_FIELDS = [
  "des",
  "orbit_id",
  "jd",
  "cd",
  "dist",
  "dist_min",
  "dist_max",
  "v_rel",
  "v_inf",
  "t_sigma_f",
  "h",
  "diameter",
  "diameter_sigma",
  "fullname",
] as const;

const cell = z.string().nullable();

export const jplCadPayloadSchema = z
  .object({
    signature: z
      .object({
        source: z.literal("NASA/JPL SBDB Close Approach Data API"),
        version: z.literal(JPL_CAD_VERSION),
      })
      .strict(),
    count: z.number().int().nonnegative().max(100),
    total: z.number().int().nonnegative().optional(),
    fields: z.array(z.string()).optional(),
    data: z
      .array(z.array(cell).length(JPL_CAD_FIELDS.length))
      .max(100)
      .optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.count === 0) {
      if ((value.data?.length ?? 0) !== 0) {
        context.addIssue({
          code: "custom",
          message: "Zero-count response cannot contain records",
          path: ["data"],
        });
      }
      return;
    }
    if (!value.fields || !value.data) {
      context.addIssue({
        code: "custom",
        message: "Non-empty response requires fields and data",
        path: ["fields"],
      });
      return;
    }
    if (
      value.fields.length !== JPL_CAD_FIELDS.length ||
      value.fields.some((field, index) => field !== JPL_CAD_FIELDS[index])
    ) {
      context.addIssue({
        code: "custom",
        message: "JPL CAD field order/version drift detected",
        path: ["fields"],
      });
    }
    if (value.count !== value.data.length) {
      context.addIssue({
        code: "custom",
        message: "JPL CAD count does not match returned records",
        path: ["count"],
      });
    }
  });

export type JplCadPayload = z.infer<typeof jplCadPayloadSchema>;
export type JplCadRow = NonNullable<JplCadPayload["data"]>[number];
