"use client";

import { Circle, X } from "@phosphor-icons/react";
import { useId, useState } from "react";

import type { SourceStamp } from "@/domain";
import { cn } from "@/lib/utils";

const freshnessStyles = {
  live: "text-[var(--color-positive)]",
  current: "text-[var(--color-signal)]",
  delayed: "text-[var(--color-caution)]",
  stale: "text-[var(--color-caution)]",
  unavailable: "text-[var(--color-critical)]",
} as const;

function formatUtc(value: string | null): string {
  if (!value) return "Not supplied by provider";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function SourceBadge({
  source,
  ageLabel,
}: {
  source: SourceStamp;
  ageLabel: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  const stateLabel =
    source.freshness.state[0]?.toUpperCase() + source.freshness.state.slice(1);

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={detailsId}
        onClick={() => setExpanded((value) => !value)}
        className={cn(
          "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-current/35 px-3 font-mono text-[11px] font-medium transition-colors hover:bg-[var(--color-surface-hover)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-cosmos)]",
          freshnessStyles[source.freshness.state],
        )}
      >
        <Circle aria-hidden="true" weight="fill" className="size-2" />
        {source.providerLabel} · {ageLabel}
      </button>

      {expanded ? (
        <div
          id={detailsId}
          className="absolute top-10 right-0 z-30 w-[min(20rem,calc(100vw-2rem))] rounded-[var(--radius-panel)] border border-[var(--color-line)] bg-[var(--color-surface-raised)] p-4 text-left shadow-2xl"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="data-label">Source details</p>
              <p className="mt-2 text-sm font-semibold text-[var(--color-text)]">
                {source.providerLabel}
              </p>
            </div>
            <button
              type="button"
              className="grid size-11 cursor-pointer place-items-center rounded-[var(--radius-control)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
              aria-label="Close source details"
              onClick={() => setExpanded(false)}
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
          <dl className="mt-3 space-y-3 text-xs">
            <div>
              <dt className="text-[var(--color-text-muted)]">Freshness</dt>
              <dd
                className={cn(
                  "mt-1 font-medium",
                  freshnessStyles[source.freshness.state],
                )}
              >
                {stateLabel}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--color-text-muted)]">Observed</dt>
              <dd className="tabular mt-1 text-[var(--color-text-secondary)]">
                {formatUtc(source.observedAt)} UTC
              </dd>
            </div>
            <div>
              <dt className="text-[var(--color-text-muted)]">Fetched</dt>
              <dd className="tabular mt-1 text-[var(--color-text-secondary)]">
                {formatUtc(source.fetchedAt)} UTC
              </dd>
            </div>
            <div>
              <dt className="text-[var(--color-text-muted)]">Adapter</dt>
              <dd className="mt-1 font-mono text-[var(--color-text-secondary)]">
                v{source.adapterVersion}
              </dd>
            </div>
          </dl>
          <a
            href={source.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-[var(--color-signal)] hover:underline"
          >
            Open provider record
          </a>
        </div>
      ) : null}
    </div>
  );
}
