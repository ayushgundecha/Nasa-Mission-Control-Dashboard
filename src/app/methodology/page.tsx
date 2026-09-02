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
    </div>
  );
}
