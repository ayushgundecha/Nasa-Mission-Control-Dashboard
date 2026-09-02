import {
  ArrowRight,
  CalendarBlank,
  Funnel,
  MagnifyingGlass,
  RocketLaunch,
  X,
} from "@phosphor-icons/react/dist/ssr";
import type { Route } from "next";
import Link from "next/link";

import { launchesQuerySchema } from "@/api/contracts";
import { readProductData } from "@/api/data";
import { listLaunches } from "@/api/service";
import { DataStatePanel } from "@/components/data/data-state";
import { buttonVariants } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Launch, LaunchStatus } from "@/domain";
import {
  displayCountry,
  formatLaunchWindow,
  launchStatusState,
  textOrUnavailable,
} from "@/features/launches/presentation";
import { getServerEnvironment } from "@/lib/env";

export const dynamic = "force-dynamic";

type RawSearchParams = Record<string, string | string[] | undefined>;
const statuses: readonly LaunchStatus[] = [
  "scheduled",
  "go",
  "hold",
  "scrubbed",
  "in_flight",
  "success",
  "partial_failure",
  "failure",
  "cancelled",
  "unknown",
];

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function normalizedSearchParams(raw: RawSearchParams) {
  return Object.fromEntries(
    Object.entries(raw).flatMap(([key, value]) => {
      const selected = first(value);
      return selected ? [[key, selected]] : [];
    }),
  );
}

function queryString(
  query: Record<string, unknown>,
  cursor?: string | null,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (key === "cursor" || value === undefined || value === "") continue;
    params.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }
  if (cursor) params.set("cursor", cursor);
  return params.toString();
}

function detailHref(launch: Launch, returnTo: string): Route {
  return `/launches/${encodeURIComponent(launch.slug)}?returnTo=${encodeURIComponent(returnTo)}` as Route;
}

const controlClass =
  "h-12 min-w-0 rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-void)] px-3 text-[var(--color-text)] outline-none focus:border-[var(--color-signal)] focus:ring-2 focus:ring-[var(--color-focus)]/50";

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      <span>{label}</span>
      {children}
    </label>
  );
}

export default async function LaunchesPage({
  searchParams,
}: PageProps<"/launches">) {
  const raw = normalizedSearchParams(await searchParams);
  const parsed = launchesQuerySchema.safeParse({ ...raw, limit: 12 });
  const fixtureMode = getServerEnvironment().ASTRAOPS_DATA_MODE === "fixture";
  let product: Awaited<ReturnType<typeof readProductData>> | null;
  try {
    product = await readProductData();
  } catch {
    product = null;
  }

  if (!product)
    return (
      <div>
        <LaunchHeader fixtureMode={fixtureMode} />
        <Panel className="mt-6">
          <DataStatePanel
            state="error"
            title="Launch intelligence is unavailable"
            detail="AstraOps could not read a validated launch snapshot. No substitute schedule was generated."
            actionLabel="Review data recovery"
          />
        </Panel>
      </div>
    );
  if (!parsed.success)
    return (
      <div>
        <LaunchHeader fixtureMode={fixtureMode} />
        <Panel className="mt-6">
          <div role="alert" className="flex items-start gap-3">
            <Funnel
              className="mt-0.5 size-5 text-[var(--color-critical)]"
              aria-hidden="true"
            />
            <div>
              <h2 className="font-semibold">These filters need attention</h2>
              <p className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">
                {parsed.error.issues[0]?.message ??
                  "One or more URL filters are invalid."}
              </p>
              <Link
                href="/launches"
                className="mt-3 inline-flex min-h-11 items-center font-semibold text-[var(--color-signal)] hover:underline"
              >
                Reset all filters
              </Link>
            </div>
          </div>
        </Panel>
      </div>
    );

  const result = listLaunches(product, parsed.data);
  const currentQuery = queryString(parsed.data);
  const returnTo = `/launches${currentQuery ? `?${currentQuery}` : ""}`;
  const providers = [
    ...new Set(product.launches.flatMap((record) => record.agency?.name ?? [])),
  ].sort();
  const countries = [
    ...new Set(
      product.launches.flatMap((record) => record.agency?.countryCodes ?? []),
    ),
  ].sort();
  const orbits = [
    ...new Set(
      product.launches.flatMap((record) => record.mission?.orbitName ?? []),
    ),
  ].sort();
  const vehicles = [
    ...new Set(
      product.launches.flatMap((record) => record.vehicle?.name ?? []),
    ),
  ].sort();
  const activeFilters = [
    parsed.data.query,
    parsed.data.status,
    parsed.data.provider,
    parsed.data.country,
    parsed.data.orbit,
    parsed.data.vehicle,
    parsed.data.from,
    parsed.data.to,
  ].filter(Boolean).length;

  return (
    <div>
      <LaunchHeader fixtureMode={fixtureMode} />
      <Panel raised className="mt-6">
        <form action="/launches" method="get">
          <div className="grid gap-4 xl:grid-cols-[minmax(16rem,1.4fr)_repeat(3,minmax(10rem,1fr))]">
            <FilterField label="Search launches">
              <span className="relative block">
                <MagnifyingGlass
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-[var(--color-text-muted)]"
                />
                <input
                  type="search"
                  name="query"
                  defaultValue={parsed.data.query}
                  placeholder="Mission, pad, orbit, or vehicle"
                  className={`${controlClass} w-full pr-3 pl-11 text-base placeholder:text-[var(--color-text-muted)]`}
                />
              </span>
            </FilterField>
            <FilterField label="Status">
              <select
                name="status"
                defaultValue={parsed.data.status?.[0] ?? ""}
                className={controlClass}
              >
                <option value="">All statuses</option>
                {statuses.map((status) => (
                  <option value={status} key={status}>
                    {status.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Launch service provider">
              <select
                name="provider"
                defaultValue={parsed.data.provider ?? ""}
                className={controlClass}
              >
                <option value="">All providers</option>
                {providers.map((provider) => (
                  <option key={provider}>{provider}</option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Vehicle">
              <select
                name="vehicle"
                defaultValue={parsed.data.vehicle ?? ""}
                className={controlClass}
              >
                <option value="">All vehicles</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle}>{vehicle}</option>
                ))}
              </select>
            </FilterField>
          </div>
          <details
            className="mt-4 border-t border-[var(--color-line-subtle)] pt-4"
            open={Boolean(
              parsed.data.country ||
              parsed.data.orbit ||
              parsed.data.from ||
              parsed.data.to,
            )}
          >
            <summary className="inline-flex min-h-11 cursor-pointer items-center gap-2 font-semibold text-[var(--color-signal)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]">
              <Funnel aria-hidden="true" className="size-4" />
              Date and destination filters
            </summary>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <FilterField label="Country">
                <select
                  name="country"
                  defaultValue={parsed.data.country ?? ""}
                  className={controlClass}
                >
                  <option value="">All countries</option>
                  {countries.map((country) => (
                    <option value={country} key={country}>
                      {displayCountry(country)}
                    </option>
                  ))}
                </select>
              </FilterField>
              <FilterField label="Orbit">
                <select
                  name="orbit"
                  defaultValue={parsed.data.orbit ?? ""}
                  className={controlClass}
                >
                  <option value="">All orbits</option>
                  {orbits.map((orbit) => (
                    <option key={orbit}>{orbit}</option>
                  ))}
                </select>
              </FilterField>
              <FilterField label="From date">
                <input
                  type="date"
                  name="from"
                  defaultValue={parsed.data.from}
                  className={controlClass}
                />
              </FilterField>
              <FilterField label="To date">
                <input
                  type="date"
                  name="to"
                  defaultValue={parsed.data.to}
                  className={controlClass}
                />
              </FilterField>
            </div>
          </details>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className={buttonVariants({ variant: "primary" })}
            >
              Apply filters
              <ArrowRight aria-hidden="true" className="size-4" />
            </button>
            <Link
              href="/launches"
              className={buttonVariants({ variant: "quiet" })}
            >
              <X aria-hidden="true" className="size-4" />
              Clear {activeFilters > 0 ? activeFilters : "all"}
            </Link>
          </div>
        </form>
      </Panel>

      <section className="mt-8" aria-labelledby="results-heading">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="data-label">Discovery result</p>
            <h2 id="results-heading" className="mt-2 text-2xl font-semibold">
              {result.page.total}{" "}
              {result.page.total === 1 ? "launch" : "launches"}
            </h2>
          </div>
          <p className="font-mono text-xs text-[var(--color-text-muted)]">
            Schedule source: Launch Library 2 ·{" "}
            {fixtureMode
              ? "fixture snapshot"
              : "freshness shown in each dossier"}
          </p>
        </div>
        {result.data.length === 0 ? (
          <Panel>
            <DataStatePanel
              state="empty"
              title="No launches match this operating view"
              detail="Broaden the date range or clear one of the active provider, vehicle, orbit, country, or status filters."
              actionLabel="Review source coverage"
            />
          </Panel>
        ) : (
          <LaunchResults launches={result.data} returnTo={returnTo} />
        )}
        {result.page.hasNextPage ? (
          <div className="mt-5 flex justify-end">
            <Link
              href={
                `/launches?${queryString(parsed.data, result.page.nextCursor)}` as Route
              }
              className={buttonVariants({ variant: "secondary" })}
            >
              Next page
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function LaunchResults({
  launches,
  returnTo,
}: {
  launches: readonly Launch[];
  returnTo: string;
}) {
  return (
    <>
      <div className="grid gap-3 lg:hidden">
        {launches.map((launch) => (
          <Panel key={launch.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="data-label">{formatLaunchWindow(launch)}</p>
                <h3 className="mt-3 text-xl font-semibold">{launch.name}</h3>
              </div>
              <StatusBadge
                state={launchStatusState(launch.status)}
                label={launch.status.replaceAll("_", " ")}
              />
            </div>
            <p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--color-text-secondary)]">
              {textOrUnavailable(launch.missionDescription)}
            </p>
            <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-[var(--color-line-subtle)] pt-4 text-sm">
              <div>
                <dt className="data-label">Location</dt>
                <dd className="mt-2">
                  {textOrUnavailable(launch.pad?.locationName)}
                </dd>
              </div>
              <div>
                <dt className="data-label">Precision</dt>
                <dd className="mt-2 capitalize">{launch.window.precision}</dd>
              </div>
            </dl>
            <Link
              href={detailHref(launch, returnTo)}
              className="mt-5 inline-flex min-h-11 items-center gap-2 font-semibold text-[var(--color-signal)] hover:underline"
            >
              Open mission dossier
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </Panel>
        ))}
      </div>
      <Panel className="hidden overflow-hidden p-0 lg:block lg:p-0">
        <table className="w-full table-fixed border-collapse text-left text-sm">
          <caption className="sr-only">Filtered global launch schedule</caption>
          <thead className="bg-[var(--color-surface-raised)] text-[var(--color-text-muted)]">
            <tr>
              <th scope="col" className="w-[31%] px-5 py-4 font-mono text-xs">
                Mission
              </th>
              <th scope="col" className="w-[20%] px-5 py-4 font-mono text-xs">
                Window
              </th>
              <th scope="col" className="w-[18%] px-5 py-4 font-mono text-xs">
                Location
              </th>
              <th scope="col" className="w-[13%] px-5 py-4 font-mono text-xs">
                Status
              </th>
              <th scope="col" className="w-[18%] px-5 py-4">
                <span className="sr-only">Open dossier</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-line-subtle)]">
            {launches.map((launch) => (
              <tr
                key={launch.id}
                className="hover:bg-[var(--color-surface-hover)]"
              >
                <td className="px-5 py-4 align-top">
                  <span className="font-semibold">{launch.name}</span>
                  <span className="mt-1 block text-[var(--color-text-muted)]">
                    {launch.window.precision} precision
                  </span>
                </td>
                <td className="tabular px-5 py-4 align-top font-mono text-xs">
                  {formatLaunchWindow(launch)}
                </td>
                <td className="px-5 py-4 align-top text-[var(--color-text-secondary)]">
                  {textOrUnavailable(launch.pad?.locationName)}
                </td>
                <td className="px-5 py-4 align-top">
                  <StatusBadge
                    state={launchStatusState(launch.status)}
                    label={launch.status.replaceAll("_", " ")}
                  />
                </td>
                <td className="px-5 py-3 text-right align-top">
                  <Link
                    href={detailHref(launch, returnTo)}
                    className="inline-flex min-h-11 items-center gap-2 font-semibold text-[var(--color-signal)] hover:underline"
                  >
                    Dossier
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </>
  );
}

function LaunchHeader({ fixtureMode }: { fixtureMode: boolean }) {
  return (
    <header className="grid gap-5 border-b border-[var(--color-line-subtle)] pb-6 lg:grid-cols-[1fr_auto] lg:items-end lg:pb-8">
      <div>
        <div className="mb-4 flex items-center gap-2 text-[var(--color-signal)]">
          <RocketLaunch aria-hidden="true" className="size-5" />
          <p className="data-label">Global launch intelligence</p>
        </div>
        <h1 className="max-w-3xl text-4xl leading-[1.02] font-semibold tracking-[-0.045em] text-balance md:text-5xl">
          Find the mission. Audit the evidence.
        </h1>
      </div>
      <div className="max-w-md">
        <p className="leading-7 text-[var(--color-text-secondary)]">
          Search a global schedule by mission, operator, vehicle, orbit, place,
          status, or date—then open the source-stamped dossier.
        </p>
        <p className="mt-3 flex items-center gap-2 font-mono text-xs text-[var(--color-text-muted)]">
          <CalendarBlank aria-hidden="true" className="size-4" />
          {fixtureMode
            ? "Demonstration data is explicitly marked"
            : "Live cache with explicit schedule precision"}
        </p>
      </div>
    </header>
  );
}
