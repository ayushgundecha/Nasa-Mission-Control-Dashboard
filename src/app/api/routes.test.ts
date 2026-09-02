// @vitest-environment node

import { beforeEach, describe, expect, it } from "vitest";

import { resetEnvironmentForTests } from "@/lib/env";

import { GET as getHealth } from "./health/route";
import { GET as getLaunch } from "./launches/[id]/route";
import { GET as getLaunches } from "./launches/route";

beforeEach(() => {
  process.env.ASTRAOPS_DATA_MODE = "fixture";
  resetEnvironmentForTests();
});

describe("public API routes", () => {
  it("returns actionable field errors for invalid queries", async () => {
    const response = await getLaunches(
      new Request("http://localhost/api/launches?limit=1000&unknown=true"),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.error.fieldErrors).toMatchObject({ limit: expect.any(Array) });
  });

  it("returns a safe 404 and public cache semantics", async () => {
    const missing = await getLaunch(
      new Request("http://localhost/api/launches/missing"),
      {
        params: Promise.resolve({ id: "missing" }),
      },
    );
    const health = await getHealth();
    const body = await health.json();

    expect(missing.status).toBe(404);
    expect(health.headers.get("cache-control")).toContain("s-maxage=60");
    expect(JSON.stringify(body)).not.toContain("DATABASE_URL");
    expect(JSON.stringify(body)).not.toContain("NASA_API_KEY");
  });
});
