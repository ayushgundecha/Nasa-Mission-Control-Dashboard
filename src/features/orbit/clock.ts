export const ORBIT_SCRUB_LIMIT_MS = 24 * 60 * 60 * 1_000;

export type OrbitClockSnapshot = Readonly<{
  time: string;
  offsetMs: number;
  running: boolean;
  visible: boolean;
}>;

export class OrbitClock {
  private baseUtcMs: number;
  private baseMonotonicMs: number;
  private offsetMs = 0;
  private running = true;
  private visible = true;
  private resumeAfterVisibility = false;

  constructor(
    initialUtc: Date,
    private readonly monotonicNow: () => number = () => performance.now(),
  ) {
    if (!Number.isFinite(initialUtc.getTime()))
      throw new Error("Orbit clock requires a valid initial UTC time");
    this.baseUtcMs = initialUtc.getTime();
    this.baseMonotonicMs = this.monotonicNow();
  }

  snapshot(): OrbitClockSnapshot {
    const elapsed =
      this.running && this.visible
        ? this.monotonicNow() - this.baseMonotonicMs
        : 0;
    return {
      time: new Date(this.baseUtcMs + elapsed + this.offsetMs).toISOString(),
      offsetMs: this.offsetMs,
      running: this.running,
      visible: this.visible,
    };
  }

  pause(): OrbitClockSnapshot {
    if (this.running) this.freeze();
    this.running = false;
    return this.snapshot();
  }

  resume(): OrbitClockSnapshot {
    if (!this.running) {
      this.running = true;
      this.baseMonotonicMs = this.monotonicNow();
    }
    return this.snapshot();
  }

  scrub(offsetMs: number): OrbitClockSnapshot {
    if (
      !Number.isFinite(offsetMs) ||
      Math.abs(offsetMs) > ORBIT_SCRUB_LIMIT_MS
    ) {
      throw new Error("Orbit scrub must stay within ±24 hours");
    }
    this.offsetMs = offsetMs;
    return this.snapshot();
  }

  reset(utc: Date): OrbitClockSnapshot {
    if (!Number.isFinite(utc.getTime()))
      throw new Error("Orbit clock reset requires a valid UTC time");
    this.baseUtcMs = utc.getTime();
    this.baseMonotonicMs = this.monotonicNow();
    this.offsetMs = 0;
    return this.snapshot();
  }

  setVisible(visible: boolean): OrbitClockSnapshot {
    if (this.visible === visible) return this.snapshot();
    if (!visible) {
      this.resumeAfterVisibility = this.running;
      if (this.running) this.freeze();
      this.visible = false;
    } else {
      this.visible = true;
      if (this.resumeAfterVisibility)
        this.baseMonotonicMs = this.monotonicNow();
      this.resumeAfterVisibility = false;
    }
    return this.snapshot();
  }

  private freeze() {
    const now = this.monotonicNow();
    if (this.visible) this.baseUtcMs += now - this.baseMonotonicMs;
    this.baseMonotonicMs = now;
  }
}
