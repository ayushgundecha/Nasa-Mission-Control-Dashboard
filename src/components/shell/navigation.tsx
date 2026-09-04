"use client";

import {
  BookOpenText,
  Flask,
  GlobeHemisphereWest,
  House,
  RocketLaunch,
  type Icon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

type NavigationItem = {
  href: "/" | "/launches" | "/environment" | "/mission-lab" | "/methodology";
  label: string;
  shortLabel: string;
  icon: Icon;
};

const items: NavigationItem[] = [
  { href: "/", label: "Command", shortLabel: "Command", icon: House },
  {
    href: "/launches",
    label: "Launches",
    shortLabel: "Launches",
    icon: RocketLaunch,
  },
  {
    href: "/environment",
    label: "Environment",
    shortLabel: "Environment",
    icon: GlobeHemisphereWest,
  },
  {
    href: "/mission-lab",
    label: "Mission Lab",
    shortLabel: "Lab",
    icon: Flask,
  },
  {
    href: "/methodology",
    label: "About data",
    shortLabel: "Data",
    icon: BookOpenText,
  },
];

function isCurrentRoute(
  pathname: string,
  href: NavigationItem["href"],
): boolean {
  if (
    href === "/environment" &&
    (pathname.startsWith("/objects") || pathname.startsWith("/approaches"))
  ) {
    return true;
  }
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function DesktopNavigation() {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="flex flex-col gap-1">
      {items.map((item) => {
        const current = isCurrentRoute(pathname, item.href);
        const ItemIcon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-[var(--radius-control)] px-3 text-sm font-medium transition-colors duration-[var(--motion-fast)]",
              current
                ? "bg-[var(--color-surface-hover)] text-[var(--color-text)]"
                : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]",
            )}
          >
            <ItemIcon
              aria-hidden="true"
              weight={current ? "fill" : "regular"}
              className="size-5"
            />
            {item.label}
            {current ? (
              <span className="ml-auto size-1.5 rounded-full bg-[var(--color-signal)]" />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNavigation() {
  const pathname = usePathname();
  const mobileItems = items.slice(0, 4);
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 grid h-[var(--bottom-nav-height)] grid-cols-4 border-t border-[var(--color-line)] bg-[var(--color-void)] px-2 pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {mobileItems.map((item) => {
        const current = isCurrentRoute(pathname, item.href);
        const ItemIcon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-1 rounded-[var(--radius-control)] text-[11px] font-medium",
              current
                ? "text-[var(--color-signal)]"
                : "text-[var(--color-text-muted)]",
            )}
          >
            <ItemIcon
              aria-hidden="true"
              weight={current ? "fill" : "regular"}
              className="size-5"
            />
            {item.shortLabel}
          </Link>
        );
      })}
    </nav>
  );
}
