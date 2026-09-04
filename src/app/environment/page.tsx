import type { Metadata } from "next";
import Link from "next/link";

import { readProductData } from "@/api/data";
import { OrbitWatch } from "@/features/environment";
import { propagateCatalog } from "@/features/orbit";
import { getServerEnvironment } from "@/lib/env";

export const metadata: Metadata = {
  title: "Near-Earth environment",
  description:
    "Explore space weather, curated orbital objects, and close approaches with source and calculation boundaries intact.",
};

const launchSites = [
  {
    name: "Kennedy Space Center",
    latitudeDegrees: 28.5729,
    longitudeDegrees: -80.649,
  },
  {
    name: "Vandenberg SFB",
    latitudeDegrees: 34.742,
    longitudeDegrees: -120.5724,
  },
  {
    name: "Guiana Space Centre",
    latitudeDegrees: 5.236,
    longitudeDegrees: -52.775,
  },
] as const;

export default async function EnvironmentPage() {
  const product = await readProductData();
  const catalog = product.orbitalObjects;
  const initialPositions = propagateCatalog(
    catalog.map((entry) => entry.object),
    new Date(product.generatedAt),
  ).flatMap((result) => (result.ok ? [result.position] : []));
  const fixtureMode = getServerEnvironment().ASTRAOPS_DATA_MODE === "fixture";
  return (
    <div>
      <header className="max-w-4xl">
        <p className="data-label text-[var(--color-signal)]">
          Near-Earth environment
        </p>
        <h1 className="mt-3 max-w-[18ch] text-[clamp(2rem,5vw,3rem)] leading-[1.05] font-semibold tracking-[-0.04em] text-balance">
          Read the space around a mission as one connected picture.
        </h1>
        <p className="mt-4 max-w-[68ch] leading-7 text-[var(--color-text-secondary)]">
          Compare operational conditions, curated orbits, and close approaches
          without hiding differences in cadence, method, or certainty.
        </p>
      </header>
      <nav
        aria-label="Environment views"
        className="mt-6 flex flex-wrap gap-2 border-b border-[var(--color-line-subtle)] pb-3"
      >
        <Link
          href="/environment?view=weather"
          className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] px-3 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
        >
          Space weather
        </Link>
        <Link
          href="/objects"
          className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] bg-[var(--color-surface-raised)] px-3 text-sm font-semibold text-[var(--color-signal)]"
        >
          Orbit watch
        </Link>
        <Link
          href="/approaches"
          className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] px-3 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
        >
          Near-Earth approaches
        </Link>
      </nav>
      {catalog.length ? (
        <OrbitWatch
          catalog={catalog}
          initialPositions={initialPositions}
          initialUtc={product.generatedAt}
          launchSites={launchSites}
          fixtureMode={fixtureMode}
        />
      ) : (
        <section className="mt-6 rounded-[var(--radius-panel)] border border-[var(--color-caution)] bg-[var(--color-surface)] p-6">
          <h2 className="text-xl font-semibold">Orbit snapshot unavailable</h2>
          <p className="mt-2 max-w-[68ch] text-[var(--color-text-secondary)]">
            No validated CelesTrak snapshot is stored, so AstraOps will not
            invent orbital positions. The space-weather and approach views can
            still be used independently.
          </p>
        </section>
      )}
      <div className="mt-4 text-right">
        <Link
          href="/objects"
          className="inline-flex min-h-11 items-center font-semibold text-[var(--color-signal)] hover:underline"
        >
          Open the full object explorer →
        </Link>
      </div>
    </div>
  );
}
