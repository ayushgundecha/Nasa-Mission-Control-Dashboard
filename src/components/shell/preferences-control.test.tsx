import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { PreferencesControl } from "./preferences-control";

describe("PreferencesControl", () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete document.documentElement.dataset.audio;
    delete document.documentElement.dataset.motion;
  });

  it("keeps audio opt-in and persists the user's choice", async () => {
    const user = userEvent.setup();
    render(<PreferencesControl />);

    const audio = screen.getByRole("button", {
      name: "Enable interface audio",
    });
    expect(audio).toHaveAttribute("aria-pressed", "false");
    await user.click(audio);

    expect(
      screen.getByRole("button", { name: "Mute interface audio" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(window.localStorage.getItem("astraops:audio-enabled")).toBe("true");
    expect(document.documentElement.dataset.audio).toBe("enabled");
  });

  it("persists an explicit reduced-motion override", async () => {
    const user = userEvent.setup();
    render(<PreferencesControl />);

    const motion = screen.getByRole("button", {
      name: "Reduce interface motion",
    });
    await user.click(motion);

    expect(
      screen.getByRole("button", { name: "Use system motion preference" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(window.localStorage.getItem("astraops:reduce-motion")).toBe("true");
    expect(document.documentElement.dataset.motion).toBe("reduced");
  });
});
