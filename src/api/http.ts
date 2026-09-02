import { randomUUID } from "node:crypto";

import { ZodError, type ZodType } from "zod";

import { publicErrorSchema, type PublicError } from "@/domain";

export const publicCacheHeaders = {
  "Cache-Control":
    "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
  "Content-Type": "application/json; charset=utf-8",
} as const;

export const healthCacheHeaders = {
  "Cache-Control":
    "public, max-age=15, s-maxage=60, stale-while-revalidate=120",
  "Content-Type": "application/json; charset=utf-8",
} as const;

function fieldErrors(error: ZodError): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "request";
    result[key] = [...(result[key] ?? []), issue.message];
  }
  return result;
}

export function queryObject(url: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of new URL(url).searchParams) result[key] = value;
  return result;
}

export function parseQuery<T>(schema: ZodType<T>, request: Request): T {
  return schema.parse(queryObject(request.url));
}

export function apiError(
  status: number,
  code: PublicError["error"]["code"],
  message: string,
  options: {
    recovery?: string | null;
    cause?: unknown;
  } = {},
): Response {
  const body = publicErrorSchema.parse({
    error: {
      code,
      message,
      recovery: options.recovery ?? null,
      correlationId: randomUUID(),
      fieldErrors:
        options.cause instanceof ZodError ? fieldErrors(options.cause) : null,
    },
  });
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function validatedJson<T>(
  schema: ZodType<T>,
  value: unknown,
  headers: HeadersInit = publicCacheHeaders,
): Response {
  return Response.json(schema.parse(value), { headers });
}

export function handleApiFailure(error: unknown): Response {
  if (error instanceof ZodError) {
    return apiError(400, "BAD_REQUEST", "The request parameters are invalid.", {
      recovery: "Correct the fields listed in fieldErrors and try again.",
      cause: error,
    });
  }
  return apiError(
    500,
    "INTERNAL_ERROR",
    "The request could not be completed.",
    {
      recovery:
        "Retry shortly. Use the correlation ID if the problem persists.",
    },
  );
}
