import {
  ArrowRight,
  Clock,
  Flask,
  GlobeHemisphereWest,
  Path,
  RocketLaunch,
  Warning,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { DataStatePanel } from "@/components/data/data-state";
import { SourceBadge } from "@/components/data/source-badge";
import { buttonVariants } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  approachFixture,
  commandLaunches,
  orbitalObjectFixture,
  weatherFixture,
} from "@/features/command/command.fixtures";
import { OrbitalOverview } from "@/features/command/orbital-overview";

function formatUtc(
  value: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "UTC",
    ...options,
  }).format(new Date(value));
}

export default function CommandCenterPage() {
  const nextLaunch = commandLaunches[0];
  return (
    <div>
      <header className="flex flex-col gap-5 border-b border-[var(--color-line-subtle)] pb-6 md:flex-row md:items-end md:justify-between lg:pb-8">
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <p className="data-label">
              Command center / 02 Sep 2026 · 04:10 UTC
            </p>
            <StatusBadge state="fresh" label="Fixture data · Contract valid" />
          </div>
          <h1 className="max-w-3xl text-4xl leading-[1.02] font-semibold tracking-[-0.045em] text-balance md:text-5xl">
            The operating picture, without the guesswork.
          </h1>
        </div>
        <p className="max-w-md text-base leading-7 text-[var(--color-text-secondary)]">
          One evidence-led briefing across global launches, space weather,
          orbital objects, and near-Earth approaches.
        </p>
      </header>

      <section
        aria-labelledby="now-heading"
        className="mt-5 grid gap-4 lg:grid-cols-12 lg:gap-5"
      >
        <h2 id="now-heading" className="sr-only">
          Now in orbit
        </h2>
        <div className="order-2 lg:order-1 lg:col-span-8">
          <OrbitalOverview />
        </div>

        <Panel className="order-1 flex min-h-[430px] flex-col lg:order-2 lg:col-span-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="data-label">Now in orbit</p>
            <SourceBadge source={nextLaunch.source} ageLabel="Fresh 15m" />
          </div>

          <div className="flex flex-1 flex-col justify-center py-8">
            <div className="mb-4 flex items-center gap-2 text-[var(--color-signal)]">
              <RocketLaunch aria-hidden="true" className="size-5" />
              <span className="font-mono text-xs font-semibold tracking-[0.05em] uppercase">
                Next verified event
              </span>
            </div>
            <p className="tabular font-mono text-sm text-[var(--color-text-muted)]">
              {formatUtc(nextLaunch.window.start)} UTC
            </p>
            <p className="tabular mt-3 text-4xl font-semibold tracking-[-0.04em]">
              T−01d 10h 20m
            </p>
            <h3 className="mt-5 text-2xl font-semibold tracking-[-0.03em]">
              {nextLaunch.name}
            </h3>
            <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
              {nextLaunch.missionDescription}
            </p>

            <dl className="mt-7 grid grid-cols-2 gap-4 border-y border-[var(--color-line-subtle)] py-5">
              <div>
                <dt className="data-label">Status</dt>
                <dd className="mt-2 capitalize">{nextLaunch.status}</dd>
              </div>
              <div>
                <dt className="data-label">Window</dt>
                <dd className="mt-2 capitalize">
                  {nextLaunch.window.precision}
                </dd>
              </div>
            </dl>
          </div>

          <Link
            href="/launches"
            className={buttonVariants({ variant: "primary" })}
          >
            Open mission briefing
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </Panel>
      </section>

      <section aria-labelledby="launch-stream-heading" className="mt-5">
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
            Explore all launches{" "}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
        <Panel className="p-0 md:p-0">
          <ol className="divide-y divide-[var(--color-line-subtle)]">
            {commandLaunches.map((launch, index) => (
              <li
                key={launch.id}
                className="grid gap-4 p-4 md:grid-cols-[2.5rem_1fr_auto] md:items-center md:p-5"
              >
                <span className="hidden font-mono text-xs text-[var(--color-text-muted)] md:block">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="font-semibold">{launch.name}</h3>
                    <StatusBadge
                      state={launch.source.freshness.state}
                      label={launch.status}
                    />
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                    {launch.missionDescription}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-4 md:flex-col md:items-end">
                  <span className="tabular font-mono text-xs text-[var(--color-text-muted)]">
                    {formatUtc(launch.window.start)}Z
                  </span>
                  <SourceBadge source={launch.source} ageLabel="Fresh 15m" />
                </div>
              </li>
            ))}
          </ol>
        </Panel>
      </section>

      <section aria-labelledby="environment-heading" className="mt-8">
        <div>
          <p className="data-label">Environment briefing</p>
          <h2
            id="environment-heading"
            className="mt-2 text-2xl font-semibold tracking-[-0.03em]"
          >
            Conditions around the mission
          </h2>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Warning
                  aria-hidden="true"
                  className="size-5 text-[var(--color-caution)]"
                />
                <p className="data-label">Space weather</p>
              </div>
              <SourceBadge
                source={weatherFixture.source}
                ageLabel="Stale 18m"
              />
            </div>
            <h3 className="mt-6 text-xl font-semibold">
              Minor geomagnetic activity
            </h3>
            <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
              {weatherFixture.summary}
            </p>
            <dl className="mt-6 grid grid-cols-2 gap-4">
              <div>
                <dt className="data-label">Solar wind</dt>
                <dd className="tabular mt-2 text-lg">
                  {weatherFixture.solarWindSpeed?.value} km/s
                </dd>
              </div>
              <div>
                <dt className="data-label">IMF</dt>
                <dd className="tabular mt-2 text-lg">
                  {weatherFixture.interplanetaryMagneticField?.value} nT
                </dd>
              </div>
            </dl>
            <div className="mt-6 border-t border-[var(--color-line-subtle)] pt-4">
              <DataStatePanel
                state="stale"
                title="Serving last-known-good values"
                detail="The fixture refresh is delayed; timestamps and previous values remain visible."
              />
            </div>
          </Panel>

          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <GlobeHemisphereWest
                  aria-hidden="true"
                  className="size-5 text-[var(--color-positive)]"
                />
                <p className="data-label">Orbit watch</p>
              </div>
              <SourceBadge
                source={orbitalObjectFixture.source}
                ageLabel="Fresh 1h 50m"
              />
            </div>
            <h3 className="mt-6 text-xl font-semibold">
              {orbitalObjectFixture.name}
            </h3>
            <p className="mt-2 font-mono text-xs text-[var(--color-text-muted)]">
              NORAD {orbitalObjectFixture.catalogNumber} ·{" "}
              {orbitalObjectFixture.internationalDesignator}
            </p>
            <p className="mt-4 text-sm leading-6 text-[var(--color-text-secondary)]">
              {orbitalObjectFixture.curatedReason}
            </p>
            <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-[var(--color-line-subtle)] pt-5">
              <div>
                <dt className="data-label">Period</dt>
                <dd className="tabular mt-2">
                  {orbitalObjectFixture.period?.value}m
                </dd>
              </div>
              <div>
                <dt className="data-label">Apogee</dt>
                <dd className="tabular mt-2">
                  {orbitalObjectFixture.apogee?.value} km
                </dd>
              </div>
              <div>
                <dt className="data-label">Perigee</dt>
                <dd className="tabular mt-2">
                  {orbitalObjectFixture.perigee?.value} km
                </dd>
              </div>
            </dl>
          </Panel>

          <Panel className="md:col-span-2 xl:col-span-1">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Path
                  aria-hidden="true"
                  className="size-5 text-[var(--color-orbit)]"
                />
                <p className="data-label">Near-Earth approach</p>
              </div>
              <SourceBadge
                source={approachFixture.source}
                ageLabel="Fresh 3h 30m"
              />
            </div>
            <h3 className="mt-6 text-xl font-semibold">
              {approachFixture.designation}
            </h3>
            <p className="tabular mt-2 font-mono text-xs text-[var(--color-text-muted)]">
              Closest approach · {formatUtc(approachFixture.closeApproachAt)}Z
            </p>
            <div className="mt-7 border-y border-[var(--color-line-subtle)] py-6">
              <p className="data-label">Nominal distance</p>
              <p className="tabular mt-2 text-4xl font-semibold tracking-[-0.04em]">
                {approachFixture.nominalDistance.value}{" "}
                <span className="text-lg text-[var(--color-text-muted)]">
                  LD
                </span>
              </p>
              <p className="mt-2 text-xs leading-5 text-[var(--color-text-muted)]">
                Lunar distance: the average Earth–Moon separation. This fixture
                is not classified as potentially hazardous.
              </p>
            </div>
            <div className="mt-5 flex items-center justify-between gap-4">
              <span className="text-sm text-[var(--color-text-secondary)]">
                Relative velocity
              </span>
              <span className="tabular font-mono text-sm">
                {approachFixture.relativeVelocity.value} km/s
              </span>
            </div>
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
                Mission Lab will carry observed conditions, explicit
                assumptions, and reproducible estimates into one shareable
                dossier.
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

      <footer className="flex flex-col gap-3 pt-8 text-xs leading-5 text-[var(--color-text-muted)] sm:flex-row sm:items-center sm:justify-between">
        <p>
          Fixture preview · Source contracts validated · No official agency
          affiliation
        </p>
        <Link
          href="/methodology"
          className="inline-flex min-h-11 items-center gap-2 font-semibold text-[var(--color-signal)] hover:underline"
        >
          <Clock aria-hidden="true" className="size-4" />
          Read methods and freshness rules
        </Link>
      </footer>
    </div>
  );
}
