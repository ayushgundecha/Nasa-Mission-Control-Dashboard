import "server-only";

import type { FreshnessState, Launch } from "@/domain";
import { createProductionDatabase } from "@/db/client";
import { getServerEnvironment } from "@/lib/env";
import {
  DatabaseProviderStore,
  evaluateFreshness,
  type FreshnessPolicy,
  type ProviderStore,
  type SourceHealth,
} from "@/providers";
import {
  celestrakCuration,
  celestrakOrbitWatchFixture,
  mapCelestrakOmm,
  type CelestrakOrbitalRecord,
} from "@/providers/celestrak";
import {
  jplCadApproachFeedFixture,
  mapJplCadRow,
  type JplCadRecord,
} from "@/providers/jpl-cad";
import {
  createLaunchLibraryAdapter,
  ll2ScheduleStateFixture,
  ll2UpcomingFixture,
  type LaunchIntelligenceRecord,
} from "@/providers/launch-library-2";
import {
  buildSpaceWeatherBriefing,
  createDonkiCmeAdapter,
  createDonkiFlareAdapter,
  createDonkiGeomagneticStormAdapter,
  createDonkiNotificationAdapter,
  createNoaaKpAdapter,
  createNoaaScalesAdapter,
  createNoaaSolarWindAdapter,
  donkiCmeFixture,
  donkiFlareFixture,
  donkiNotificationFixture,
  donkiStormFixture,
  noaaKpFixture,
  noaaScalesFixture,
  noaaSolarWindFixture,
  type DonkiEvent,
  type KpMeasurement,
  type NoaaScaleSnapshot,
  type SolarWindMeasurement,
  type SpaceWeatherBriefing,
} from "@/providers/space-weather";

const FIXTURE_TIME = "2026-09-02T08:00:00.000Z";

export type SourceSummary = Readonly<{
  provider: string;
  dataset: string;
  freshness: FreshnessState;
  fetchedAt: string | null;
}>;

export type ProductData = Readonly<{
  generatedAt: string;
  launches: readonly LaunchIntelligenceRecord[];
  orbitalObjects: readonly CelestrakOrbitalRecord[];
  nearEarthApproaches: readonly JplCadRecord[];
  spaceWeather: SpaceWeatherBriefing;
  sources: readonly SourceSummary[];
  health: readonly SourceHealth[];
  warnings: readonly string[];
}>;

function fixtureContext(
  provider: string,
  providerLabel: string,
  dataset: string,
) {
  return {
    provider,
    providerLabel,
    dataset,
    adapterVersion: "1.0.0",
    sourceUrl: "https://fixture.astraops.local/",
    fetchedAt: FIXTURE_TIME,
  };
}

function fixtureRecords<TPayload, TRecord>(
  adapter: {
    provider: string;
    providerLabel: string;
    dataset: string;
    adapterVersion: string;
    normalize: (
      payload: TPayload,
      normalizeContext: ReturnType<typeof fixtureContext>,
    ) => readonly { data: TRecord }[];
  },
  payload: TPayload,
): TRecord[] {
  return adapter
    .normalize(
      payload,
      fixtureContext(adapter.provider, adapter.providerLabel, adapter.dataset),
    )
    .map((record) => record.data);
}

function fixtureHealth(
  provider: string,
  dataset: string,
  records: number,
): SourceHealth {
  return {
    provider,
    dataset,
    state: "succeeded",
    freshness: "live",
    lastStartedAt: FIXTURE_TIME,
    lastSucceededAt: FIXTURE_TIME,
    lastFailedAt: null,
    lastDurationMs: 0,
    lastAttemptCount: 1,
    recordsReceived: records,
    recordsWritten: records,
    consecutiveFailures: 0,
    nextEligibleRefreshAt: null,
    error: null,
  };
}

function readFixtureData(): ProductData {
  const upcomingAdapter = createLaunchLibraryAdapter({
    feed: "upcoming",
    environment: "development",
    fixturePayload: ll2UpcomingFixture,
  });
  const scheduleAdapter = createLaunchLibraryAdapter({
    feed: "upcoming",
    environment: "development",
    fixturePayload: ll2ScheduleStateFixture,
  });
  const launches = [
    ...fixtureRecords(upcomingAdapter, ll2UpcomingFixture),
    ...fixtureRecords(scheduleAdapter, ll2ScheduleStateFixture),
  ];
  const categoryByIndex = [
    "stations",
    "science_weather",
    "navigation",
    "navigation",
    "commercial_communications",
    "commercial_communications",
    "science_weather",
    "science_weather",
  ] as const;
  const orbitalObjects = celestrakOrbitWatchFixture.map((item, index) => {
    const category = categoryByIndex[index] ?? "science_weather";
    const curation = celestrakCuration.find(
      (entry) => entry.category === category,
    )!;
    return mapCelestrakOmm(item, curation, {
      ...fixtureContext("celestrak", "CelesTrak", `omm_${category}`),
      sourceUrl: `https://celestrak.org/NORAD/elements/gp.php?GROUP=${curation.group}&FORMAT=JSON`,
    }).data;
  });
  const jplContext = {
    ...fixtureContext("jpl_cad", "NASA/JPL SBDB CAD", "earth_close_approaches"),
    sourceUrl:
      "https://ssd-api.jpl.nasa.gov/cad.api?body=Earth&date-min=now&date-max=%2B60&dist-max=10LD&diameter=true&fullname=true",
  };
  const nearEarthApproaches = (jplCadApproachFeedFixture.data ?? []).map(
    (row) => mapJplCadRow(row, jplContext).data,
  );
  const kp = fixtureRecords(createNoaaKpAdapter(noaaKpFixture), noaaKpFixture);
  const scales = fixtureRecords(
    createNoaaScalesAdapter(noaaScalesFixture),
    noaaScalesFixture,
  );
  const solarWind = fixtureRecords(
    createNoaaSolarWindAdapter(noaaSolarWindFixture),
    noaaSolarWindFixture,
  );
  const donkiOptions = { apiKey: "fixture-only", endDate: "2026-09-02" };
  const donki = [
    ...fixtureRecords(
      createDonkiFlareAdapter({
        ...donkiOptions,
        fixturePayload: donkiFlareFixture,
      }),
      donkiFlareFixture,
    ),
    ...fixtureRecords(
      createDonkiCmeAdapter({
        ...donkiOptions,
        fixturePayload: donkiCmeFixture,
      }),
      donkiCmeFixture,
    ),
    ...fixtureRecords(
      createDonkiGeomagneticStormAdapter({
        ...donkiOptions,
        fixturePayload: donkiStormFixture,
      }),
      donkiStormFixture,
    ),
    ...fixtureRecords(
      createDonkiNotificationAdapter({
        ...donkiOptions,
        fixturePayload: donkiNotificationFixture,
      }),
      donkiNotificationFixture,
    ),
  ];
  const sources = [
    {
      provider: "launch_library_2",
      dataset: "launches_upcoming",
      freshness: "live",
      fetchedAt: FIXTURE_TIME,
    },
    {
      provider: "noaa_swpc",
      dataset: "kp_forecast",
      freshness: "live",
      fetchedAt: FIXTURE_TIME,
    },
    {
      provider: "noaa_swpc",
      dataset: "noaa_scales",
      freshness: "live",
      fetchedAt: FIXTURE_TIME,
    },
    {
      provider: "noaa_swpc",
      dataset: "solar_wind",
      freshness: "live",
      fetchedAt: FIXTURE_TIME,
    },
    {
      provider: "nasa_donki",
      dataset: "donki_events",
      freshness: "live",
      fetchedAt: FIXTURE_TIME,
    },
    ...celestrakCuration.map((curation) => ({
      provider: "celestrak" as const,
      dataset: `omm_${curation.category}`,
      freshness: "live" as const,
      fetchedAt: FIXTURE_TIME,
    })),
    {
      provider: "jpl_cad",
      dataset: "earth_close_approaches",
      freshness: "live",
      fetchedAt: FIXTURE_TIME,
    },
  ] as const;
  const health = sources.map((source) =>
    fixtureHealth(
      source.provider,
      source.dataset,
      source.provider === "launch_library_2"
        ? launches.length
        : source.provider === "celestrak"
          ? orbitalObjects.filter(
              (record) => `omm_${record.category}` === source.dataset,
            ).length
          : source.provider === "jpl_cad"
            ? nearEarthApproaches.length
            : 1,
    ),
  );

  return {
    generatedAt: FIXTURE_TIME,
    launches,
    orbitalObjects,
    nearEarthApproaches,
    spaceWeather: buildSpaceWeatherBriefing({ kp, scales, solarWind, donki }),
    sources,
    health,
    warnings: [],
  };
}

const liveDatasets = [
  ["launch_library_2", "launches_upcoming"],
  ["launch_library_2", "launches_previous"],
  ["noaa_swpc", "kp_forecast"],
  ["noaa_swpc", "noaa_scales"],
  ["noaa_swpc", "solar_wind"],
  ["nasa_donki", "donki_flares"],
  ["nasa_donki", "donki_cmes"],
  ["nasa_donki", "donki_geomagnetic_storms"],
  ["nasa_donki", "donki_notifications"],
  ["celestrak", "omm_stations"],
  ["celestrak", "omm_science_weather"],
  ["celestrak", "omm_navigation"],
  ["celestrak", "omm_commercial_communications"],
  ["jpl_cad", "earth_close_approaches"],
] as const;

function policy(provider: string): FreshnessPolicy {
  if (provider === "launch_library_2") {
    return {
      liveForSeconds: 300,
      currentForSeconds: 3_600,
      delayedForSeconds: 7_200,
      usableForSeconds: 604_800,
    };
  }
  if (provider === "noaa_swpc") {
    return {
      liveForSeconds: 120,
      currentForSeconds: 300,
      delayedForSeconds: 900,
      usableForSeconds: 21_600,
    };
  }
  if (provider === "celestrak") {
    return {
      liveForSeconds: 600,
      currentForSeconds: 7_200,
      delayedForSeconds: 14_400,
      usableForSeconds: 604_800,
    };
  }
  if (provider === "jpl_cad") {
    return {
      liveForSeconds: 900,
      currentForSeconds: 21_600,
      delayedForSeconds: 43_200,
      usableForSeconds: 604_800,
    };
  }
  return {
    liveForSeconds: 300,
    currentForSeconds: 1_800,
    delayedForSeconds: 7_200,
    usableForSeconds: 604_800,
  };
}

type ProductDataStore = Pick<ProviderStore, "readHealth" | "readSnapshot">;

export async function readStoredProductData(
  store: ProductDataStore,
  now = new Date(),
): Promise<ProductData> {
  const snapshots = await Promise.all(
    liveDatasets.map(([provider, dataset]) =>
      store.readSnapshot<unknown>({ provider, dataset }),
    ),
  );
  const storedHealth = (
    await Promise.all(
      liveDatasets.map(([provider, dataset]) =>
        store.readHealth({ provider, dataset }),
      ),
    )
  ).filter((item): item is SourceHealth => item !== null);
  const records = (provider: string, dataset: string) =>
    snapshots[
      liveDatasets.findIndex(
        (item) => item[0] === provider && item[1] === dataset,
      )
    ]?.records.map((record) => record.data) ?? [];
  const launches = [
    ...records("launch_library_2", "launches_upcoming"),
    ...records("launch_library_2", "launches_previous"),
  ] as LaunchIntelligenceRecord[];
  const orbitalObjects = liveDatasets
    .filter(([provider]) => provider === "celestrak")
    .flatMap(([, dataset]) =>
      records("celestrak", dataset),
    ) as CelestrakOrbitalRecord[];
  const nearEarthApproaches = records(
    "jpl_cad",
    "earth_close_approaches",
  ) as JplCadRecord[];
  const kp = records("noaa_swpc", "kp_forecast") as KpMeasurement[];
  const scales = records("noaa_swpc", "noaa_scales") as NoaaScaleSnapshot[];
  const solarWind = records(
    "noaa_swpc",
    "solar_wind",
  ) as SolarWindMeasurement[];
  const donki = liveDatasets
    .filter(([provider]) => provider === "nasa_donki")
    .flatMap(([, dataset]) => records("nasa_donki", dataset)) as DonkiEvent[];
  const hasDonkiSnapshot = liveDatasets.some(
    ([provider], index) =>
      provider === "nasa_donki" && snapshots[index] !== null,
  );
  const sources = liveDatasets.map(([provider, dataset], index) => ({
    provider,
    dataset,
    freshness: evaluateFreshness(
      snapshots[index]?.fetchedAt ?? null,
      now,
      policy(provider),
    ).state,
    fetchedAt: snapshots[index]?.fetchedAt ?? null,
  }));
  const health = sources.map((source): SourceHealth => {
    const stored = storedHealth.find(
      (item) =>
        source.provider === item.provider && source.dataset === item.dataset,
    );
    return stored
      ? { ...stored, freshness: source.freshness }
      : {
          provider: source.provider,
          dataset: source.dataset,
          state: "idle",
          freshness: source.freshness,
          lastStartedAt: null,
          lastSucceededAt: null,
          lastFailedAt: null,
          lastDurationMs: null,
          lastAttemptCount: 0,
          recordsReceived: 0,
          recordsWritten: 0,
          consecutiveFailures: 0,
          nextEligibleRefreshAt: null,
          error: null,
        };
  });
  const unavailable = sources.filter(
    (source) => source.freshness === "unavailable",
  );

  return {
    generatedAt: now.toISOString(),
    launches,
    orbitalObjects,
    nearEarthApproaches,
    spaceWeather: buildSpaceWeatherBriefing({
      kp,
      scales,
      solarWind,
      donki: hasDonkiSnapshot ? donki : null,
    }),
    sources,
    health,
    warnings: unavailable.map(
      (source) => `${source.provider}/${source.dataset} is unavailable.`,
    ),
  };
}

async function readLiveData(): Promise<ProductData> {
  return readStoredProductData(
    new DatabaseProviderStore(createProductionDatabase()),
  );
}

export async function readProductData(): Promise<ProductData> {
  return getServerEnvironment().ASTRAOPS_DATA_MODE === "fixture"
    ? readFixtureData()
    : readLiveData();
}

export function launchFromRecord(record: LaunchIntelligenceRecord): Launch {
  return record.launch;
}
