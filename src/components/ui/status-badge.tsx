import { Circle } from "@phosphor-icons/react/dist/ssr";

import type { FreshnessState } from "@/domain";
import { cn } from "@/lib/utils";

const stateStyles: Record<FreshnessState, string> = {
  live: "text-[var(--color-positive)]",
  current: "text-[var(--color-signal)]",
  delayed: "text-[var(--color-caution)]",
  stale: "text-[var(--color-caution)]",
  unavailable: "text-[var(--color-critical)]",
};

export function StatusBadge({
  state,
  label,
}: {
  state: FreshnessState;
  label: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center gap-2 rounded-full border border-current/35 px-2.5 font-mono text-xs font-medium",
        stateStyles[state],
      )}
    >
      <Circle aria-hidden="true" weight="fill" className="size-2" />
      {label}
    </span>
  );
}
