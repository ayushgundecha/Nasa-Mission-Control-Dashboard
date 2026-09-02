// @vitest-environment node

import { describe, expect, it } from "vitest";

import type {
  NormalizedProviderRecord,
  ProviderKey,
  ProviderSnapshot,
  SourceHealth,
} from "@/providers";
import { createDonkiFlareAdapter } from "@/providers/space-weather";
import { createNoaaKpAdapter } from "@/providers/space-weather/noaa/adapter";
import { donkiEmptyFixture } from "@/providers/space-weather/donki/fixtures";
import { noaaKpFixture } from "@/providers/space-weather/noaa/fixtures";

import { readStoredProductData } from "./data";

const now = new Date("2026-09-02T08:00:00.000Z");

function key(input: ProviderKey): string {
  return `${input.provider}/${input.dataset}`;
}

function snapshot<TPayload, TRecord>(
  adapter: {
    provider: string;
    providerLabel: string;
    dataset: string;
    adapterVersion: string;
    request: () => { url: string };
    normalize: (
      payload: TPayload,
      context: {
        provider: string;
        providerLabel: string;
        dataset: string;
        adapterVersion: string;
        sourceUrl: string;
        fetchedAt: string;
      },
    ) => readonly NormalizedProviderRecord<TRecord>[];
  },
  payload: TPayload,
): ProviderSnapshot<TRecord> {
  const fetchedAt = now.toISOString();
  return {
    provider: adapter.provider,
    dataset: adapter.dataset,
    fetchedAt,
    records: adapter.normalize(payload, {
      provider: adapter.provider,
      providerLabel: adapter.providerLabel,
      dataset: adapter.dataset,
      adapterVersion: adapter.adapterVersion,
      sourceUrl: adapter.request().url,
      fetchedAt,
    }),
  };
}

function store(snapshots: readonly ProviderSnapshot<unknown>[]) {
  const indexed = new Map(snapshots.map((item) => [key(item), item]));
  return {
    async readSnapshot<TRecord>(providerKey: ProviderKey) {
      return (indexed.get(key(providerKey)) ??
        null) as ProviderSnapshot<TRecord> | null;
    },
    async readHealth(): Promise<SourceHealth | null> {
      return null;
    },
  };
}

describe("stored product data assembly", () => {
  it("reports every source unavailable on a first live load with no cache", async () => {
    const data = await readStoredProductData(store([]), now);

    expect(data.launches).toEqual([]);
    expect(data.spaceWeather.availability).toEqual({
      noaa: "unavailable",
      donki: "unavailable",
    });
    expect(data.sources).toHaveLength(9);
    expect(
      data.sources.every((source) => source.freshness === "unavailable"),
    ).toBe(true);
    expect(data.warnings).toHaveLength(9);
  });

  it("keeps NOAA available while treating a valid empty DONKI window as observed", async () => {
    const noaaAdapter = createNoaaKpAdapter(noaaKpFixture);
    const donkiAdapter = createDonkiFlareAdapter({
      apiKey: "fixture-only",
      endDate: "2026-09-02",
      fixturePayload: donkiEmptyFixture,
    });
    const data = await readStoredProductData(
      store([
        snapshot(noaaAdapter, noaaKpFixture),
        snapshot(donkiAdapter, donkiEmptyFixture),
      ]),
      now,
    );

    expect(data.spaceWeather.availability).toEqual({
      noaa: "available",
      donki: "available",
    });
    expect(data.spaceWeather.recentEvents).toEqual([]);
    expect(
      data.sources.find((source) => source.dataset === "donki_flares"),
    ).toMatchObject({ freshness: "live", fetchedAt: now.toISOString() });
    expect(data.warnings).not.toContain(
      "nasa_donki/donki_flares is unavailable.",
    );
  });
});
