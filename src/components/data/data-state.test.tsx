import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataStatePanel } from "./data-state";

describe("DataStatePanel", () => {
  it("announces loading without inventing placeholder values", () => {
    render(
      <DataStatePanel
        state="loading"
        title="Loading provider records"
        detail="Waiting for fixture data"
      />,
    );
    expect(
      screen.getByRole("status", { name: "Loading provider records" }),
    ).toHaveTextContent("Waiting for fixture data");
  });

  it("announces a recoverable error and keeps the recovery path visible", () => {
    render(
      <DataStatePanel
        state="error"
        title="Provider unavailable"
        detail="The request timed out"
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "The request timed out",
    );
    expect(
      screen.getByRole("link", { name: "How data recovery works" }),
    ).toHaveAttribute("href", "/methodology");
  });
});
