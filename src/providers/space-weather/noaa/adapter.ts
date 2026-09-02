import { createHash } from "node:crypto";

import type { SourceStamp } from "@/domain";
import type {
  NormalizeContext,
  NormalizedProviderRecord,
  ProviderAdapter,
} from "@/providers";

import { interpretKp } from "../interpretation";
import type {
  KpMeasurement,
  NoaaScaleSnapshot,
  SolarWindMeasurement,
} from "../types";
import {
  noaaKpForecastSchema,
  noaaScalesSchema,
  noaaSolarWindSchema,
  type NoaaKpForecast,
  type NoaaScales,
  type NoaaSolarWind,
} from "./schema";

const BASE_URL = "https://services.swpc.noaa.gov";
const freshness = {
  liveForSeconds: 120,
  currentForSeconds: 300,
  delayedForSeconds: 900,
  usableForSeconds: 21_600,
} as const;

function utc(value: string): string {
  return value.endsWith("Z") ? value : `${value}Z`;
}

function recordId(prefix: string, timestamp: string): string {
  return `${prefix}:${timestamp.replaceAll(":", "-")}`;
}

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function source(
  context: NormalizeContext,
  sourceUrl: string,
  upstreamRecordId: string,
  observedAt: string,
): SourceStamp {
  return {
    provider: context.provider,
    providerLabel: context.providerLabel,
    upstreamRecordId,
    sourceUrl,
    observedAt,
    fetchedAt: context.fetchedAt,
    upstreamVersion: observedAt,
    adapterVersion: context.adapterVersion,
    freshness: {
      state: "live",
      ageSeconds: 0,
      staleAfterSeconds: 300,
      reason: null,
    },
  };
}

function adapterBase(dataset: string, url: string) {
  return {
    provider: "noaa_swpc",
    providerLabel: "NOAA Space Weather Prediction Center",
    dataset,
    adapterVersion: "1.0.0",
    freshness,
    request: () => ({ url }),
  } as const;
}

export function createNoaaKpAdapter(
  fixturePayload?: NoaaKpForecast,
): ProviderAdapter<NoaaKpForecast, KpMeasurement> {
  const sourceUrl = `${BASE_URL}/products/noaa-planetary-k-index-forecast.json`;
  return {
    ...adapterBase("kp_forecast", sourceUrl),
    payloadSchema: noaaKpForecastSchema,
    ...(fixturePayload ? { fixturePayload } : {}),
    normalize: (payload, context) => {
      const fetchedAt = Date.parse(context.fetchedAt);
      const lowerBound = fetchedAt - 24 * 60 * 60 * 1000;
      const upperBound = fetchedAt + 72 * 60 * 60 * 1000;
      return payload
        .filter((item) => {
          const time = Date.parse(utc(item.time_tag));
          return time >= lowerBound && time <= upperBound;
        })
        .map((item): NormalizedProviderRecord<KpMeasurement> => {
          const validAt = utc(item.time_tag);
          const id = recordId("noaa_kp", validAt);
          const stamp = source(context, sourceUrl, id, validAt);
          const data: KpMeasurement = {
            id,
            validAt,
            kp: item.kp,
            noaaScale: item.noaa_scale,
            evidenceMode: item.observed,
            interpretation: interpretKp(item.kp),
            source: stamp,
          };
          return {
            id,
            upstreamRecordId: id,
            data,
            source: stamp,
            contentHash: hash(item),
          };
        });
    },
  };
}

export function createNoaaScalesAdapter(
  fixturePayload?: NoaaScales,
): ProviderAdapter<NoaaScales, NoaaScaleSnapshot> {
  const sourceUrl = `${BASE_URL}/products/noaa-scales.json`;
  const periods = {
    "-1": ["previous_day", "observed"],
    "0": ["current", "observed"],
    "1": ["forecast_day_1", "predicted"],
    "2": ["forecast_day_2", "predicted"],
    "3": ["forecast_day_3", "predicted"],
  } as const;
  return {
    ...adapterBase("noaa_scales", sourceUrl),
    payloadSchema: noaaScalesSchema,
    ...(fixturePayload ? { fixturePayload } : {}),
    normalize: (payload, context) =>
      Object.entries(periods).flatMap(
        ([
          key,
          [period, evidenceMode],
        ]): NormalizedProviderRecord<NoaaScaleSnapshot>[] => {
          const item = payload[key];
          if (!item) return [];
          const validAt = `${item.DateStamp}T${item.TimeStamp}Z`;
          const id = `noaa_scales:${key.replace("-", "previous")}`;
          const stamp = source(context, sourceUrl, id, validAt);
          const parseScale = (value: string | null) => {
            if (value === null || value.trim() === "") return null;
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : null;
          };
          const data: NoaaScaleSnapshot = {
            id,
            validAt,
            period,
            evidenceMode,
            radioBlackout: {
              scale: parseScale(item.R.Scale),
              text: item.R.Text,
            },
            solarRadiation: {
              scale: parseScale(item.S.Scale),
              text: item.S.Text,
            },
            geomagneticStorm: {
              scale: parseScale(item.G.Scale),
              text: item.G.Text,
            },
            source: stamp,
          };
          return [
            {
              id,
              upstreamRecordId: id,
              data,
              source: stamp,
              contentHash: hash(item),
            },
          ];
        },
      ),
  };
}

export function createNoaaSolarWindAdapter(
  fixturePayload?: NoaaSolarWind,
): ProviderAdapter<NoaaSolarWind, SolarWindMeasurement> {
  const sourceUrl = `${BASE_URL}/products/geospace/propagated-solar-wind-1-hour.json`;
  return {
    ...adapterBase("solar_wind", sourceUrl),
    payloadSchema: noaaSolarWindSchema,
    ...(fixturePayload ? { fixturePayload } : {}),
    normalize: (payload, context) =>
      payload
        .slice(1)
        .slice(-60)
        .map((item): NormalizedProviderRecord<SolarWindMeasurement> => {
          const [timeTag, speed, , , , , bz, bt, , , , propagatedTimeTag] =
            item;
          const observedAt = utc(timeTag);
          const id = recordId("noaa_solar_wind", observedAt);
          const stamp = source(context, sourceUrl, id, observedAt);
          const data: SolarWindMeasurement = {
            id,
            observedAt,
            speedKilometersPerSecond: typeof speed === "number" ? speed : null,
            totalMagneticFieldNanotesla: typeof bt === "number" ? bt : null,
            bzGsmNanotesla: typeof bz === "number" ? bz : null,
            evidenceMode: "observed",
            source: stamp,
          };
          return {
            id,
            upstreamRecordId: id,
            data,
            source: stamp,
            contentHash: hash({ item, propagatedTimeTag }),
          };
        }),
  };
}
