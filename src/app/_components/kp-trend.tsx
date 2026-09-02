import type { KpMeasurement } from "@/providers/space-weather";

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function KpTrend({
  observed,
  forecast,
}: {
  observed: readonly KpMeasurement[];
  forecast: readonly KpMeasurement[];
}) {
  const points = [...observed, ...forecast].filter(
    (point): point is KpMeasurement & { kp: number } => point.kp !== null,
  );
  if (points.length < 2) {
    return (
      <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
        A trend needs at least two valid Kp readings. The latest available value
        remains visible in the briefing.
      </p>
    );
  }

  const x = (index: number) =>
    26 + (index / Math.max(1, points.length - 1)) * 528;
  const y = (value: number) => 168 - (value / 9) * 132;
  const observedCount = points.filter(
    (point) => point.evidenceMode !== "predicted",
  ).length;
  const observedPoints = points
    .slice(0, observedCount)
    .map((point, index) => `${x(index)},${y(point.kp)}`)
    .join(" ");
  const forecastPoints = points
    .slice(Math.max(0, observedCount - 1))
    .map(
      (point, index) =>
        `${x(index + Math.max(0, observedCount - 1))},${y(point.kp)}`,
    )
    .join(" ");
  const first = observed.find((point) => point.kp !== null)?.kp ?? null;
  const last =
    [...observed].reverse().find((point) => point.kp !== null)?.kp ?? null;
  const summary =
    first === null || last === null
      ? "Observed Kp trend is incomplete."
      : `Observed Kp moved from ${first} to ${last} across the displayed period.`;

  return (
    <figure>
      <svg
        viewBox="0 0 580 205"
        className="mt-5 h-auto w-full"
        role="img"
        aria-labelledby="kp-chart-title kp-chart-description"
      >
        <title id="kp-chart-title">Recent and forecast planetary K-index</title>
        <desc id="kp-chart-description">
          {summary} Observations use a solid line and provider forecasts use a
          dashed line.
        </desc>
        {[0, 3, 5, 7, 9].map((tick) => (
          <g key={tick}>
            <line
              x1="26"
              x2="554"
              y1={y(tick)}
              y2={y(tick)}
              stroke="var(--color-line-subtle)"
            />
            <text
              x="4"
              y={y(tick) + 4}
              fill="var(--color-text-muted)"
              fontFamily="var(--font-jetbrains-mono)"
              fontSize="10"
            >
              {tick}
            </text>
          </g>
        ))}
        {observedPoints ? (
          <polyline
            points={observedPoints}
            fill="none"
            stroke="var(--color-signal)"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null}
        {forecastPoints ? (
          <polyline
            points={forecastPoints}
            fill="none"
            stroke="var(--color-caution)"
            strokeWidth="2"
            strokeDasharray="7 7"
            strokeLinejoin="round"
          />
        ) : null}
        {points.map((point, index) => (
          <circle
            key={point.id}
            cx={x(index)}
            cy={y(point.kp)}
            r="4"
            fill={
              point.evidenceMode === "predicted"
                ? "var(--color-cosmos)"
                : "var(--color-signal)"
            }
            stroke={
              point.evidenceMode === "predicted"
                ? "var(--color-caution)"
                : "var(--color-signal)"
            }
            strokeWidth="2"
          />
        ))}
      </svg>
      <figcaption className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
        {summary}
      </figcaption>
      <div
        className="mt-4 flex flex-wrap gap-x-5 gap-y-2 font-mono text-xs text-[var(--color-text-muted)]"
        aria-label="Chart legend"
      >
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-0.5 w-6 bg-[var(--color-signal)]"
          />
          Observed / estimated
        </span>
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden="true"
            className="w-6 border-t-2 border-dashed border-[var(--color-caution)]"
          />
          NOAA forecast
        </span>
      </div>
      <details className="mt-4 border-t border-[var(--color-line-subtle)] pt-3">
        <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-[var(--color-signal)]">
          View exact Kp values
        </summary>
        <div
          className="overflow-x-auto"
          tabIndex={0}
          aria-label="Kp values table"
        >
          <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-line)] text-[var(--color-text-muted)]">
                <th className="p-3 font-medium">UTC time</th>
                <th className="p-3 font-medium">Kp</th>
                <th className="p-3 font-medium">Evidence</th>
                <th className="p-3 font-medium">Interpretation</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr
                  key={point.id}
                  className="border-b border-[var(--color-line-subtle)]"
                >
                  <td className="tabular p-3 font-mono text-xs">
                    {formatTime(point.validAt)}
                  </td>
                  <td className="tabular p-3 font-mono">{point.kp}</td>
                  <td className="p-3 capitalize">{point.evidenceMode}</td>
                  <td className="p-3">{point.interpretation.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
