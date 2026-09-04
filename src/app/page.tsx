import {
  ArrowRight,
  Broadcast,
  Clock,
  Flask,
  Gauge,
  GlobeHemisphereWest,
  Path,
  RocketLaunch,
  ShieldCheck,
  Sparkle,
  Warning,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import type { Route } from "next";
import { Suspense } from "react";

import { readProductData, type SourceSummary } from "@/api/data";
import { overviewEnvelope } from "@/api/service";
import { DataStatePanel } from "@/components/data/data-state";
import { SourceBadge } from "@/components/data/source-badge";
import { buttonVariants } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { FreshnessState, Launch } from "@/domain";
import { OrbitalOverview } from "@/features/command/orbital-overview";
import { getServerEnvironment } from "@/lib/env";

import { BackgroundRefresh } from "./_components/background-refresh";
import { KpTrend } from "./_components/kp-trend";
import { LaunchCountdown } from "./_components/launch-countdown";

export const dynamic = "force-dynamic";

const freshnessOrder: Record<FreshnessState, number> = {
  live: 0,
  current: 1,
  delayed: 2,
  stale: 3,
  unavailable: 4,
};

function formatUtc(value: string): string {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "UTC",
  }).format(new Date(value));
}

function ageLabel(
  source: SourceSummary,
  generatedAt: string,
  fixtureMode: boolean,
): string {
  if (fixtureMode) return "fixture snapshot";
  if (!source.fetchedAt) return "Unavailable";
  const minutes = Math.max(
    0,
    Math.floor(
      (Date.parse(generatedAt) - Date.parse(source.fetchedAt)) / 60_000,
    ),
  );
  const age =
    minutes < 1
      ? "now"
      : minutes < 60
        ? `${minutes}m`
        : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  return `${source.freshness} · ${age}`;
}

function sourceFor(
  sources: readonly SourceSummary[],
  provider: string,
  dataset?: string,
): SourceSummary {
  return (
    sources.find(
      (source) =>
        source.provider === provider &&
        (dataset === undefined || source.dataset === dataset),
    ) ?? {
      provider,
      dataset: dataset ?? "unknown",
      freshness: "unavailable",
      fetchedAt: null,
    }
  );
}

function launchHref(launch: Launch): Route {
  return `/launches?query=${encodeURIComponent(launch.slug)}` as Route;
}

function LoadingCommandCenter() {
  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-12 lg:gap-5" role="status">
      <span className="sr-only">Loading the cached operating picture</span>
      <Panel raised className="min-h-[430px] lg:col-span-8">
        <DataStatePanel
          state="loading"
          title="Loading operating picture"
          detail="Reading validated launch and space-weather snapshots."
        />
      </Panel>
      <Panel className="min-h-[430px] lg:col-span-4">
        <DataStatePanel
          state="loading"
          title="Loading mission briefing"
          detail="The first verified event will appear here."
        />
      </Panel>
    </div>
  );
}

async function CommandCenterData({ fixtureMode }: { fixtureMode: boolean }) {
  let product;
  try {
    product = await readProductData();
  } catch {
    return (
      <Panel className="mt-5">
        <DataStatePanel
          state="error"
          title="The cached operating picture is unavailable"
          detail="AstraOps could not read its validated snapshots. No substitute values were generated."
          actionHref="/methodology"
          actionLabel="Review data recovery and sources"
        />
      </Panel>
    );
  }

  const overview = overviewEnvelope(product);
  const launches = overview.data.nextLaunches;
  const nextLaunch = launches[0] ?? null;
  const weather = overview.data.spaceWeather;
  const kp = weather.currentKp;
  const launchSource = sourceFor(
    overview.sources,
    "launch_library_2",
    "launches_upcoming",
  );
  const noaaSource = sourceFor(overview.sources, "noaa_swpc", "kp_forecast");
  const donkiSource = sourceFor(overview.sources, "nasa_donki");
  const celestrakSource = sourceFor(overview.sources, "celestrak");
  const jplSource = sourceFor(overview.sources, "jpl_cad");
  const worstFreshness = overview.sources.reduce<FreshnessState>(
    (worst, source) =>
      freshnessOrder[source.freshness] > freshnessOrder[worst]
        ? source.freshness
        : worst,
    "live",
  );
  const currentSources = overview.sources.filter(
    (source) => source.freshness === "live" || source.freshness === "current",
  ).length;
  const notableEvent = [...weather.recentEvents].sort(
    (left, right) => Date.parse(right.startedAt) - Date.parse(left.startedAt),
  )[0];

  return (
    <>
      <BackgroundRefresh />

      {overview.partial ||
      worstFreshness === "stale" ||
      worstFreshness === "delayed" ? (
        <div
          className="mt-5 rounded-[var(--radius-panel)] border border-[var(--color-caution)]/45 bg-[var(--color-caution)]/5 p-4"
          role="status"
        >
          <div className="flex items-start gap-3">
            <Warning
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0 text-[var(--color-caution)]"
            />
            <div>
              <p className="font-semibold">
                Operating with a partial or delayed source picture
              </p>
              <p className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">
                Last-known-good facts remain visible with their timestamps.
                Missing providers are never replaced with estimates.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <section
        aria-labelledby="now-heading"
        className="mt-5 grid gap-4 lg:grid-cols-12 lg:gap-5"
      >
        <h2 id="now-heading" className="sr-only">
          Current operating picture
        </h2>
        <div className="order-2 lg:order-1 lg:col-span-8">
          <OrbitalOverview
            launchAt={nextLaunch?.window.start ?? null}
            launchName={nextLaunch?.name ?? null}
            kp={kp?.kp ?? null}
            weatherBand={kp?.interpretation.band ?? "unknown"}
          />
        </div>

        <Panel className="order-1 flex min-h-[430px] flex-col lg:order-2 lg:col-span-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="data-label">Now / next verified event</p>
            {nextLaunch ? (
              <SourceBadge
                source={nextLaunch.source}
                freshnessState={
                  fixtureMode ? "current" : launchSource.freshness
                }
                ageLabel={ageLabel(
                  launchSource,
                  overview.generatedAt,
                  fixtureMode,
                )}
              />
            ) : null}
          </div>

          {nextLaunch ? (
            <div className="flex flex-1 flex-col justify-center py-8">
              <div className="mb-5 flex items-center gap-2 text-[var(--color-signal)]">
                <RocketLaunch aria-hidden="true" className="size-5" />
                <span className="font-mono text-xs font-semibold tracking-[0.05em] uppercase">
                  {fixtureMode
                    ? "Provider-shaped fixture schedule"
                    : "Provider-backed schedule"}
                </span>
              </div>
              <LaunchCountdown
                start={nextLaunch.window.start}
                end={nextLaunch.window.end}
                precision={nextLaunch.window.precision}
              />
              <p className="tabular mt-5 font-mono text-xs text-[var(--color-text-muted)]">
                {formatUtc(nextLaunch.window.start)} UTC
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-[-0.035em]">
                {nextLaunch.name}
              </h3>
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--color-text-secondary)]">
                {nextLaunch.missionDescription ??
                  "The provider has not supplied a mission description."}
              </p>
              <dl className="mt-6 grid grid-cols-2 gap-4 border-y border-[var(--color-line-subtle)] py-5">
                <div>
                  <dt className="data-label">Status</dt>
                  <dd className="mt-2 capitalize">
                    {nextLaunch.status.replaceAll("_", " ")}
                  </dd>
                </div>
                <div>
                  <dt className="data-label">Precision</dt>
                  <dd className="mt-2 capitalize">
                    {nextLaunch.window.precision}
                  </dd>
                </div>
              </dl>
            </div>
          ) : (
            <div className="flex flex-1 items-center py-8">
              <DataStatePanel
                state="empty"
                title="No launch is cached"
                detail="The source may be initializing or no launch matches the current operating window."
                actionHref="/methodology"
                actionLabel="Review source coverage"
              />
            </div>
          )}

          <Link
            href={nextLaunch ? launchHref(nextLaunch) : "/launches"}
            className={buttonVariants({ variant: "primary" })}
          >
            Open mission briefing
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </Panel>
      </section>

      <section aria-labelledby="launch-stream-heading" className="mt-8">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="data-label">Launch stream</p>
            <h2
              id="launch-stream-heading"
              className="mt-2 text-2xl font-semibold tracking-[-0.03em]"
            >
              What leaves Earth next
            </h2>
          </div>
          <Link
            href="/launches"
            className="hidden min-h-11 items-center gap-2 text-sm font-semibold text-[var(--color-signal)] hover:underline sm:inline-flex"
          >
            Explore all launches
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
        {launches.length > 0 ? (
          <Panel className="p-0 md:p-0">
            <ol className="divide-y divide-[var(--color-line-subtle)]">
              {launches.slice(0, 3).map((launch, index) => (
                <li
                  key={launch.id}
                  className="grid gap-4 p-4 md:grid-cols-[2.5rem_1fr_auto] md:items-center md:p-5"
                >
                  <span
                    aria-hidden="true"
                    className="hidden font-mono text-xs text-[var(--color-text-muted)] md:block"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-semibold">
                        <Link
                          href={launchHref(launch)}
                          className="inline-flex min-h-11 items-center rounded-sm py-2 hover:text-[var(--color-signal)]"
                        >
                          {launch.name}
                        </Link>
                      </h3>
                      <StatusBadge
                        state={launchSource.freshness}
                        label={launch.status.replaceAll("_", " ")}
                      />
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                      {launch.missionDescription ??
                        "Mission description unavailable."}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-4 md:flex-col md:items-end">
                    <span className="tabular font-mono text-xs text-[var(--color-text-muted)]">
                      {formatUtc(launch.window.start)}Z
                    </span>
                    <span className="font-mono text-xs text-[var(--color-text-secondary)] capitalize">
                      {launch.window.precision} precision
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>
        ) : (
          <Panel>
            <DataStatePanel
              state="empty"
              title="No upcoming launches"
              detail="There are no validated launch records in the current cache."
              actionHref="/methodology"
              actionLabel="Review launch coverage"
            />
          </Panel>
        )}
      </section>

      <section aria-labelledby="environment-heading" className="mt-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="data-label">Environment briefing</p>
            <h2
              id="environment-heading"
              className="mt-2 text-2xl font-semibold tracking-[-0.03em]"
            >
              Conditions around the mission
            </h2>
          </div>
          <Link
            href="/environment"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--color-signal)] hover:underline"
          >
            Open environment desk
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-12">
          <Panel raised className="xl:col-span-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Gauge
                    aria-hidden="true"
                    className="size-5 text-[var(--color-signal)]"
                  />
                  <p className="data-label">
                    Planetary K-index / recent + forecast
                  </p>
                </div>
                <h3 className="mt-3 text-xl font-semibold">
                  Geomagnetic activity trend
                </h3>
              </div>
              {kp ? (
                <SourceBadge
                  source={kp.source}
                  freshnessState={
                    fixtureMode ? "current" : noaaSource.freshness
                  }
                  ageLabel={ageLabel(
                    noaaSource,
                    overview.generatedAt,
                    fixtureMode,
                  )}
                />
              ) : null}
            </div>
            <KpTrend
              observed={weather.recentKp}
              forecast={weather.forecastKp}
            />
          </Panel>

          <div className="grid gap-4 md:grid-cols-2 xl:col-span-5 xl:grid-cols-1">
            <Panel>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Broadcast
                    aria-hidden="true"
                    className="size-5 text-[var(--color-positive)]"
                  />
                  <p className="data-label">NOAA conditions</p>
                </div>
                <StatusBadge
                  state={fixtureMode ? "current" : noaaSource.freshness}
                  label={fixtureMode ? "fixture" : noaaSource.freshness}
                />
              </div>
              <h3 className="mt-5 text-xl font-semibold">
                {kp?.interpretation.label ?? "Kp unavailable"}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                {kp?.interpretation.operationalContext ??
                  "AstraOps will not infer conditions without a valid NOAA measurement."}
              </p>
              <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-[var(--color-line-subtle)] pt-5">
                <div>
                  <dt className="data-label">Kp</dt>
                  <dd className="tabular mt-2 text-xl font-semibold">
                    {kp?.kp ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="data-label">Wind</dt>
                  <dd className="tabular mt-2 text-base">
                    {weather.solarWind.speed?.speedKilometersPerSecond ?? "—"}
                    <span className="ml-1 text-xs text-[var(--color-text-muted)]">
                      km/s
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="data-label">Bz</dt>
                  <dd className="tabular mt-2 text-base">
                    {weather.solarWind.magneticField?.bzGsmNanotesla ?? "—"}
                    <span className="ml-1 text-xs text-[var(--color-text-muted)]">
                      nT
                    </span>
                  </dd>
                </div>
              </dl>
            </Panel>

            <Panel>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sparkle
                    aria-hidden="true"
                    className="size-5 text-[var(--color-caution)]"
                  />
                  <p className="data-label">Recent analyst event</p>
                </div>
                <StatusBadge
                  state={fixtureMode ? "current" : donkiSource.freshness}
                  label={fixtureMode ? "fixture" : weather.availability.donki}
                />
              </div>
              {notableEvent ? (
                <>
                  <h3 className="mt-5 text-xl font-semibold capitalize">
                    {notableEvent.eventType.replaceAll("_", " ")}
                  </h3>
                  <p className="tabular mt-2 font-mono text-xs text-[var(--color-text-muted)]">
                    Recorded {formatUtc(notableEvent.startedAt)} UTC · Analyst
                    event
                  </p>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--color-text-secondary)]">
                    {notableEvent.summary ??
                      "NASA DONKI provides this event record without a narrative summary."}
                  </p>
                </>
              ) : (
                <div className="mt-5">
                  <DataStatePanel
                    state="empty"
                    title="No DONKI event context"
                    detail="NOAA current conditions remain available independently."
                    actionHref="/methodology"
                    actionLabel="Understand provider independence"
                  />
                </div>
              )}
            </Panel>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Panel>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <GlobeHemisphereWest
                  aria-hidden="true"
                  className="size-5 text-[var(--color-orbit)]"
                />
                <p className="data-label">Orbit watch</p>
              </div>
              <StatusBadge
                state={fixtureMode ? "current" : celestrakSource.freshness}
                label={
                  fixtureMode ? "fixture catalog" : celestrakSource.freshness
                }
              />
            </div>
            <h3 className="mt-5 text-xl font-semibold">
              Curated orbital objects
            </h3>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
              {product.orbitalObjects.length > 0
                ? `${product.orbitalObjects.length} curated CelesTrak objects with source elements and AstraOps-computed SGP4 positions.`
                : "No validated CelesTrak snapshot is available. AstraOps does not substitute placeholder orbits."}
            </p>
            <Link
              href="/objects"
              className="mt-3 inline-flex min-h-11 items-center gap-2 font-semibold text-[var(--color-signal)] hover:underline"
            >
              Explore orbital objects
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </Panel>
          <Panel>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Path
                  aria-hidden="true"
                  className="size-5 text-[var(--color-caution)]"
                />
                <p className="data-label">Near-Earth approaches</p>
              </div>
              <StatusBadge
                state={fixtureMode ? "current" : jplSource.freshness}
                label={fixtureMode ? "fixture feed" : jplSource.freshness}
              />
            </div>
            <h3 className="mt-5 text-xl font-semibold">
              JPL approach intelligence
            </h3>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
              {product.nearEarthApproaches.length > 0
                ? `${product.nearEarthApproaches.length} NASA/JPL-shaped approach records with distance, velocity, size, and uncertainty boundaries.`
                : "No validated JPL approach snapshot is available. Proximity is never presented as an impact prediction."}
            </p>
            <Link
              href="/approaches"
              className="mt-3 inline-flex min-h-11 items-center gap-2 font-semibold text-[var(--color-signal)] hover:underline"
            >
              Review close approaches
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </Panel>
        </div>
      </section>

      <section
        className="mt-8 border-y border-[var(--color-line)] py-8 md:py-10"
        aria-labelledby="plan-heading"
      >
        <div className="grid items-center gap-6 md:grid-cols-[1fr_auto]">
          <div className="flex items-start gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-[var(--radius-control)] border border-[var(--color-concept)] text-[var(--color-concept)]">
              <Flask aria-hidden="true" className="size-5" />
            </span>
            <div>
              <p className="data-label">Plan against reality</p>
              <h2
                id="plan-heading"
                className="mt-2 text-2xl font-semibold tracking-[-0.03em]"
              >
                Turn this operating picture into an explainable mission.
              </h2>
              <p className="mt-3 max-w-2xl leading-7 text-[var(--color-text-secondary)]">
                Mission Lab carries observed conditions, explicit assumptions,
                and reproducible estimates into one shareable dossier.
              </p>
            </div>
          </div>
          <Link
            href="/mission-lab"
            className={buttonVariants({ variant: "secondary" })}
          >
            Preview Mission Lab
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </section>

      <footer className="grid gap-5 pt-8 text-xs leading-5 text-[var(--color-text-muted)] md:grid-cols-[1fr_auto] md:items-center">
        <div className="flex items-center gap-3">
          <ShieldCheck
            aria-hidden="true"
            className="size-5 shrink-0 text-[var(--color-positive)]"
          />
          <p>
            {fixtureMode
              ? `${overview.sources.length}/${overview.sources.length} fixture sources loaded`
              : `${currentSources}/${overview.sources.length} sources current`}{" "}
            · Generated {formatUtc(overview.generatedAt)} UTC · Independent
            product, no official agency affiliation
          </p>
        </div>
        <Link
          href="/methodology"
          className="inline-flex min-h-11 items-center gap-2 font-semibold text-[var(--color-signal)] hover:underline"
        >
          <Clock aria-hidden="true" className="size-4" />
          Read methods and freshness rules
        </Link>
      </footer>
    </>
  );
}

export default function CommandCenterPage() {
  const fixtureMode = getServerEnvironment().ASTRAOPS_DATA_MODE === "fixture";

  return (
    <div>
      <header className="flex flex-col gap-5 border-b border-[var(--color-line-subtle)] pb-6 md:flex-row md:items-end md:justify-between lg:pb-8">
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <p className="data-label">
              Command center / cached operating picture
            </p>
            <StatusBadge
              state="current"
              label={
                fixtureMode
                  ? "Validated fixture contracts"
                  : "Validated product contracts"
              }
            />
          </div>
          <h1 className="max-w-3xl text-4xl leading-[1.02] font-semibold tracking-[-0.045em] text-balance md:text-5xl">
            The operating picture, without the guesswork.
          </h1>
        </div>
        <p className="max-w-md text-base leading-7 text-[var(--color-text-secondary)]">
          One evidence-led briefing across global launches and near-Earth space
          weather—with every source and limitation visible.
        </p>
      </header>
      <Suspense fallback={<LoadingCommandCenter />}>
        <CommandCenterData fixtureMode={fixtureMode} />
      </Suspense>
    </div>
  );
}
