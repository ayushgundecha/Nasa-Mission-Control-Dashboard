"use client";

import {
  PersonArmsSpread,
  SpeakerHigh,
  SpeakerSlash,
} from "@phosphor-icons/react";
import { useEffect, useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

const AUDIO_KEY = "astraops:audio-enabled";
const MOTION_KEY = "astraops:reduce-motion";
const PREFERENCE_EVENT = "astraops:preference-change";

function readPreference(key: string): boolean {
  return window.localStorage.getItem(key) === "true";
}

function subscribePreferences(onStoreChange: () => void): () => void {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(PREFERENCE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(PREFERENCE_EVENT, onStoreChange);
  };
}

function usePreference(key: string): boolean {
  return useSyncExternalStore(
    subscribePreferences,
    () => readPreference(key),
    () => false,
  );
}

function writePreference(key: string, value: boolean): void {
  window.localStorage.setItem(key, String(value));
  window.dispatchEvent(new Event(PREFERENCE_EVENT));
}

export function PreferencesControl({ compact = false }: { compact?: boolean }) {
  const audioEnabled = usePreference(AUDIO_KEY);
  const reduceMotion = usePreference(MOTION_KEY);

  useEffect(() => {
    document.documentElement.dataset.motion = reduceMotion
      ? "reduced"
      : "system";
    document.documentElement.dataset.audio = audioEnabled ? "enabled" : "muted";
  }, [audioEnabled, reduceMotion]);

  function toggleAudio() {
    const next = !audioEnabled;
    writePreference(AUDIO_KEY, next);
    document.documentElement.dataset.audio = next ? "enabled" : "muted";
  }

  function toggleMotion() {
    const next = !reduceMotion;
    writePreference(MOTION_KEY, next);
    document.documentElement.dataset.motion = next ? "reduced" : "system";
  }

  const controlClass = cn(
    "inline-flex min-h-11 cursor-pointer items-center rounded-[var(--radius-control)] border border-[var(--color-line-subtle)] text-xs font-medium text-[var(--color-text-secondary)] transition-colors duration-[var(--motion-fast)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]",
    compact ? "size-11 justify-center p-0" : "gap-2 px-3",
  );

  return (
    <div
      className={cn("flex", compact ? "gap-2" : "flex-col gap-2")}
      aria-label="Experience preferences"
    >
      <button
        type="button"
        className={controlClass}
        aria-pressed={audioEnabled}
        aria-label={
          audioEnabled ? "Mute interface audio" : "Enable interface audio"
        }
        onClick={toggleAudio}
      >
        {audioEnabled ? (
          <SpeakerHigh aria-hidden="true" className="size-4" />
        ) : (
          <SpeakerSlash aria-hidden="true" className="size-4" />
        )}
        {compact ? null : audioEnabled ? "Audio on" : "Audio off"}
      </button>
      <button
        type="button"
        className={controlClass}
        aria-pressed={reduceMotion}
        aria-label={
          reduceMotion
            ? "Use system motion preference"
            : "Reduce interface motion"
        }
        onClick={toggleMotion}
      >
        <PersonArmsSpread aria-hidden="true" className="size-4" />
        {compact ? null : reduceMotion ? "Motion reduced" : "System motion"}
      </button>
    </div>
  );
}
