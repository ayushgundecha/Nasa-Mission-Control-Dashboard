import { ProviderRefreshError, parseRetryAfter } from "./errors";
import type { ProviderRequest } from "./types";

export type FetchJsonDependencies = Readonly<{
  fetch: typeof globalThis.fetch;
  now: () => Date;
}>;

export async function fetchJson(
  request: ProviderRequest,
  timeoutMs: number,
  dependencies: FetchJsonDependencies,
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await dependencies.fetch(request.url, {
      ...request.init,
      headers: {
        Accept: "application/json",
        "User-Agent": "AstraOps/1.0 (+independent-space-intelligence)",
        ...request.init?.headers,
      },
      signal: controller.signal,
    });

    if (response.status === 429) {
      throw new ProviderRefreshError("rate_limited", {
        retryable: true,
        retryAfterMs: parseRetryAfter(
          response.headers.get("retry-after"),
          dependencies.now(),
        ),
      });
    }

    if (!response.ok) {
      throw new ProviderRefreshError("upstream_rejected", {
        retryable: response.status >= 500,
      });
    }

    try {
      return await response.json();
    } catch (error) {
      throw new ProviderRefreshError("validation", {
        retryable: false,
        cause: error,
      });
    }
  } catch (error) {
    if (error instanceof ProviderRefreshError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new ProviderRefreshError("timeout", {
        retryable: true,
        cause: error,
      });
    }
    throw new ProviderRefreshError("network", {
      retryable: true,
      cause: error,
    });
  } finally {
    clearTimeout(timeout);
  }
}
