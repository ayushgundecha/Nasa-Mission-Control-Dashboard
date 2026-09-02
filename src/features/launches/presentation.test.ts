import { describe, expect, it } from "vitest";

import { launchFixture } from "@/domain/__fixtures__/contracts.fixtures";

import {
  displayCountry,
  formatLaunchWindow,
  launchStatusState,
  textOrUnavailable,
} from "./presentation";

describe("launch presentation", () => {
  it("formats schedule precision without inventing seconds", () => {
    expect(formatLaunchWindow(launchFixture)).toContain("UTC");
    expect(formatLaunchWindow(launchFixture)).not.toMatch(
      /:\d{2}:\d{2}/,
    );
  });

  it("maps operational status to a non-color semantic state", () => {
    expect(launchStatusState("go")).toBe("live");
    expect(launchStatusState("scrubbed")).toBe("delayed");
    expect(launchStatusState("cancelled")).toBe("unavailable");
  });

  it("uses explicit unavailable language and resolves country codes", () => {
    expect(textOrUnavailable(null)).toBe("Unavailable from provider");
    expect(displayCountry("NZ")).toMatch(/New Zealand|NZ/);
  });
});
