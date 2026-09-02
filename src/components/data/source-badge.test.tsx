import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { launchLibrarySourceFixture } from "@/domain/__fixtures__/contracts.fixtures";

import { SourceBadge } from "./source-badge";

describe("SourceBadge", () => {
  it("discloses provider, observed, fetched, and adapter evidence by keyboard-compatible button", async () => {
    const user = userEvent.setup();
    render(
      <SourceBadge source={launchLibrarySourceFixture} ageLabel="Fresh 15m" />,
    );

    const trigger = screen.getByRole("button", {
      name: /Launch Library 2 · Fresh 15m/i,
    });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await user.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Source details")).toBeInTheDocument();
    expect(screen.getByText("v1.0.0")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Close source details" }),
    );
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("uses the current envelope freshness when cached source evidence is older", () => {
    render(
      <SourceBadge
        source={launchLibrarySourceFixture}
        ageLabel="stale · 3h"
        freshnessState="stale"
      />,
    );

    expect(
      screen.getByRole("button", {
        name: /Launch Library 2 · stale · 3h/i,
      }),
    ).toBeInTheDocument();
  });

  it("opens source evidence from the keyboard", async () => {
    const user = userEvent.setup();
    render(
      <SourceBadge source={launchLibrarySourceFixture} ageLabel="current" />,
    );

    const trigger = screen.getByRole("button", {
      name: /Launch Library 2 · current/i,
    });
    trigger.focus();
    await user.keyboard("{Enter}");

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Source details")).toBeInTheDocument();
  });
});
