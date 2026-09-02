import type { Icon } from "@phosphor-icons/react";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { Panel } from "@/components/ui/panel";

export function PhasePreview({
  eyebrow,
  title,
  description,
  phase,
  icon: PreviewIcon,
}: {
  eyebrow: string;
  title: string;
  description: string;
  phase: string;
  icon: Icon;
}) {
  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--color-signal)] hover:underline"
      >
        <ArrowLeft aria-hidden="true" className="size-4" /> Command center
      </Link>
      <div className="mt-10 grid items-start gap-8 lg:grid-cols-[1fr_20rem]">
        <div>
          <p className="data-label">{eyebrow}</p>
          <h1 className="mt-4 max-w-3xl text-4xl leading-[1.02] font-semibold tracking-[-0.045em] md:text-6xl">
            {title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--color-text-secondary)]">
            {description}
          </p>
        </div>
        <Panel raised>
          <PreviewIcon
            aria-hidden="true"
            className="size-8 text-[var(--color-signal)]"
          />
          <p className="data-label mt-8">Delivery state</p>
          <p className="mt-2 font-semibold">Foundation route ready</p>
          <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
            The full evidence-backed workflow is dependency-gated for {phase}.
            The route, metadata, shell, responsive behavior, and accessible
            navigation are ready now.
          </p>
          <Link
            href="/system/states"
            className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--color-signal)] hover:underline"
          >
            Inspect system states{" "}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </Panel>
      </div>
    </div>
  );
}
