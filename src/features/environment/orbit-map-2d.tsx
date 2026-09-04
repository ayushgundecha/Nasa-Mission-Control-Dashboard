"use client";

import type { PropagatedOrbitPosition } from "@/features/orbit";

import type { OrbitWatchObject } from "./orbit-watch-data";

type LaunchSite = Readonly<{
  name: string;
  latitudeDegrees: number;
  longitudeDegrees: number;
}>;

function point(latitude: number, longitude: number) {
  return {
    x: ((longitude + 180) / 360) * 960,
    y: ((90 - latitude) / 180) * 480,
  };
}

export function OrbitMap2D({
  catalog,
  positions,
  selectedId,
  launchSites,
  onSelect,
}: {
  catalog: readonly OrbitWatchObject[];
  positions: readonly PropagatedOrbitPosition[];
  selectedId: string;
  launchSites: readonly LaunchSite[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="relative h-[280px] overflow-hidden rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-void)] md:aspect-[2/1] md:h-auto">
      <svg
        viewBox="0 0 960 480"
        role="img"
        aria-labelledby="orbit-map-title orbit-map-description"
        className="h-full w-full"
      >
        <title id="orbit-map-title">
          Calculated orbital object ground positions
        </title>
        <desc id="orbit-map-description">
          Equal-angle schematic with latitude and longitude grid lines. A
          synchronized list below provides the same objects and facts.
        </desc>
        <rect width="960" height="480" fill="var(--color-void)" />
        {[-120, -60, 0, 60, 120].map((longitude) => (
          <line
            key={`lon-${longitude}`}
            x1={point(0, longitude).x}
            x2={point(0, longitude).x}
            y1="0"
            y2="480"
            stroke="var(--color-line-subtle)"
          />
        ))}
        {[-60, -30, 0, 30, 60].map((latitude) => (
          <line
            key={`lat-${latitude}`}
            x1="0"
            x2="960"
            y1={point(latitude, 0).y}
            y2={point(latitude, 0).y}
            stroke={
              latitude === 0 ? "var(--color-line)" : "var(--color-line-subtle)"
            }
          />
        ))}
        <path
          d="M70 126l82-42 112 30 48 54-66 42-92-15-72 35-54-43zm302-31 97-50 126 13 52 56-29 54-114-8-75 42-87-47zm298 154 92-35 112 36 25 70-74 60-108-15-61-58z"
          fill="var(--color-surface-raised)"
          stroke="var(--color-line)"
          strokeWidth="2"
          opacity="0.9"
        />
        {launchSites.map((site) => {
          const location = point(site.latitudeDegrees, site.longitudeDegrees);
          return (
            <g
              key={site.name}
              transform={`translate(${location.x} ${location.y})`}
            >
              <path d="M0-7 6 5H-6Z" fill="var(--color-caution)" />
              <title>{`Launch site: ${site.name}`}</title>
            </g>
          );
        })}
        {positions.map((position) => {
          const location = point(
            position.latitudeDegrees,
            position.longitudeDegrees,
          );
          const item = catalog.find(
            (entry) => entry.object.id === position.objectId,
          );
          if (!item) return null;
          const selected = position.objectId === selectedId;
          return (
            <g
              key={position.objectId}
              transform={`translate(${location.x} ${location.y})`}
              className="cursor-pointer"
              onClick={() => onSelect(position.objectId)}
              role="presentation"
            >
              <circle
                r={selected ? 11 : 7}
                fill={selected ? "var(--color-signal)" : "var(--color-orbit)"}
                stroke="var(--color-cosmos)"
                strokeWidth="3"
              />
              <title>{`${item.object.name}: ${position.latitudeDegrees.toFixed(1)}°, ${position.longitudeDegrees.toFixed(1)}°`}</title>
            </g>
          );
        })}
      </svg>
      <p className="pointer-events-none absolute right-3 bottom-2 font-mono text-[10px] text-[var(--color-text-muted)] uppercase">
        Schematic · not to scale
      </p>
    </div>
  );
}
