import type { FreshnessState, Launch, TimePrecision } from "@/domain";

export function launchStatusState(status: Launch["status"]): FreshnessState {
  if (status === "go" || status === "in_flight" || status === "success")
    return "live";
  if (status === "hold" || status === "scrubbed") return "delayed";
  if (["cancelled", "failure", "partial_failure"].includes(status))
    return "unavailable";
  return "current";
}

function instant(value: string, precision: TimePrecision): string {
  const includeTime = !["day", "window", "unknown"].includes(precision);
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(includeTime
      ? {
          hour: "2-digit" as const,
          minute: precision === "hour" ? undefined : ("2-digit" as const),
          hourCycle: "h23" as const,
        }
      : {}),
    timeZone: "UTC",
  }).format(new Date(value));
}

export function formatLaunchWindow(launch: Launch): string {
  const { start, end, precision } = launch.window;
  const first = instant(start, precision);
  const last = instant(end, precision);
  if (precision === "window" || precision === "unknown")
    return first === last ? `${first} UTC` : `${first} – ${last} UTC`;
  return `${first} UTC`;
}

export function displayCountry(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

export function textOrUnavailable(value: string | null | undefined): string {
  return value?.trim() || "Unavailable from provider";
}
