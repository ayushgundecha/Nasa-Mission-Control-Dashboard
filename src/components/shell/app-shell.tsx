import { DotsThree, Planet } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { getServerEnvironment } from "@/lib/env";

import { DesktopNavigation, MobileNavigation } from "./navigation";
import { PreferencesControl } from "./preferences-control";

function Wordmark() {
  return (
    <Link
      href="/"
      className="flex min-h-11 items-center gap-3 font-semibold tracking-[-0.03em]"
    >
      <span className="grid size-8 place-items-center rounded-full border border-[var(--color-signal)] text-[var(--color-signal)]">
        <Planet aria-hidden="true" className="size-5" />
      </span>
      <span>
        Astra<span className="text-[var(--color-signal)]">Ops</span>
      </span>
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const environment = getServerEnvironment();
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <a
        href="#main-content"
        className="fixed top-3 left-3 z-[70] -translate-y-24 rounded-[var(--radius-control)] bg-[var(--color-signal)] px-4 py-3 font-semibold text-[var(--color-cosmos)] focus:translate-y-0"
      >
        Skip to main content
      </a>

      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-[var(--color-line-subtle)] bg-[var(--color-void)] p-4 lg:flex">
        <div className="px-2 pb-7">
          <Wordmark />
          <p className="mt-3 font-mono text-[10px] tracking-[0.08em] text-[var(--color-text-muted)] uppercase">
            Independent space intelligence
          </p>
        </div>
        <DesktopNavigation />
        <div className="mt-auto space-y-4 border-t border-[var(--color-line-subtle)] pt-4">
          <Link
            href="/system/states"
            className="flex min-h-11 items-center justify-between rounded-[var(--radius-control)] px-3 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
          >
            <span>Data health</span>
            <span className="inline-flex items-center gap-2 text-[var(--color-positive)]">
              <span className="size-1.5 rounded-full bg-current" />
              {environment.ASTRAOPS_DATA_MODE === "fixture"
                ? "Fixture"
                : "Nominal"}
            </span>
          </Link>
          <PreferencesControl />
          <p className="px-3 text-[10px] leading-4 text-[var(--color-text-muted)]">
            Not affiliated with NASA, SpaceX, or any launch provider.
          </p>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-40 flex h-[var(--mobile-header-height)] items-center justify-between border-b border-[var(--color-line)] bg-[var(--color-void)] px-4 lg:hidden">
          <Wordmark />
          <div className="flex items-center gap-2">
            <PreferencesControl compact />
            <Link
              href="/methodology"
              aria-label="Open data methodology"
              className="grid size-11 place-items-center rounded-[var(--radius-control)] border border-[var(--color-line-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
            >
              <DotsThree aria-hidden="true" className="size-5" />
            </Link>
          </div>
        </header>

        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto min-h-dvh w-full max-w-[1600px] px-4 pt-6 pb-[calc(var(--bottom-nav-height)+1.5rem)] outline-none md:px-6 md:pt-8 lg:px-8 lg:py-8 xl:px-12 xl:py-10"
        >
          {children}
        </main>
      </div>
      <MobileNavigation />
    </div>
  );
}
