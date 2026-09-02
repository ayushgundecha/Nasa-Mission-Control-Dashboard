import "server-only";

import { z } from "zod";

const serverEnvironmentSchema = z
  .object({
    ASTRAOPS_DATA_MODE: z.enum(["fixture", "live"]).default("fixture"),
    DATABASE_URL: z.string().min(1).optional(),
    SITE_URL: z.string().url().default("http://localhost:3000"),
    CRON_SECRET: z.string().min(24).optional(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  })
  .superRefine((environment, context) => {
    if (
      environment.ASTRAOPS_DATA_MODE === "live" &&
      !environment.DATABASE_URL
    ) {
      context.addIssue({
        code: "custom",
        message: "DATABASE_URL is required when ASTRAOPS_DATA_MODE=live",
        path: ["DATABASE_URL"],
      });
    }

    if (
      environment.NODE_ENV === "production" &&
      environment.ASTRAOPS_DATA_MODE === "live" &&
      !environment.CRON_SECRET
    ) {
      context.addIssue({
        code: "custom",
        message: "CRON_SECRET is required for live production reconciliation",
        path: ["CRON_SECRET"],
      });
    }
  });

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

let cachedEnvironment: ServerEnvironment | undefined;

export function getServerEnvironment(): ServerEnvironment {
  if (cachedEnvironment) return cachedEnvironment;

  const result = serverEnvironmentSchema.safeParse({
    ASTRAOPS_DATA_MODE: process.env.ASTRAOPS_DATA_MODE,
    DATABASE_URL: process.env.DATABASE_URL,
    SITE_URL: process.env.SITE_URL,
    CRON_SECRET: process.env.CRON_SECRET,
    NODE_ENV: process.env.NODE_ENV,
  });

  if (!result.success) {
    const details = result.error.issues
      .map(
        (issue) => `${issue.path.join(".") || "environment"}: ${issue.message}`,
      )
      .join("; ");
    throw new Error(
      `Invalid AstraOps environment — ${details}. See .env.example.`,
    );
  }

  cachedEnvironment = result.data;
  return cachedEnvironment;
}

export function resetEnvironmentForTests(): void {
  cachedEnvironment = undefined;
}
