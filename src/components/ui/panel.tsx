import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type PanelProps = HTMLAttributes<HTMLDivElement> & { raised?: boolean };

export function Panel({ className, raised = false, ...props }: PanelProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-panel)] border border-[var(--color-line-subtle)] p-4 md:p-5",
        raised
          ? "bg-[var(--color-surface-raised)]"
          : "bg-[var(--color-surface)]",
        className,
      )}
      {...props}
    />
  );
}
