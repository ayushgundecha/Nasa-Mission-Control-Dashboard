// @vitest-environment node

import { beforeEach, describe, expect, it } from "vitest";

import {
  launchesQuerySchema,
  launchesResponseSchema,
  overviewResponseSchema,
  spaceWeatherResponseSchema,
} from "./contracts";
import { readProductData } from "./data";
import {
  launchDetail,
  listLaunches,
  overviewEnvelope,
  weatherEnvelope,
} from "./service";
import { resetEnvironmentForTests } from "@/lib/env";

beforeEach(() => {
  process.env.ASTRAOPS_DATA_MODE = "fixture";
  resetEnvironmentForTests();
});

describe("product API service", () => {
  it("returns deterministic, validated and bounded launch pages", async () => {
    const data = await readProductData();
    const first = listLaunches(
      data,
      launchesQuerySchema.parse({ limit: "1", sort: "name" }),
    );
    const second = listLaunches(
      data,
      launchesQuerySchema.parse({ limit: "1", cursor: first.page.nextCursor }),
    );

    expect(launchesResponseSchema.parse(first)).toEqual(first);
    expect(first.generatedAt).toBe("2026-09-02T08:00:00.000Z");
    expect(first.page).toMatchObject({
      returned: 1,
      total: 3,
      hasNextPage: true,
    });
    expect(second.data[0]?.id).not.toBe(first.data[0]?.id);
  });

  it("filters launches without leaking the selected upstream object", async () => {
    const data = await readProductData();
    const response = listLaunches(
      data,
      launchesQuerySchema.parse({ query: "cancelled", status: "cancelled" }),
    );
    const detail = launchDetail(data, response.data[0]!.id);

    expect(response.data).toHaveLength(1);
    expect(response.data[0]?.status).toBe("cancelled");
    expect(detail).not.toHaveProperty("upstream");
  });

  it("filters launch intelligence by provider, country, orbit, vehicle, and date", async () => {
    const data = await readProductData();
    const response = listLaunches(
      data,
      launchesQuerySchema.parse({
        provider: "Rocket Lab",
        country: "US",
        orbit: "LEO",
        vehicle: "Electron",
        from: "2026-09-03",
        to: "2026-09-03",
      }),
    );

    expect(response.page.total).toBe(2);
    expect(response.data).toHaveLength(2);
    expect(
      listLaunches(data, launchesQuerySchema.parse({ from: "2028-01-01" }))
        .data,
    ).toEqual([]);
  });

  it("rejects inverted launch date ranges", () => {
    expect(
      launchesQuerySchema.safeParse({
        from: "2026-09-04",
        to: "2026-09-03",
      }).success,
    ).toBe(false);
  });

  it("composes overview and weather from cached normalized fixture data", async () => {
    const data = await readProductData();
    const overview = overviewEnvelope(data);
    const weather = weatherEnvelope(data);

    expect(overviewResponseSchema.parse(overview)).toEqual(overview);
    expect(spaceWeatherResponseSchema.parse(weather)).toEqual(weather);
    expect(overview.data.launchCount).toBe(3);
    expect(overview.data.nextLaunches).toHaveLength(1);
    expect(overview.data.nextLaunches[0]?.name).toBe(
      "Electron | Owl Around The World",
    );
    expect(overview.data.nextLaunches).not.toContainEqual(
      expect.objectContaining({
        status: expect.stringMatching(/cancelled|scrubbed/),
      }),
    );
    expect(weather.data.currentKp?.evidenceMode).toBe("estimated");
    expect(weather.data.forecastKp[0]?.evidenceMode).toBe("predicted");
    expect(JSON.stringify(weather)).not.toContain("fixture-only");
  });
});
