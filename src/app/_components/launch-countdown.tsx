"use client";

import { useEffect, useMemo, useState } from "react";

import type { TimePrecision } from "@/domain";

type CountdownState = Readonly<{
  label: string;
  value: string;
  passed: boolean;
}>;

function formatWindow(start: string, end: string): string {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const first = formatter.format(new Date(start));
  const last = formatter.format(new Date(end));
  return first === last ? first : `${first} – ${last}`;
}

export function countdownState(
  start: string,
  end: string,
  precision: TimePrecision,
  now: number,
): CountdownState {
  if (precision === "window" || precision === "unknown") {
    return {
      label:
        precision === "window"
          ? "Provider launch window"
          : "Timing not precise",
      value: formatWindow(start, end),
      passed: now > Date.parse(end),
    };
  }

  const difference = Date.parse(start) - now;
  if (difference <= 0) {
    return {
      label:
        now <= Date.parse(end)
          ? "Launch window is open"
          : "Scheduled time passed",
      value:
        now <= Date.parse(end) ? "Window open" : "Awaiting provider update",
      passed: true,
    };
  }

  const totalSeconds = Math.floor(difference / 1_000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [`${String(days).padStart(2, "0")}d`];
  if (precision !== "day") parts.push(`${String(hours).padStart(2, "0")}h`);
  if (precision === "minute" || precision === "second") {
    parts.push(`${String(minutes).padStart(2, "0")}m`);
  }
  if (precision === "second")
    parts.push(`${String(seconds).padStart(2, "0")}s`);

  return {
    label: `Countdown rounded to ${precision}`,
    value: `T−${parts.join(" ")}`,
    passed: false,
  };
}

export function LaunchCountdown({
  start,
  end,
  precision,
}: {
  start: string;
  end: string;
  precision: TimePrecision;
}) {
  const [now, setNow] = useState(() => Date.now());
  const cadence = precision === "second" ? 1_000 : 30_000;

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const sync = () => {
      if (document.hidden) {
        if (timer) clearInterval(timer);
        timer = undefined;
        return;
      }
      setNow(Date.now());
      if (!timer) timer = setInterval(() => setNow(Date.now()), cadence);
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      if (timer) clearInterval(timer);
    };
  }, [cadence]);

  const state = useMemo(
    () => countdownState(start, end, precision, now),
    [end, now, precision, start],
  );

  return (
    <div aria-live="off">
      <p
        className={`tabular font-mono text-[clamp(2rem,5vw,3.6rem)] leading-none font-semibold tracking-[-0.055em] ${state.passed ? "text-[var(--color-text-secondary)]" : "text-[var(--color-text)]"}`}
      >
        {state.value}
      </p>
      <p className="mt-3 text-xs leading-5 text-[var(--color-text-muted)]">
        {state.label}. Updates pause while this tab is hidden.
      </p>
    </div>
  );
}
