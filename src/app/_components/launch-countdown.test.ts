import { describe, expect, it } from "vitest";

import { countdownState } from "./launch-countdown";

const now = Date.parse("2026-09-02T08:00:00.000Z");

describe("countdownState", () => {
  it("shows only the units justified by provider precision", () => {
    expect(
      countdownState(
        "2026-09-03T14:20:45.000Z",
        "2026-09-03T14:20:45.000Z",
        "minute",
        now,
      ),
    ).toEqual({
      label: "Countdown rounded to minute",
      value: "T−01d 06h 20m",
      passed: false,
    });

    expect(
      countdownState(
        "2026-09-03T14:20:45.000Z",
        "2026-09-03T14:20:45.000Z",
        "day",
        now,
      ).value,
    ).toBe("T−01d");
  });

  it("describes broad provider windows without inventing countdown precision", () => {
    expect(
      countdownState(
        "2026-09-03T00:00:00.000Z",
        "2026-09-05T23:59:59.000Z",
        "window",
        now,
      ),
    ).toMatchObject({
      label: "Provider launch window",
      value: "03 Sept 2026 – 05 Sept 2026",
      passed: false,
    });
  });

  it("distinguishes an open window from an expired schedule", () => {
    expect(
      countdownState(
        "2026-09-02T07:55:00.000Z",
        "2026-09-02T08:10:00.000Z",
        "minute",
        now,
      ),
    ).toMatchObject({ value: "Window open", passed: true });

    expect(
      countdownState(
        "2026-09-02T07:00:00.000Z",
        "2026-09-02T07:30:00.000Z",
        "minute",
        now,
      ),
    ).toMatchObject({ value: "Awaiting provider update", passed: true });
  });
});
