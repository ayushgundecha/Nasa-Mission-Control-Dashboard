import { Funnel, MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";

import { readProductData } from "@/api/data";
import { OrbitWatch } from "@/features/environment";
import { propagateCatalog } from "@/features/orbit";
import { getServerEnvironment } from "@/lib/env";
import type { CelestrakCurationCategory } from "@/providers/celestrak";

export const metadata: Metadata = {
  title: "Orbital object explorer",
  description:
    "Search a curated orbital catalog and inspect sourced elements alongside transparent SGP4 position estimates.",
};

const categories: readonly CelestrakCurationCategory[] = [
  "stations",
  "science_weather",
  "navigation",
  "commercial_communications",
];
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
const controlClass =
  "h-12 min-w-0 rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-void)] px-3 text-base text-[var(--color-text)] outline-none focus:border-[var(--color-signal)] focus:ring-2 focus:ring-[var(--color-focus)]/50";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ObjectsPage({
  searchParams,
}: PageProps<"/objects">) {
  const raw = await searchParams;
  const query = first(raw.query)?.trim() ?? "";
  const requestedCategory = first(raw.category);
  const category = categories.includes(
    requestedCategory as CelestrakCurationCategory,
  )
    ? (requestedCategory as CelestrakCurationCategory)
    : undefined;
  const requestedSelected = first(raw.selected);
  const product = await readProductData();
  const all = product.orbitalObjects;
  const catalog = all.filter(
    (entry) =>
      (!category || entry.category === category) &&
      (!query ||
        entry.object.name
          .toLocaleLowerCase()
          .includes(query.toLocaleLowerCase()) ||
        entry.object.catalogNumber.includes(query)),
  );
  const selectedId = catalog.some(
    (entry) => entry.object.catalogNumber === requestedSelected,
  )
    ? `celestrak:${requestedSelected}`
    : catalog[0]?.object.id;
  const positions = propagateCatalog(
    catalog.map((entry) => entry.object),
    new Date(product.generatedAt),
  ).flatMap((result) => (result.ok ? [result.position] : []));
  const fixtureMode = getServerEnvironment().ASTRAOPS_DATA_MODE === "fixture";

  return (
    <div>
      <nav
        aria-label="Breadcrumb"
        className="text-sm text-[var(--color-text-muted)]"
      >
        <Link href="/environment" className="hover:text-[var(--color-signal)]">
          Environment
        </Link>
        <span aria-hidden="true" className="mx-2">
          /
        </span>
        <span aria-current="page">Objects</span>
      </nav>
      <header className="mt-5 max-w-4xl">
        <p className="data-label text-[var(--color-signal)]">
          Curated orbit watch
        </p>
        <h1 className="mt-3 text-[clamp(2rem,5vw,3rem)] leading-[1.05] font-semibold tracking-[-0.04em] text-balance">
          Orbital object explorer
        </h1>
        <p className="mt-4 max-w-[68ch] leading-7 text-[var(--color-text-secondary)]">
          Search a bounded catalog of mission-relevant spacecraft. Source
          elements and AstraOps-calculated positions stay visibly separate.
        </p>
      </header>

      <form
        action="/objects"
        className="mt-6 grid gap-4 rounded-[var(--radius-panel)] border border-[var(--color-line-subtle)] bg-[var(--color-surface-raised)] p-4 md:grid-cols-[minmax(0,1fr)_minmax(14rem,0.45fr)_auto] md:items-end md:p-5"
      >
        <label className="grid gap-2 text-sm font-semibold">
          <span>Search name or NORAD ID</span>
          <span className="relative">
            <MagnifyingGlass
              aria-hidden="true"
              className="absolute top-1/2 left-3 size-5 -translate-y-1/2 text-[var(--color-text-muted)]"
            />
            <input
              name="query"
              type="search"
              defaultValue={query}
              className={`${controlClass} w-full pl-10`}
              placeholder="Example: Hubble or 25544"
            />
          </span>
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          <span>Category</span>
          <select
            name="category"
            defaultValue={category ?? ""}
            className={controlClass}
          >
            <option value="">All categories</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[var(--color-signal)] px-4 font-semibold text-[var(--color-cosmos)]"
        >
          <Funnel aria-hidden="true" /> Apply
        </button>
        {query || category ? (
          <div className="text-sm md:col-span-3">
            <span className="text-[var(--color-text-secondary)]">
              {catalog.length} matching objects.
            </span>{" "}
            <Link
              href="/objects"
              className="font-semibold text-[var(--color-signal)] hover:underline"
            >
              Clear filters
            </Link>
          </div>
        ) : null}
      </form>

      {catalog.length ? (
        <OrbitWatch
          catalog={catalog}
          initialPositions={positions}
          initialUtc={product.generatedAt}
          launchSites={launchSites}
          fixtureMode={fixtureMode}
          initialSelectedId={selectedId!}
          syncSelectionToUrl
        />
      ) : (
        <section
          className="mt-6 rounded-[var(--radius-panel)] border border-[var(--color-line)] bg-[var(--color-surface)] p-6"
          aria-labelledby="no-objects"
        >
          <h2 id="no-objects" className="text-xl font-semibold">
            {all.length
              ? "No objects match these filters"
              : "Orbital catalog unavailable"}
          </h2>
          <p className="mt-2 text-[var(--color-text-secondary)]">
            {all.length
              ? "The search text or selected category removed every curated object."
              : "No validated CelesTrak snapshot is stored. AstraOps will not substitute generated objects in live mode."}
          </p>
          <Link
            href="/objects"
            className="mt-4 inline-flex min-h-11 items-center font-semibold text-[var(--color-signal)] hover:underline"
          >
            Clear filters
          </Link>
        </section>
      )}
    </div>
  );
}
