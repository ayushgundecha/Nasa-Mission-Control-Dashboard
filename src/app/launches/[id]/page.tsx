import {
  ArrowLeft,
  ArrowSquareOut,
  Broadcast,
  CalendarBlank,
  Factory,
  Flag,
  MapPin,
  RocketLaunch,
  ShieldCheck,
  Timer,
  Warning,
} from "@phosphor-icons/react/dist/ssr";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { readProductData } from "@/api/data";
import { launchDetail } from "@/api/service";
import { DataStatePanel } from "@/components/data/data-state";
import { SourceBadge } from "@/components/data/source-badge";
import { buttonVariants } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  displayCountry,
  formatLaunchWindow,
  launchStatusState,
  textOrUnavailable,
} from "@/features/launches/presentation";
import { getServerEnvironment } from "@/lib/env";

export const dynamic = "force-dynamic";

function safeReturnTo(value: string | string[] | undefined): Route {
  const selected = Array.isArray(value) ? value[0] : value;
  return selected && /^\/launches(?:\?|$)/.test(selected)
    ? (selected as Route)
    : "/launches";
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="data-label">{label}</dt>
      <dd className="mt-2 leading-6">{value}</dd>
    </div>
  );
}

export async function generateMetadata({
  params,
}: PageProps<"/launches/[id]">): Promise<Metadata> {
  const { id } = await params;
  try {
    const detail = launchDetail(await readProductData(), id);
    return detail
      ? {
          title: `${detail.launch.name} — AstraOps dossier`,
          description:
            detail.launch.missionDescription ??
            "Source-stamped global launch dossier.",
        }
      : { title: "Launch not found — AstraOps" };
  } catch {
    return { title: "Launch dossier — AstraOps" };
  }
}

export default async function LaunchDossierPage({
  params,
  searchParams,
}: PageProps<"/launches/[id]">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const fixtureMode = getServerEnvironment().ASTRAOPS_DATA_MODE === "fixture";
  let detail: ReturnType<typeof launchDetail>;
  try {
    detail = launchDetail(await readProductData(), id);
  } catch {
    return (
      <div>
        <Link
          href={safeReturnTo(query.returnTo)}
          className="inline-flex min-h-11 items-center gap-2 font-semibold text-[var(--color-signal)] hover:underline"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back to launch explorer
        </Link>
        <Panel className="mt-5">
          <DataStatePanel
            state="error"
            title="This dossier is temporarily unavailable"
            detail="AstraOps could not read its validated launch snapshot. No mission facts were inferred."
            actionLabel="Review data recovery"
          />
        </Panel>
      </div>
    );
  }
  if (!detail) notFound();

  const { launch, agency, vehicle, mission, media, scheduleChanges } = detail;
  const licensedImage =
    media.image?.credit && media.image.licenseName ? media.image : null;
  const backHref = safeReturnTo(query.returnTo);
  const sourceAge = fixtureMode
    ? "fixture snapshot"
    : launch.source.freshness.state;

  return (
    <article>
      <Link
        href={backHref}
        className="inline-flex min-h-11 items-center gap-2 font-semibold text-[var(--color-signal)] hover:underline"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to launch explorer
      </Link>
      <header className="mt-4 grid gap-6 border-b border-[var(--color-line-subtle)] pb-8 xl:grid-cols-[1fr_auto] xl:items-end">
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <StatusBadge
              state={launchStatusState(launch.status)}
              label={launch.status.replaceAll("_", " ")}
            />
            <span className="font-mono text-xs text-[var(--color-text-muted)]">
              {launch.window.precision} schedule precision
            </span>
          </div>
          <p className="data-label">
            Mission dossier /{" "}
            {mission?.orbitAbbreviation ?? "orbit unavailable"}
          </p>
          <h1 className="mt-3 max-w-4xl text-4xl leading-[1.02] font-semibold tracking-[-0.045em] text-balance md:text-5xl">
            {launch.name}
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-[var(--color-text-secondary)]">
            {textOrUnavailable(launch.missionDescription)}
          </p>
        </div>
        <SourceBadge
          source={launch.source}
          freshnessState={
            fixtureMode ? "current" : launch.source.freshness.state
          }
          ageLabel={sourceAge}
        />
      </header>

      <section
        aria-labelledby="schedule-heading"
        className="mt-6 grid gap-4 xl:grid-cols-12"
      >
        <Panel raised className="xl:col-span-8">
          <div className="flex items-center gap-2 text-[var(--color-signal)]">
            <CalendarBlank aria-hidden="true" className="size-5" />
            <p className="data-label">Provider schedule</p>
          </div>
          <h2
            id="schedule-heading"
            className="tabular mt-5 font-mono text-[clamp(1.8rem,4vw,3.4rem)] leading-tight font-semibold"
          >
            {formatLaunchWindow(launch)}
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
            AstraOps preserves the precision supplied by the schedule provider.
            A date, month, or broad window is never shown as an exact T−0.
          </p>
          <dl className="mt-6 grid gap-5 border-t border-[var(--color-line-subtle)] pt-5 sm:grid-cols-3">
            <Fact
              label="Status"
              value={
                <span className="capitalize">
                  {launch.status.replaceAll("_", " ")}
                </span>
              }
            />
            <Fact
              label="Precision"
              value={
                <span className="capitalize">{launch.window.precision}</span>
              }
            />
            <Fact
              label="Webcast"
              value={
                media.webcastLive
                  ? "Reported live by provider"
                  : media.webcastUrls.length > 0
                    ? "Link available"
                    : "Unavailable from provider"
              }
            />
          </dl>
        </Panel>
        <Panel className="xl:col-span-4">
          <div className="flex items-center gap-2">
            <ShieldCheck
              aria-hidden="true"
              className="size-5 text-[var(--color-positive)]"
            />
            <p className="data-label">Attribution boundary</p>
          </div>
          <h2 className="mt-5 text-xl font-semibold">
            Aggregator is not operator
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
            Launch Library 2 supplies the schedule record. It does not operate
            this mission.
          </p>
          <dl className="mt-5 space-y-5 border-t border-[var(--color-line-subtle)] pt-5">
            <Fact
              label="Launch service provider"
              value={textOrUnavailable(agency?.name)}
            />
            <Fact
              label="Provider type"
              value={
                agency?.type ? (
                  <span className="capitalize">{agency.type}</span>
                ) : (
                  "Unavailable from provider"
                )
              }
            />
          </dl>
        </Panel>
      </section>

      <section className="mt-8" aria-labelledby="mission-facts-heading">
        <p className="data-label">Verified mission anatomy</p>
        <h2 id="mission-facts-heading" className="mt-2 text-2xl font-semibold">
          Mission, vehicle, and launch site
        </h2>
        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          <Panel>
            <div className="flex items-center gap-2">
              <Flag
                aria-hidden="true"
                className="size-5 text-[var(--color-signal)]"
              />
              <h3 className="font-semibold">Mission</h3>
            </div>
            <dl className="mt-5 grid gap-5">
              <Fact label="Name" value={textOrUnavailable(mission?.name)} />
              <Fact label="Type" value={textOrUnavailable(mission?.type)} />
              <Fact
                label="Target orbit"
                value={
                  mission?.orbitName
                    ? `${mission.orbitName}${mission.orbitAbbreviation ? ` (${mission.orbitAbbreviation})` : ""}`
                    : "Unavailable from provider"
                }
              />
            </dl>
          </Panel>
          <Panel>
            <div className="flex items-center gap-2">
              <RocketLaunch
                aria-hidden="true"
                className="size-5 text-[var(--color-orbit)]"
              />
              <h3 className="font-semibold">Launch vehicle</h3>
            </div>
            <dl className="mt-5 grid gap-5">
              <Fact label="Vehicle" value={textOrUnavailable(vehicle?.name)} />
              <Fact label="Family" value={textOrUnavailable(vehicle?.family)} />
              <Fact
                label="Lifecycle"
                value={
                  vehicle?.status ? (
                    <span className="capitalize">{vehicle.status}</span>
                  ) : (
                    "Unavailable from provider"
                  )
                }
              />
              <Fact
                label="Reusable"
                value={
                  vehicle?.reusable === null || vehicle?.reusable === undefined
                    ? "Unavailable from provider"
                    : vehicle.reusable
                      ? "Yes"
                      : "No"
                }
              />
              <Fact
                label="LEO capacity"
                value={
                  vehicle?.payloadToLeo
                    ? `${vehicle.payloadToLeo.value.toLocaleString()} ${vehicle.payloadToLeo.unit}`
                    : "Unavailable from provider"
                }
              />
            </dl>
          </Panel>
          <Panel>
            <div className="flex items-center gap-2">
              <MapPin
                aria-hidden="true"
                className="size-5 text-[var(--color-caution)]"
              />
              <h3 className="font-semibold">Launch site</h3>
            </div>
            <dl className="mt-5 grid gap-5">
              <Fact label="Pad" value={textOrUnavailable(launch.pad?.name)} />
              <Fact
                label="Location"
                value={textOrUnavailable(launch.pad?.locationName)}
              />
              <Fact
                label="Coordinates"
                value={
                  launch.pad?.position
                    ? `${launch.pad.position.latitudeDegrees.toFixed(4)}°, ${launch.pad.position.longitudeDegrees.toFixed(4)}°`
                    : "Unavailable from provider"
                }
              />
              <Fact
                label="Provider countries"
                value={
                  agency?.countryCodes.length
                    ? agency.countryCodes.map(displayCountry).join(", ")
                    : "Unavailable from provider"
                }
              />
            </dl>
          </Panel>
        </div>
      </section>

      <section
        className="mt-8 grid gap-4 xl:grid-cols-2"
        aria-label="Schedule evidence and links"
      >
        <Panel>
          <div className="flex items-center gap-2">
            <Timer
              aria-hidden="true"
              className="size-5 text-[var(--color-caution)]"
            />
            <h2 className="text-xl font-semibold">Schedule change evidence</h2>
          </div>
          {scheduleChanges.length > 0 ? (
            <ol className="mt-5 space-y-4">
              {scheduleChanges.map((change) => (
                <li
                  key={change.id}
                  className="border-l-2 border-[var(--color-caution)] pl-4"
                >
                  <p className="font-semibold capitalize">{change.kind}</p>
                  <p className="tabular mt-1 font-mono text-xs text-[var(--color-text-muted)]">
                    {new Intl.DateTimeFormat("en", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "UTC",
                    }).format(new Date(change.changedAt))}{" "}
                    UTC
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                    {change.comment}
                  </p>
                  {change.sourceUrl ? (
                    <a
                      href={change.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex min-h-11 items-center gap-2 font-semibold text-[var(--color-signal)] hover:underline"
                    >
                      Open change evidence
                      <ArrowSquareOut aria-hidden="true" className="size-4" />
                    </a>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-5 text-sm leading-6 text-[var(--color-text-secondary)]">
              No schedule-change evidence is present in this provider record.
            </p>
          )}
        </Panel>
        <Panel>
          <div className="flex items-center gap-2">
            <Broadcast
              aria-hidden="true"
              className="size-5 text-[var(--color-positive)]"
            />
            <h2 className="text-xl font-semibold">
              Official context and webcast
            </h2>
          </div>
          <div className="mt-5 space-y-2">
            {[...media.informationUrls, ...media.webcastUrls].length > 0 ? (
              [...media.informationUrls, ...media.webcastUrls].map((item) => (
                <a
                  key={item.url}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-11 items-center justify-between gap-3 rounded-[var(--radius-control)] px-3 py-2 text-sm font-semibold text-[var(--color-signal)] hover:bg-[var(--color-surface-hover)]"
                >
                  <span>
                    {item.title ??
                      ("publisher" in item ? item.publisher : item.source) ??
                      "Provider link"}
                  </span>
                  <ArrowSquareOut
                    aria-hidden="true"
                    className="size-4 shrink-0"
                  />
                </a>
              ))
            ) : (
              <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
                No information or webcast links were supplied.
              </p>
            )}
          </div>
          <div className="mt-5 border-t border-[var(--color-line-subtle)] pt-5">
            <p className="data-label">Mission imagery</p>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
              {licensedImage
                ? `Licensed media metadata is available: ${licensedImage.credit} · ${licensedImage.licenseName}.`
                : "Image withheld because complete credit and license metadata were not supplied."}
            </p>
            {licensedImage?.licenseUrl ? (
              <a
                href={licensedImage.licenseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex min-h-11 items-center gap-2 font-semibold text-[var(--color-signal)] hover:underline"
              >
                Review image license
                <ArrowSquareOut aria-hidden="true" className="size-4" />
              </a>
            ) : null}
          </div>
        </Panel>
      </section>

      <section
        className="mt-8 border-y border-[var(--color-line)] py-8"
        aria-labelledby="baseline-heading"
      >
        <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
          <div className="flex items-start gap-3">
            <Factory
              aria-hidden="true"
              className="mt-0.5 size-6 text-[var(--color-concept)]"
            />
            <div>
              <p className="data-label">Phase 4 workflow</p>
              <h2 id="baseline-heading" className="mt-2 text-2xl font-semibold">
                Use as a planning baseline
              </h2>
              <p className="mt-2 max-w-2xl leading-7 text-[var(--color-text-secondary)]">
                This becomes available after the explainable Mission Lab engine
                can preserve schedule evidence and assumptions in a versioned
                mission.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled
            aria-describedby="baseline-availability"
            className={buttonVariants({ variant: "secondary" })}
          >
            Baseline unavailable
          </button>
        </div>
        <p id="baseline-availability" className="sr-only">
          Available in Phase 4 after the Mission Lab engine is approved.
        </p>
      </section>

      <footer className="mt-8 flex items-start gap-3 text-xs leading-5 text-[var(--color-text-muted)]">
        <Warning aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <p>
          Independent product. Schedule data can change; verify the linked
          operator evidence before relying on a launch time.
        </p>
      </footer>
    </article>
  );
}
