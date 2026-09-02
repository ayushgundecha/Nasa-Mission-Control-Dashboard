"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const REFRESH_INTERVAL_MS = 5 * 60 * 1_000;

export function BackgroundRefresh() {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const sync = () => {
      if (document.hidden) {
        if (timer) clearInterval(timer);
        timer = undefined;
        return;
      }
      if (!timer)
        timer = setInterval(() => router.refresh(), REFRESH_INTERVAL_MS);
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      if (timer) clearInterval(timer);
    };
  }, [router]);

  return null;
}
