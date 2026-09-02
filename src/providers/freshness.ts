import type { FreshnessState } from "@/domain";

import type { FreshnessPolicy } from "./types";

export function validateFreshnessPolicy(policy: FreshnessPolicy): void {
  const values = [
    policy.liveForSeconds,
    policy.currentForSeconds,
    policy.delayedForSeconds,
    policy.usableForSeconds,
  ];

  if (values.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new Error(
      "Freshness thresholds must be finite, non-negative seconds",
    );
  }

  if (
    policy.liveForSeconds > policy.currentForSeconds ||
    policy.currentForSeconds >= policy.delayedForSeconds ||
    policy.delayedForSeconds >= policy.usableForSeconds
  ) {
    throw new Error(
      "Freshness thresholds must satisfy live <= current < delayed < usable",
    );
  }
}

export type FreshnessEvaluation = Readonly<{
  state: FreshnessState;
  ageSeconds: number | null;
  reason: string | null;
}>;

export function evaluateFreshness(
  fetchedAt: string | null,
  now: Date,
  policy: FreshnessPolicy,
): FreshnessEvaluation {
  validateFreshnessPolicy(policy);

  if (!fetchedAt) {
    return {
      state: "unavailable",
      ageSeconds: null,
      reason: "No successful provider snapshot is available.",
    };
  }

  const timestamp = Date.parse(fetchedAt);
  if (!Number.isFinite(timestamp)) {
    return {
      state: "unavailable",
      ageSeconds: null,
      reason: "The cached provider timestamp is invalid.",
    };
  }

  const ageSeconds = Math.max(
    0,
    Math.floor((now.getTime() - timestamp) / 1000),
  );

  if (ageSeconds <= policy.liveForSeconds) {
    return { state: "live", ageSeconds, reason: null };
  }
  if (ageSeconds <= policy.currentForSeconds) {
    return { state: "current", ageSeconds, reason: null };
  }
  if (ageSeconds <= policy.delayedForSeconds) {
    return {
      state: "delayed",
      ageSeconds,
      reason: "The provider snapshot is older than its target refresh cadence.",
    };
  }
  if (ageSeconds <= policy.usableForSeconds) {
    return {
      state: "stale",
      ageSeconds,
      reason: "Showing retained last-known-good provider data.",
    };
  }

  return {
    state: "unavailable",
    ageSeconds,
    reason: "The retained provider snapshot is beyond its safe display window.",
  };
}

export function shouldRefresh(state: FreshnessState): boolean {
  return state === "delayed" || state === "stale" || state === "unavailable";
}
