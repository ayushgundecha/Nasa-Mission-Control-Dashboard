// @vitest-environment node

import { describe, expect, it } from "vitest";

import { ORBIT_SCRUB_LIMIT_MS, OrbitClock } from "./clock";

describe("OrbitClock", () => {
  it("owns deterministic pause, resume, scrub, and reset time", () => {
    let monotonic = 0;
    const clock = new OrbitClock(
      new Date("2026-09-04T08:00:00.000Z"),
      () => monotonic,
    );
    monotonic = 1_000;
    expect(clock.snapshot().time).toBe("2026-09-04T08:00:01.000Z");
    clock.pause();
    monotonic = 10_000;
    expect(clock.snapshot().time).toBe("2026-09-04T08:00:01.000Z");
    expect(clock.scrub(3_600_000).time).toBe("2026-09-04T09:00:01.000Z");
    clock.resume();
    monotonic = 11_000;
    expect(clock.snapshot().time).toBe("2026-09-04T09:00:02.000Z");
    expect(clock.reset(new Date("2026-09-05T00:00:00.000Z")).time).toBe(
      "2026-09-05T00:00:00.000Z",
    );
    expect(() => clock.scrub(ORBIT_SCRUB_LIMIT_MS + 1)).toThrow(/±24 hours/);
  });

  it("freezes work while hidden and resumes without counting hidden time", () => {
    let monotonic = 0;
    const clock = new OrbitClock(
      new Date("2026-09-04T08:00:00.000Z"),
      () => monotonic,
    );
    monotonic = 2_000;
    expect(clock.setVisible(false).time).toBe("2026-09-04T08:00:02.000Z");
    monotonic = 62_000;
    expect(clock.snapshot().time).toBe("2026-09-04T08:00:02.000Z");
    clock.setVisible(true);
    monotonic = 63_000;
    expect(clock.snapshot().time).toBe("2026-09-04T08:00:03.000Z");
  });

  it("does not count hidden time when the user pauses before returning", () => {
    let monotonic = 0;
    const clock = new OrbitClock(
      new Date("2026-09-04T08:00:00.000Z"),
      () => monotonic,
    );
    monotonic = 2_000;
    clock.setVisible(false);
    monotonic = 62_000;
    clock.pause();
    clock.setVisible(true);
    expect(clock.snapshot().time).toBe("2026-09-04T08:00:02.000Z");
    expect(clock.snapshot().running).toBe(false);
  });
});
