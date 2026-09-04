import { ArrowRight, Funnel, Info } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";

import { readProductData } from "@/api/data";
import { getServerEnvironment } from "@/lib/env";
import {
  ASTRONOMICAL_UNIT_KM,
  MEAN_LUNAR_DISTANCE_KM,
} from "@/providers/jpl-cad";

export const metadata: Metadata = {
  title: "Near-Earth approaches",
  description:
    "Compare NASA/JPL close-approach calculations with distance, velocity, size knowledge, and uncertainty in context.",
};

type Sort = "date" | "distance" | "velocity";
type SizeFilter = "all" | "known" | "unknown";
const controlClass =
  "h-12 w-full min-w-0 max-w-full rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-void)] px-3 text-base text-[var(--color-text)] focus:border-[var(--color-signal)] focus:ring-2 focus:ring-[var(--color-focus)]/50";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function date(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

function number(value: number, maximumFractionDigits = 2) {
  return new Intl.NumberFormat("en", { maximumFractionDigits }).format(value);
}

export default async function ApproachesPage({
  searchParams,
}: PageProps<"/approaches">) {
  const raw = await searchParams;
  const sortValue = first(raw.sort);
  const sort: Sort =
    sortValue === "distance" || sortValue === "velocity" ? sortValue : "date";
  const sizeValue = first(raw.size);
  const size: SizeFilter =
    sizeValue === "known" || sizeValue === "unknown" ? sizeValue : "all";
  const maximumLd = [1, 5, 10].includes(Number(first(raw.distance)))
    ? Number(first(raw.distance))
    : 10;
  const product = await readProductData();
  const fixtureMode = getServerEnvironment().ASTRAOPS_DATA_MODE === "fixture";
  const source = product.sources.find((item) => item.provider === "jpl_cad");
  const approaches = [...product.nearEarthApproaches]
    .filter(({ approach }) => approach.nominalDistanceLunar.value <= maximumLd)
    .filter(
      ({ approach }) =>
        size === "all" ||
        (size === "known"
          ? approach.diameter !== null
          : approach.diameter === null),
    )
    .sort((left, right) => {
      if (sort === "distance")
        return (
          left.approach.nominalDistance.value -
          right.approach.nominalDistance.value
        );
      if (sort === "velocity")
        return (
          right.approach.relativeVelocity.value -
          left.approach.relativeVelocity.value
        );
      return left.approach.closeApproachAt.localeCompare(
        right.approach.closeApproachAt,
      );
    });

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
        <span aria-current="page">Near-Earth approaches</span>
      </nav>
      <header className="mt-5 max-w-4xl">
        <p className="data-label text-[var(--color-signal)]">
          NASA/JPL close-approach calculations
        </p>
        <h1 className="mt-3 text-[clamp(2rem,5vw,3rem)] leading-[1.05] font-semibold tracking-[-0.04em] text-balance">
          Near-Earth approaches, without the alarmism.
        </h1>
        <p className="mt-4 max-w-[68ch] leading-7 text-[var(--color-text-secondary)]">
          A close approach is a distance measurement, not an impact prediction.
          Compare nominal distance, uncertainty, relative speed, and what is—or
          is not—known about size.
        </p>
      </header>

      <form
        action="/approaches"
        className="mt-6 grid gap-4 rounded-[var(--radius-panel)] border border-[var(--color-line-subtle)] bg-[var(--color-surface-raised)] p-4 sm:grid-cols-2 md:p-5 xl:grid-cols-[repeat(3,minmax(12rem,1fr))_auto] xl:items-end"
      >
        <label className="grid gap-2 text-sm font-semibold">
          <span>Sort results</span>
          <select name="sort" defaultValue={sort} className={controlClass}>
            <option value="date">Date · earliest first</option>
            <option value="distance">Distance · nearest first</option>
            <option value="velocity">Velocity · fastest first</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          <span>Maximum nominal distance</span>
          <select
            name="distance"
            defaultValue={String(maximumLd)}
            className={controlClass}
          >
            <option value="1">1 lunar distance</option>
            <option value="5">5 lunar distances</option>
            <option value="10">10 lunar distances</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          <span>Size knowledge</span>
          <select name="size" defaultValue={size} className={controlClass}>
            <option value="all">Known and unknown</option>
            <option value="known">Known diameter only</option>
            <option value="unknown">Unknown diameter only</option>
          </select>
        </label>
        <button
          type="submit"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[var(--color-signal)] px-4 font-semibold text-[var(--color-cosmos)]"
        >
          <Funnel aria-hidden="true" /> Apply
        </button>
      </form>

      <section aria-labelledby="approach-results" className="mt-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="data-label">
              {approaches.length} results ·{" "}
              {fixtureMode
                ? "fixture demonstration"
                : `JPL snapshot ${source?.freshness ?? "unavailable"}`}
            </p>
            <h2 id="approach-results" className="mt-1 text-2xl font-semibold">
              Approach feed
            </h2>
          </div>
          <p
            role="status"
            className="text-sm text-[var(--color-text-secondary)]"
          >
            Sorted by {sort === "date" ? "date" : sort}
          </p>
        </div>

        {approaches.length ? (
          <>
            <ul className="mt-4 grid gap-3 md:hidden">
              {approaches.map(({ approach, distanceSummary }) => (
                <li
                  key={approach.id}
                  className="max-w-full min-w-0 rounded-[var(--radius-panel)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 [overflow-wrap:anywhere]">
                      <h3 className="font-semibold">
                        {approach.objectName ?? approach.designation}
                      </h3>
                      <p className="mt-1 font-mono text-xs text-[var(--color-text-muted)]">
                        {approach.designation}
                      </p>
                    </div>
                    <span className="rounded-full border border-[var(--color-line)] px-2 py-1 text-xs">
                      JPL computed
                    </span>
                  </div>
                  <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <dt className="data-label">Approach · UTC</dt>
                      <dd className="mt-1 text-sm">
                        {date(approach.closeApproachAt)}
                      </dd>
                    </div>
                    <div>
                      <dt className="data-label">Nominal distance</dt>
                      <dd className="tabular mt-1">
                        {number(
                          approach.nominalDistance.value * ASTRONOMICAL_UNIT_KM,
                          0,
                        )}{" "}
                        km
                        <br />
                        <span className="text-sm text-[var(--color-text-secondary)]">
                          {number(approach.nominalDistanceLunar.value, 3)} LD
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="data-label">Relative velocity</dt>
                      <dd className="tabular mt-1">
                        {number(approach.relativeVelocity.value, 3)} km/s
                      </dd>
                    </div>
                    <div>
                      <dt className="data-label">Diameter</dt>
                      <dd className="tabular mt-1">
                        {approach.diameter
                          ? `${number(approach.diameter.value, 3)} km`
                          : "Unknown—not supplied"}
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-4 text-sm leading-6 text-[var(--color-text-secondary)]">
                    {distanceSummary}
                  </p>
                </li>
              ))}
            </ul>

            <div
              className="mt-4 hidden overflow-x-auto rounded-[var(--radius-panel)] border border-[var(--color-line)] md:block"
              role="region"
              aria-label="Near-Earth approach data table"
              tabIndex={0}
            >
              <table className="w-full min-w-[880px] border-collapse text-left">
                <caption className="sr-only">
                  Upcoming Earth close approaches with JPL-calculated distance,
                  uncertainty, velocity, and available diameter.
                </caption>
                <thead className="bg-[var(--color-surface-raised)] text-xs text-[var(--color-text-secondary)]">
                  <tr>
                    <th className="p-3" scope="col">
                      Object
                    </th>
                    <th className="p-3" scope="col">
                      Approach · UTC
                    </th>
                    <th className="p-3" scope="col">
                      Nominal distance
                    </th>
                    <th className="p-3" scope="col">
                      Uncertainty range
                    </th>
                    <th className="p-3" scope="col">
                      Velocity
                    </th>
                    <th className="p-3" scope="col">
                      Diameter
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {approaches.map(({ approach }) => {
                    const minimum = approach.minimumDistanceLunar?.value;
                    const maximum = approach.maximumDistanceLunar?.value;
                    return (
                      <tr
                        key={approach.id}
                        className="border-t border-[var(--color-line-subtle)] bg-[var(--color-surface)]"
                      >
                        <th scope="row" className="p-3">
                          <span className="block font-semibold">
                            {approach.objectName ?? approach.designation}
                          </span>
                          <span className="font-mono text-xs font-normal text-[var(--color-text-muted)]">
                            {approach.designation}
                          </span>
                        </th>
                        <td className="p-3 text-sm">
                          {date(approach.closeApproachAt)}
                        </td>
                        <td
                          className="tabular p-3"
                          title={`${approach.nominalDistance.value} au`}
                        >
                          <span className="block">
                            {number(
                              approach.nominalDistance.value *
                                ASTRONOMICAL_UNIT_KM,
                              0,
                            )}{" "}
                            km
                          </span>
                          <span className="text-sm text-[var(--color-text-secondary)]">
                            {number(approach.nominalDistanceLunar.value, 3)} LD
                          </span>
                        </td>
                        <td className="tabular p-3 text-sm">
                          {minimum !== undefined && maximum !== undefined
                            ? `${number(minimum, 3)}–${number(maximum, 3)} LD`
                            : "Not supplied"}
                        </td>
                        <td className="tabular p-3">
                          {number(approach.relativeVelocity.value, 3)} km/s
                        </td>
                        <td className="tabular p-3">
                          {approach.diameter ? (
                            <span
                              title={
                                approach.diameter.uncertainty
                                  ? `${approach.diameter.uncertainty.lower}–${approach.diameter.uncertainty.upper} km, ${approach.diameter.uncertainty.confidenceLabel}`
                                  : undefined
                              }
                            >
                              {number(approach.diameter.value, 3)} km
                            </span>
                          ) : (
                            "Unknown—not supplied"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="mt-4 rounded-[var(--radius-panel)] border border-[var(--color-line)] bg-[var(--color-surface)] p-6">
            <h3 className="text-xl font-semibold">
              {source?.fetchedAt
                ? "No approaches match these constraints"
                : "JPL approach snapshot unavailable"}
            </h3>
            <p className="mt-2 text-[var(--color-text-secondary)]">
              {source?.fetchedAt
                ? "The distance or size-knowledge filter removed every result."
                : "No validated JPL CAD snapshot is stored. AstraOps will not substitute generated approaches in live mode."}
            </p>
            <Link
              href="/approaches"
              className="mt-3 inline-flex min-h-11 items-center font-semibold text-[var(--color-signal)] underline"
            >
              Clear filters
            </Link>
          </div>
        )}
      </section>

      <aside
        className="mt-6 rounded-[var(--radius-panel)] border border-[var(--color-line-subtle)] bg-[var(--color-surface)] p-4 text-sm leading-6 text-[var(--color-text-secondary)] md:p-5"
        aria-label="Distance and time methodology"
      >
        <div className="flex gap-3">
          <Info
            aria-hidden="true"
            className="mt-1 size-5 shrink-0 text-[var(--color-signal)]"
          />
          <div className="min-w-0 [overflow-wrap:anywhere]">
            <h2 className="font-semibold text-[var(--color-text)]">
              How to read this feed
            </h2>
            <p className="mt-1">
              1 LD uses the mean Earth–Moon distance of{" "}
              {number(MEAN_LUNAR_DISTANCE_KM, 0)} km. JPL supplies
              close-approach time in TDB; AstraOps labels its approximate UTC
              conversion. Diameter and uncertainty appear only when supplied.
            </p>
            <a
              href="https://ssd-api.jpl.nasa.gov/doc/cad.html"
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex min-h-11 max-w-full items-center gap-2 font-semibold text-[var(--color-signal)] underline"
            >
              NASA/JPL CAD documentation{" "}
              <ArrowRight aria-hidden="true" className="shrink-0" />
            </a>
          </div>
        </div>
      </aside>
    </div>
  );
}
