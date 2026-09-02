import { describe, expect, it } from "vitest";

import {
  approachFixture,
  commandLaunches,
  orbitalObjectFixture,
  weatherFixture,
} from "./command.fixtures";

describe("command fixtures", () => {
  it("represent valid launch, weather, orbit, and approach states without a provider request", () => {
    expect(commandLaunches).toHaveLength(3);
    expect(weatherFixture.source.freshness.state).toBe("stale");
    expect(orbitalObjectFixture.source.provider).toBe("celestrak");
    expect(approachFixture.potentiallyHazardous).toBe(false);
  });
});
