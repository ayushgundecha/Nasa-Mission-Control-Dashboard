"use client";

import {
  ArrowsClockwise,
  ClockCounterClockwise,
  Cube,
  Minus,
  Pause,
  Play,
  Plus,
} from "@phosphor-icons/react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { PropagatedOrbitPosition } from "@/features/orbit";
import { createBrowserOrbitController } from "@/features/orbit";

import type { OrbitWatchObject } from "./orbit-watch-data";
import { OrbitMap2D } from "./orbit-map-2d";

const OrbitGlobe3D = dynamic(() => import("./orbit-globe-3d"), {
  ssr: false,
  loading: () => (
    <div
      className="grid h-full place-items-center text-sm text-[var(--color-text-secondary)]"
      role="status"
    >
      Preparing the 3D globe…
    </div>
  ),
});

type LaunchSite = Readonly<{
  name: string;
  latitudeDegrees: number;
  longitudeDegrees: number;
}>;
type CameraAction = "reset" | "zoom-in" | "zoom-out";

function categoryLabel(category: OrbitWatchObject["category"]) {
  return category.replaceAll("_", " ");
}

function formatUtc(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function OrbitWatch({
  catalog,
  initialPositions,
  initialUtc,
  launchSites,
  fixtureMode,
  initialSelectedId,
  syncSelectionToUrl = false,
}: {
  catalog: readonly OrbitWatchObject[];
  initialPositions: readonly PropagatedOrbitPosition[];
  initialUtc: string;
  launchSites: readonly LaunchSite[];
  fixtureMode: boolean;
  initialSelectedId?: string;
  syncSelectionToUrl?: boolean;
}) {
  const regionRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<ReturnType<
    typeof createBrowserOrbitController
  > | null>(null);
  const manuallyPausedRef = useRef(false);
  const [mode, setMode] = useState<"2d" | "3d">("2d");
  const [positions, setPositions] = useState(initialPositions);
  const [selectedId, setSelectedId] = useState(
    initialSelectedId ?? catalog[0]?.object.id ?? "",
  );
  const [paused, setPaused] = useState(false);
  const [calculatedAt, setCalculatedAt] = useState(initialUtc);
  const [scrubHours, setScrubHours] = useState(0);
  const [workerDuration, setWorkerDuration] = useState(0);
  const [webglFailed, setWebglFailed] = useState(false);
  const [cameraCommand, setCameraCommand] = useState<{
    sequence: number;
    action: CameraAction;
  }>({ sequence: 0, action: "reset" });
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    const controller = createBrowserOrbitController(new Date(initialUtc));
    controllerRef.current = controller;
    controller.start(
      catalog.map((entry) => entry.object),
      (response) => {
        const next = response.results.flatMap((result) =>
          result.ok ? [result.position] : [],
        );
        setPositions(next);
        setCalculatedAt(response.calculatedAt);
        setWorkerDuration(response.durationMs);
      },
    );
    const region = regionRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting && !manuallyPausedRef.current)
          controller.resume();
        else controller.pause();
      },
      { rootMargin: "160px", threshold: 0.05 },
    );
    if (region) observer.observe(region);
    return () => {
      observer.disconnect();
      controller.dispose();
      controllerRef.current = null;
    };
  }, [catalog, initialUtc]);

  const selected = useMemo(
    () => catalog.find((entry) => entry.object.id === selectedId) ?? catalog[0],
    [catalog, selectedId],
  );
  const selectedPosition = positions.find(
    (position) => position.objectId === selected?.object.id,
  );

  const togglePause = () => {
    const nextPaused = !paused;
    manuallyPausedRef.current = nextPaused;
    setPaused(nextPaused);
    if (nextPaused) controllerRef.current?.pause();
    else controllerRef.current?.resume();
  };
  const scrub = (hours: number) => {
    setScrubHours(hours);
    controllerRef.current?.scrub(hours * 60 * 60 * 1_000);
  };
  const resetTime = () => {
    setScrubHours(0);
    controllerRef.current?.reset(new Date(initialUtc));
  };
  const camera = (action: CameraAction) =>
    setCameraCommand((current) => ({ sequence: current.sequence + 1, action }));
  const recoverTo2D = useCallback(() => {
    setWebglFailed(true);
    setMode("2d");
  }, []);
  useEffect(() => {
    if (!syncSelectionToUrl) return;
    const restoreSelection = () => {
      const catalogNumber = new URL(window.location.href).searchParams.get(
        "selected",
      );
      const restored = catalog.find(
        (entry) => entry.object.catalogNumber === catalogNumber,
      );
      if (restored) setSelectedId(restored.object.id);
    };
    window.addEventListener("popstate", restoreSelection);
    return () => window.removeEventListener("popstate", restoreSelection);
  }, [catalog, syncSelectionToUrl]);
  const selectObject = useCallback(
    (id: string) => {
      setSelectedId(id);
      if (!syncSelectionToUrl) return;
      const url = new URL(window.location.href);
      url.searchParams.set("selected", id.replace("celestrak:", ""));
      window.history.pushState(window.history.state, "", url);
    },
    [syncSelectionToUrl],
  );

  return (
    <section
      ref={regionRef}
      aria-labelledby="orbit-watch-title"
      className="mt-6"
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(19rem,0.72fr)]">
        <div className="min-w-0 rounded-[var(--radius-panel)] border border-[var(--color-line-subtle)] bg-[var(--color-surface)] p-3 md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="data-label">Spatial view · propagated</p>
              <h2
                id="orbit-watch-title"
                className="mt-1 text-2xl font-semibold tracking-[-0.025em] md:text-3xl"
              >
                Orbit watch
              </h2>
              <p className="mt-2 max-w-[68ch] text-sm leading-6 text-[var(--color-text-secondary)]">
                Positions are AstraOps calculations from CelesTrak mean
                elements—not direct spacecraft telemetry.
              </p>
            </div>
            <div
              className="inline-flex rounded-[var(--radius-control)] border border-[var(--color-line)] p-1"
              aria-label="Spatial view mode"
            >
              {(["2d", "3d"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={mode === option}
                  disabled={option === "3d" && webglFailed}
                  onClick={() => setMode(option)}
                  className="min-h-11 min-w-14 rounded px-3 text-sm font-semibold uppercase disabled:cursor-not-allowed disabled:opacity-45 aria-pressed:bg-[var(--color-signal)] aria-pressed:text-[var(--color-cosmos)]"
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {webglFailed ? (
            <p
              role="status"
              className="mt-4 rounded-[var(--radius-control)] border border-[var(--color-caution)] p-3 text-sm text-[var(--color-text-secondary)]"
            >
              3D rendering is unavailable in this browser. The complete 2D map,
              object list, and controls remain available.
            </p>
          ) : null}

          <div className="mt-4">
            {mode === "3d" ? (
              <div className="relative h-[320px] overflow-hidden rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-cosmos)] md:aspect-[16/10] md:h-auto">
                <OrbitGlobe3D
                  positions={positions}
                  launchSites={launchSites}
                  selectedId={selectedId}
                  paused={paused}
                  reducedMotion={reducedMotion}
                  cameraCommand={cameraCommand}
                  onSelect={selectObject}
                  onFailure={recoverTo2D}
                />
              </div>
            ) : (
              <OrbitMap2D
                catalog={catalog}
                positions={positions}
                selectedId={selectedId}
                launchSites={launchSites}
                onSelect={selectObject}
              />
            )}
          </div>

          <div
            className="mt-3 flex flex-wrap items-center gap-2"
            aria-label="Visualization controls"
          >
            <Button
              variant="secondary"
              size="compact"
              onClick={togglePause}
              aria-pressed={paused}
            >
              {paused ? (
                <Play aria-hidden="true" />
              ) : (
                <Pause aria-hidden="true" />
              )}
              {paused ? "Resume" : "Pause"}
            </Button>
            <Button
              variant="quiet"
              size="icon"
              aria-label="Zoom in"
              onClick={() => camera("zoom-in")}
              disabled={mode === "2d"}
            >
              <Plus aria-hidden="true" />
            </Button>
            <Button
              variant="quiet"
              size="icon"
              aria-label="Zoom out"
              onClick={() => camera("zoom-out")}
              disabled={mode === "2d"}
            >
              <Minus aria-hidden="true" />
            </Button>
            <Button
              variant="secondary"
              size="compact"
              onClick={() => camera("reset")}
              disabled={mode === "2d"}
            >
              <ArrowsClockwise aria-hidden="true" /> Reset view
            </Button>
            <Button variant="quiet" size="compact" onClick={resetTime}>
              <ClockCounterClockwise aria-hidden="true" /> Reset time
            </Button>
          </div>

          <div className="mt-4 grid gap-2 border-t border-[var(--color-line-subtle)] pt-4">
            <label
              htmlFor="orbit-time"
              className="flex flex-wrap items-baseline justify-between gap-2 text-sm font-semibold"
            >
              <span>Time offset</span>
              <output
                htmlFor="orbit-time"
                className="font-mono text-[var(--color-signal)]"
              >
                {scrubHours > 0 ? "+" : ""}
                {scrubHours} h
              </output>
            </label>
            <input
              id="orbit-time"
              type="range"
              min="-24"
              max="24"
              step="1"
              value={scrubHours}
              onChange={(event) => scrub(Number(event.currentTarget.value))}
              className="h-11 w-full accent-[var(--color-signal)]"
            />
            <div className="flex flex-wrap justify-between gap-2 text-xs text-[var(--color-text-muted)]">
              <span>−24 h</span>
              <span className="tabular">
                Calculated {formatUtc(calculatedAt)} UTC
              </span>
              <span>+24 h</span>
            </div>
          </div>
        </div>

        <aside
          aria-label="Selected orbital object"
          className="min-w-0 rounded-[var(--radius-panel)] border border-[var(--color-line-subtle)] bg-[var(--color-surface-raised)] p-4 md:p-5"
        >
          <p className="data-label">Selected object</p>
          <h3 className="mt-2 text-xl font-semibold">
            {selected?.object.name ?? "Unavailable"}
          </h3>
          <p className="mt-1 font-mono text-xs text-[var(--color-text-muted)]">
            NORAD {selected?.object.catalogNumber}
          </p>
          {selected && selectedPosition ? (
            <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5">
              <div>
                <dt className="data-label">Altitude · calculated</dt>
                <dd className="tabular mt-1 text-lg">
                  {selectedPosition.altitudeKm.toFixed(0)} km
                </dd>
              </div>
              <div>
                <dt className="data-label">Inclination</dt>
                <dd className="tabular mt-1 text-lg">
                  {selected.object.inclination.value.toFixed(2)}°
                </dd>
              </div>
              <div>
                <dt className="data-label">Latitude</dt>
                <dd className="tabular mt-1">
                  {selectedPosition.latitudeDegrees.toFixed(2)}°
                </dd>
              </div>
              <div>
                <dt className="data-label">Longitude</dt>
                <dd className="tabular mt-1">
                  {selectedPosition.longitudeDegrees.toFixed(2)}°
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="data-label">Element epoch</dt>
                <dd className="mt-1 font-mono text-xs leading-5">
                  {formatUtc(selected.object.epoch)} UTC
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="data-label">Velocity · calculated</dt>
                <dd className="tabular mt-1">
                  {Math.hypot(
                    selectedPosition.velocityEciKmPerSecond.x,
                    selectedPosition.velocityEciKmPerSecond.y,
                    selectedPosition.velocityEciKmPerSecond.z,
                  ).toFixed(3)}{" "}
                  km/s
                </dd>
              </div>
              <div>
                <dt className="data-label">Period · estimated</dt>
                <dd className="tabular mt-1">
                  {selected.object.period?.value.toFixed(1) ?? "Unavailable"}{" "}
                  min
                </dd>
              </div>
              <div>
                <dt className="data-label">Epoch age</dt>
                <dd
                  className={`tabular mt-1 ${selectedPosition.staleEpoch ? "text-[var(--color-caution)]" : ""}`}
                >
                  {selectedPosition.epochAgeDays.toFixed(1)} days
                  {selectedPosition.staleEpoch ? " · stale" : ""}
                </dd>
              </div>
            </dl>
          ) : selected ? (
            <p
              role="status"
              className="mt-5 rounded-[var(--radius-control)] border border-[var(--color-caution)] p-3 text-sm leading-6 text-[var(--color-text-secondary)]"
            >
              No physically valid position can be calculated for this object at
              the selected time. Its source elements remain visible; reset time
              or choose another object.
            </p>
          ) : null}
          <div className="mt-5 border-t border-[var(--color-line-subtle)] pt-4 text-sm leading-6 text-[var(--color-text-secondary)]">
            <p>{selected?.object.curatedReason}</p>
            <p className="mt-3">
              <span className="font-semibold text-[var(--color-text)]">
                Observed elements:
              </span>{" "}
              <a
                href={selected?.object.source.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center text-[var(--color-signal)] underline underline-offset-4"
              >
                CelesTrak OMM
              </a>{" "}
              · {fixtureMode ? "fixture demonstration" : "provider snapshot"}
            </p>
            <p>
              <span className="font-semibold text-[var(--color-text)]">
                Method:
              </span>{" "}
              satellite.js SGP4 · TEME → pseudo-ECEF/WGS-84
            </p>
            <p className="mt-3 font-mono text-xs">
              Worker compute {workerDuration.toFixed(1)} ms
            </p>
          </div>
        </aside>
      </div>

      <div className="mt-4 rounded-[var(--radius-panel)] border border-[var(--color-line-subtle)] bg-[var(--color-surface)] p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="data-label">Accessible equivalent</p>
            <h3 className="mt-1 text-xl font-semibold">
              Synchronized object list
            </h3>
          </div>
          <div
            className="flex flex-wrap gap-3 text-xs text-[var(--color-text-secondary)]"
            aria-label="Map legend"
          >
            <span>
              <span className="mr-1 inline-block size-2 rounded-full bg-[var(--color-orbit)]" />
              Calculated object
            </span>
            <span>
              <span className="mr-1 inline-block size-2 rotate-45 bg-[var(--color-caution)]" />
              Launch site
            </span>
            <span>
              <Cube aria-hidden="true" className="mr-1 inline" />
              Not to scale
            </span>
          </div>
        </div>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {catalog.map((entry) => {
            const position = positions.find(
              (item) => item.objectId === entry.object.id,
            );
            const isSelected = entry.object.id === selectedId;
            return (
              <li key={entry.object.id}>
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => selectObject(entry.object.id)}
                  className="min-h-20 w-full rounded-[var(--radius-control)] border border-[var(--color-line)] p-3 text-left hover:bg-[var(--color-surface-hover)] aria-pressed:border-[var(--color-signal)] aria-pressed:shadow-[inset_3px_0_0_var(--color-signal)]"
                >
                  <span className="block font-semibold">
                    {entry.object.name}
                  </span>
                  <span className="mt-1 block text-xs text-[var(--color-text-muted)] capitalize">
                    {categoryLabel(entry.category)} ·{" "}
                    {position
                      ? `${position.altitudeKm.toFixed(0)} km`
                      : "No valid position"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
