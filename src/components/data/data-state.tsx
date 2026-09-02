import { ArrowClockwise, Info, Warning } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { cn } from "@/lib/utils";

type DataState = "loading" | "empty" | "error" | "stale";

const stateMeta = {
  empty: { icon: Info, color: "text-[var(--color-text-muted)]" },
  error: { icon: Warning, color: "text-[var(--color-critical)]" },
  stale: { icon: ArrowClockwise, color: "text-[var(--color-caution)]" },
} as const;

export function DataStatePanel({
  state,
  title,
  detail,
  actionHref = "/methodology",
  actionLabel = "How data recovery works",
}: {
  state: DataState;
  title: string;
  detail: string;
  actionHref?: "/methodology" | "/system/states";
  actionLabel?: string;
}) {
  if (state === "loading") {
    return (
      <div
        role="status"
        aria-label={title}
        className="space-y-4"
        aria-live="polite"
      >
        <span className="sr-only">{detail}</span>
        <div className="h-3 w-28 animate-pulse rounded bg-[var(--color-line)]" />
        <div className="h-8 w-2/3 animate-pulse rounded bg-[var(--color-surface-hover)]" />
        <div className="h-3 w-full animate-pulse rounded bg-[var(--color-line-subtle)]" />
        <div className="h-3 w-4/5 animate-pulse rounded bg-[var(--color-line-subtle)]" />
      </div>
    );
  }

  const meta = stateMeta[state];
  const StateIcon = meta.icon;
  return (
    <div
      role={state === "error" ? "alert" : "status"}
      className="flex items-start gap-3"
    >
      <StateIcon
        aria-hidden="true"
        className={cn("mt-0.5 size-5 shrink-0", meta.color)}
      />
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">
          {detail}
        </p>
        <Link
          href={actionHref}
          className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-[var(--color-signal)] hover:underline"
        >
          {actionLabel}
        </Link>
      </div>
    </div>
  );
}
