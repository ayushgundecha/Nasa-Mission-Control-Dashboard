// @vitest-environment node

import { beforeEach, describe, expect, it } from "vitest";

import {
  healthResponseSchema,
  launchDetailResponseSchema,
  launchesResponseSchema,
  overviewResponseSchema,
  spaceWeatherResponseSchema,
} from "@/api/contracts";
import { resetEnvironmentForTests } from "@/lib/env";

import { GET as getHealth } from "./health/route";
import { GET as getLaunch } from "./launches/[id]/route";
import { GET as getLaunches } from "./launches/route";
import { GET as getOverview } from "./overview/route";
import { GET as getSpaceWeather } from "./space-weather/route";

beforeEach(() => {
  process.env.ASTRAOPS_DATA_MODE = "fixture";
  resetEnvironmentForTests();
});

describe("public API routes", () => {
  it("returns schema-valid fixture envelopes across every public data route", async () => {
    const launchesResponse = await getLaunches(
      new Request(
        "http://localhost/api/launches?provider=Rocket%20Lab&status=go&limit=1",
      ),
    );
    const launches = launchesResponseSchema.parse(
      await launchesResponse.json(),
    );
    const detailResponse = await getLaunch(
      new Request(`http://localhost/api/launches/${launches.data[0]!.id}`),
      { params: Promise.resolve({ id: launches.data[0]!.id }) },
    );
    const overviewResponse = await getOverview();
    const weatherResponse = await getSpaceWeather();
    const healthResponse = await getHealth();

    expect(launchesResponse.status).toBe(200);
    expect(launches.data).toHaveLength(1);
    expect(launches.data[0]).toMatchObject({
      status: "go",
      window: { precision: "minute" },
    });
    expect(
      launchDetailResponseSchema.parse(await detailResponse.json()).data,
    ).toMatchObject({ launch: { id: launches.data[0]!.id } });
    expect(
      overviewResponseSchema.parse(await overviewResponse.json()).data,
    ).toMatchObject({ launchCount: expect.any(Number) });
    expect(
      spaceWeatherResponseSchema.parse(await weatherResponse.json()).data
        .availability,
    ).toEqual({ noaa: "available", donki: "available" });
    expect(
      healthResponseSchema.parse(await healthResponse.json()).data.length,
    ).toBeGreaterThan(0);

    for (const response of [
      launchesResponse,
      detailResponse,
      overviewResponse,
      weatherResponse,
      healthResponse,
    ]) {
      expect(response.headers.get("cache-control")).toContain("s-maxage=");
    }
  });

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

  it("rejects oversized launch identifiers without reading provider data", async () => {
    const response = await getLaunch(
      new Request("http://localhost/api/launches/oversized"),
      { params: Promise.resolve({ id: "x".repeat(241) }) },
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.error).toMatchObject({
      code: "BAD_REQUEST",
      recovery: expect.stringContaining("Launch Library 2 ID"),
    });
  });
});
