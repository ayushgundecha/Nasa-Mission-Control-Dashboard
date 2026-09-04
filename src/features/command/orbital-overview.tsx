import { Cube, MapTrifold } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { Panel } from "@/components/ui/panel";

function compactUtc(value: string): string {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "UTC",
  })
    .format(new Date(value))
    .toUpperCase();
}

export function OrbitalOverview({
  launchAt,
  launchName,
  kp,
  weatherBand,
}: {
  launchAt: string | null;
  launchName: string | null;
  kp: number | null;
  weatherBand: string;
}) {
  return (
    <Panel
      raised
      className="relative min-h-[430px] overflow-hidden md:min-h-[520px]"
    >
      <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="data-label">Near-Earth operating picture</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
            Orbital perspective
          </h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-[var(--color-text-secondary)]">
            A scale-aware schematic pairing upcoming launch, orbit-watch, and
            approach context. Core facts remain available without WebGL.
          </p>
        </div>
        <div
          className="flex rounded-[var(--radius-control)] border border-[var(--color-line)] p-1"
          aria-label="Orbital view options"
        >
          <span
            aria-current="true"
            className="inline-flex min-h-11 items-center gap-2 rounded-[calc(var(--radius-control)-2px)] bg-[var(--color-surface-hover)] px-3 text-xs font-semibold text-[var(--color-text)]"
          >
            <MapTrifold aria-hidden="true" className="size-4" />
            Overview 2D
          </span>
          <Link
            href="/environment"
            className="inline-flex min-h-11 items-center gap-2 rounded-[calc(var(--radius-control)-2px)] px-3 text-xs font-semibold text-[var(--color-signal)] hover:bg-[var(--color-surface-hover)]"
          >
            <Cube aria-hidden="true" className="size-4" />
            Open 3D
          </Link>
        </div>
      </div>

      <figure className="relative z-0 mx-auto mt-4 flex max-w-[660px] flex-col items-center md:mt-0">
        <svg
          viewBox="0 0 640 430"
          className="h-auto w-full max-w-[640px]"
          role="img"
          aria-labelledby="orbit-title orbit-description"
        >
          <title id="orbit-title">
            Two-dimensional near-Earth orbital schematic
          </title>
          <desc id="orbit-description">
            Earth is centered inside three orbital rings. A launch marker, the
            current geomagnetic condition, and orbit-watch markers are labeled
            with distinct shapes.
          </desc>
          <g fill="none">
            <ellipse
              cx="320"
              cy="228"
              rx="258"
              ry="126"
              stroke="var(--color-line-subtle)"
              strokeWidth="1"
            />
            <ellipse
              cx="320"
              cy="228"
              rx="217"
              ry="89"
              stroke="var(--color-line)"
              strokeWidth="1"
              transform="rotate(-18 320 228)"
            />
            <ellipse
              cx="320"
              cy="228"
              rx="165"
              ry="61"
              stroke="var(--color-orbit)"
              strokeWidth="1.5"
              strokeDasharray="6 8"
              transform="rotate(28 320 228)"
            />
            <circle
              cx="320"
              cy="228"
              r="83"
              fill="var(--color-void)"
              stroke="var(--color-signal)"
              strokeWidth="1.5"
            />
            <path
              d="M248 211c42-20 104-20 144 1M259 257c40 15 82 15 123-1"
              stroke="var(--color-line)"
            />
            <path
              d="M320 146c-21 31-28 61-21 90 6 27 2 51-12 71M320 146c20 31 28 61 20 90-6 27-2 51 13 71"
              stroke="var(--color-line)"
            />
          </g>
          <g fontFamily="var(--font-jetbrains-mono)" fontSize="11">
            <circle cx="455" cy="127" r="6" fill="var(--color-signal)" />
            <path d="M455 127L512 87" stroke="var(--color-signal)" />
            <text x="520" y="84" fill="var(--color-text)">
              NEXT LAUNCH
            </text>
            <text x="520" y="101" fill="var(--color-text-muted)">
              {launchAt ? `${compactUtc(launchAt)}Z` : "NO CACHED EVENT"}
            </text>

            <rect
              x="171"
              y="258"
              width="11"
              height="11"
              fill="var(--color-positive)"
              transform="rotate(45 176.5 263.5)"
            />
            <path d="M177 264L108 312" stroke="var(--color-positive)" />
            <text x="27" y="313" fill="var(--color-text)">
              Kp {kp ?? "—"} · {weatherBand.toUpperCase()}
            </text>
            <text x="27" y="330" fill="var(--color-text-muted)">
              NOAA CONDITION
            </text>

            <path
              d="M536 293l7 13h-14z"
              fill="none"
              stroke="var(--color-caution)"
              strokeWidth="2"
            />
            <path
              d="M536 293L579 252"
              stroke="var(--color-caution)"
              strokeDasharray="3 4"
            />
            <text x="518" y="233" fill="var(--color-text)">
              ORBIT WATCH
            </text>
            <text x="518" y="250" fill="var(--color-text-muted)">
              CURATED CATALOG
            </text>
          </g>
        </svg>
        <figcaption className="-mt-4 max-w-xl text-center text-xs leading-5 text-[var(--color-text-muted)]">
          Schematic, not to scale.{" "}
          {launchName ?? "No launch is currently cached"}. Exact values and
          source timestamps are listed in the synchronized briefing.
        </figcaption>
      </figure>
    </Panel>
  );
}
