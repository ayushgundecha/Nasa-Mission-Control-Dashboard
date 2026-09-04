import Link from "next/link";

import { Panel } from "@/components/ui/panel";

const evidenceClasses = [
  [
    "Provider observed",
    "Reported directly by an upstream provider and stored with source and timestamps.",
  ],
  [
    "Authority computed",
    "Derived by an authoritative scientific service such as JPL.",
  ],
  [
    "AstraOps estimate",
    "Reproducibly calculated by AstraOps with a named method and version.",
  ],
  [
    "Your assumption",
    "A scenario input supplied by the user and never presented as an observed fact.",
  ],
] as const;

export default function MethodologyPage() {
  return (
    <div className="mx-auto max-w-4xl py-4 md:py-10">
      <Link
        href="/"
        className="text-sm font-semibold text-[var(--color-signal)] hover:underline"
      >
        ← Command preview
      </Link>
      <p className="data-label mt-12 mb-4">AstraOps / Data honesty</p>
      <h1 className="text-4xl font-semibold tracking-[-0.04em] md:text-5xl">
        Every number has a history.
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--color-text-secondary)]">
        AstraOps distinguishes live observations, authoritative calculations,
        product estimates, and user assumptions so an impressive interface never
        outruns the evidence beneath it.
      </p>
      <div className="mt-12 grid gap-4 md:grid-cols-2">
        {evidenceClasses.map(([title, description]) => (
          <Panel key={title}>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="mt-3 leading-7 text-[var(--color-text-secondary)]">
              {description}
            </p>
          </Panel>
        ))}
      </div>
      <section aria-labelledby="orbital-methods" className="mt-12">
        <p className="data-label">Phase 3 / Near-Earth methods</p>
        <h2 id="orbital-methods" className="mt-2 text-2xl font-semibold">
          Orbits and approaches keep different evidence boundaries.
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Panel>
            <h3 className="text-lg font-semibold">CelesTrak OMM + SGP4</h3>
            <p className="mt-3 leading-7 text-[var(--color-text-secondary)]">
              CelesTrak supplies mean orbital elements. AstraOps propagates them
              with satellite.js 7.1 SGP4 into a time-dependent estimate. The
              displayed position is not direct spacecraft telemetry; older
              element epochs carry a stale warning.
            </p>
            <a
              href="https://celestrak.org/NORAD/documentation/gp-data-formats.php"
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex min-h-11 items-center font-semibold text-[var(--color-signal)] underline"
            >
              CelesTrak GP data format
            </a>
          </Panel>
          <Panel>
            <h3 className="text-lg font-semibold">NASA/JPL SBDB CAD</h3>
            <p className="mt-3 leading-7 text-[var(--color-text-secondary)]">
              JPL supplies authoritative close-approach calculations in TDB,
              including nominal distance and available uncertainty. AstraOps
              labels its approximate UTC conversion and never treats proximity
              alone as an impact prediction.
            </p>
            <a
              href="https://ssd-api.jpl.nasa.gov/doc/cad.html"
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex min-h-11 items-center font-semibold text-[var(--color-signal)] underline"
            >
              NASA/JPL CAD documentation
            </a>
          </Panel>
        </div>
      </section>
    </div>
  );
}
