import type { ProviderFailure, SafeProviderErrorCode } from "./types";

const PUBLIC_MESSAGES: Record<SafeProviderErrorCode, string> = {
  empty_payload: "Provider returned no usable records.",
  internal: "Provider refresh could not be completed.",
  network: "Provider could not be reached.",
  rate_limited: "Provider temporarily limited refresh requests.",
  timeout: "Provider did not respond before the refresh deadline.",
  upstream_rejected: "Provider rejected the refresh request.",
  validation: "Provider response did not match the expected contract.",
};

export class ProviderRefreshError extends Error {
  readonly code: SafeProviderErrorCode;
  readonly retryable: boolean;
  readonly retryAfterMs: number | null;

  constructor(
    code: SafeProviderErrorCode,
    options: {
      retryable: boolean;
      retryAfterMs?: number | null;
      cause?: unknown;
    },
  ) {
    super(PUBLIC_MESSAGES[code], { cause: options.cause });
    this.name = "ProviderRefreshError";
    this.code = code;
    this.retryable = options.retryable;
    this.retryAfterMs = options.retryAfterMs ?? null;
  }
}

export function toProviderFailure(error: unknown): ProviderFailure {
  if (error instanceof ProviderRefreshError) {
    return {
      code: error.code,
      message: PUBLIC_MESSAGES[error.code],
      retryable: error.retryable,
      retryAfterMs: error.retryAfterMs,
    };
  }

  if (error instanceof Error && error.name === "AbortError") {
    return {
      code: "timeout",
      message: PUBLIC_MESSAGES.timeout,
      retryable: true,
      retryAfterMs: null,
    };
  }

  return {
    code: "internal",
    message: PUBLIC_MESSAGES.internal,
    retryable: false,
    retryAfterMs: null,
  };
}

export function parseRetryAfter(
  value: string | null,
  now: Date,
): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;

  const date = Date.parse(value);
  if (!Number.isFinite(date)) return null;
  return Math.max(0, date - now.getTime());
}
