import { createHash } from "node:crypto";

import type { SourceStamp } from "@/domain";
import type {
  NormalizeContext,
  NormalizedProviderRecord,
  ProviderAdapter,
} from "@/providers";

import type { DonkiEvent } from "../types";
import {
  donkiCmeSchema,
  donkiFlareSchema,
  donkiGeomagneticStormSchema,
  donkiNotificationSchema,
  type DonkiCmePayload,
  type DonkiFlarePayload,
  type DonkiGeomagneticStormPayload,
  type DonkiNotificationPayload,
} from "./schema";

const BASE_URL = "https://api.nasa.gov/DONKI";
const PUBLIC_SOURCE_URL = "https://ccmc.gsfc.nasa.gov/tools/DONKI/";
const freshness = {
  liveForSeconds: 300,
  currentForSeconds: 1_800,
  delayedForSeconds: 7_200,
  usableForSeconds: 604_800,
} as const;

type DonkiOptions<TPayload> = Readonly<{
  apiKey: string;
  endDate: string;
  fixturePayload?: TPayload;
}>;

function dateRange(endDate: string): { startDate: string; endDate: string } {
  const end = new Date(`${endDate}T00:00:00.000Z`);
  if (!Number.isFinite(end.getTime()))
    throw new Error("Invalid DONKI end date");
  const start = new Date(end.getTime() - 7 * 86_400_000);
  return { startDate: start.toISOString().slice(0, 10), endDate };
}

function requestUrl(endpoint: string, options: DonkiOptions<unknown>): string {
  if (!options.apiKey.trim())
    throw new Error("NASA_API_KEY is required for DONKI");
  const range = dateRange(options.endDate);
  const url = new URL(`${BASE_URL}/${endpoint}`);
  url.searchParams.set("startDate", range.startDate);
  url.searchParams.set("endDate", range.endDate);
  url.searchParams.set("api_key", options.apiKey);
  return url.toString();
}

function safeUrl(value: string): string {
  const url = new URL(value);
  url.searchParams.delete("api_key");
  return url.toString();
}

function normalizeTimestamp(value: string): string {
  return new Date(value).toISOString();
}

function stamp(
  context: NormalizeContext,
  upstreamRecordId: string,
  observedAt: string,
  link: string,
): SourceStamp {
  return {
    provider: context.provider,
    providerLabel: context.providerLabel,
    upstreamRecordId,
    sourceUrl: safeUrl(link),
    observedAt,
    fetchedAt: context.fetchedAt,
    upstreamVersion: observedAt,
    adapterVersion: context.adapterVersion,
    freshness: {
      state: "live",
      ageSeconds: 0,
      staleAfterSeconds: 1_800,
      reason: null,
    },
  };
}

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function normalized(
  event: DonkiEvent,
  source: SourceStamp,
  raw: unknown,
): NormalizedProviderRecord<DonkiEvent> {
  return {
    id: event.id,
    upstreamRecordId: source.upstreamRecordId!,
    data: event,
    source,
    contentHash: hash(raw),
  };
}

function base<TPayload>(
  endpoint: string,
  dataset: string,
  options: DonkiOptions<TPayload>,
) {
  return {
    provider: "nasa_donki",
    providerLabel: "NASA DONKI",
    dataset,
    adapterVersion: "1.0.0",
    allowEmptySnapshot: true,
    freshness,
    request: () => ({ url: requestUrl(endpoint, options) }),
    ...(options.fixturePayload
      ? { fixturePayload: options.fixturePayload }
      : {}),
  } as const;
}

export function createDonkiFlareAdapter(
  options: DonkiOptions<DonkiFlarePayload>,
): ProviderAdapter<DonkiFlarePayload, DonkiEvent> {
  return {
    ...base("FLR", "donki_flares", options),
    payloadSchema: donkiFlareSchema,
    normalize: (payload, context) =>
      payload.map((item) => {
        const startedAt = normalizeTimestamp(item.beginTime);
        const source = stamp(context, item.flrID, startedAt, item.link);
        return normalized(
          {
            id: `donki_flare:${item.flrID.replaceAll(":", "-")}`,
            eventType: "flare",
            startedAt,
            peakAt: item.peakTime ? normalizeTimestamp(item.peakTime) : null,
            submittedAt: item.submissionTime
              ? normalizeTimestamp(item.submissionTime)
              : null,
            classType: item.classType,
            sourceLocation: item.sourceLocation,
            summary: item.note,
            measurements: [],
            evidenceMode: "analyst_event",
            source,
          },
          source,
          item,
        );
      }),
  };
}

export function createDonkiCmeAdapter(
  options: DonkiOptions<DonkiCmePayload>,
): ProviderAdapter<DonkiCmePayload, DonkiEvent> {
  return {
    ...base("CME", "donki_cmes", options),
    payloadSchema: donkiCmeSchema,
    normalize: (payload, context) =>
      payload.map((item) => {
        const startedAt = normalizeTimestamp(item.startTime);
        const source = stamp(context, item.activityID, startedAt, item.link);
        const analyses = item.cmeAnalyses ?? [];
        return normalized(
          {
            id: `donki_cme:${item.activityID.replaceAll(":", "-")}`,
            eventType: "cme",
            startedAt,
            peakAt: null,
            submittedAt: item.submissionTime
              ? normalizeTimestamp(item.submissionTime)
              : null,
            classType: null,
            sourceLocation: item.sourceLocation,
            summary: item.note,
            measurements: analyses
              .filter(
                (analysis) =>
                  analysis.isMostAccurate && analysis.speed !== null,
              )
              .map((analysis) => ({
                observedAt: analysis.time21_5
                  ? normalizeTimestamp(analysis.time21_5)
                  : startedAt,
                name: "cme_speed" as const,
                value: analysis.speed!,
                unit: "km_per_s" as const,
              })),
            evidenceMode: "analyst_event",
            source,
          },
          source,
          item,
        );
      }),
  };
}

export function createDonkiGeomagneticStormAdapter(
  options: DonkiOptions<DonkiGeomagneticStormPayload>,
): ProviderAdapter<DonkiGeomagneticStormPayload, DonkiEvent> {
  return {
    ...base("GST", "donki_geomagnetic_storms", options),
    payloadSchema: donkiGeomagneticStormSchema,
    normalize: (payload, context) =>
      payload.map((item) => {
        const startedAt = normalizeTimestamp(item.startTime);
        const source = stamp(context, item.gstID, startedAt, item.link);
        return normalized(
          {
            id: `donki_gst:${item.gstID.replaceAll(":", "-")}`,
            eventType: "geomagnetic_storm",
            startedAt,
            peakAt: null,
            submittedAt: item.submissionTime
              ? normalizeTimestamp(item.submissionTime)
              : null,
            classType: null,
            sourceLocation: null,
            summary: null,
            measurements: item.allKpIndex.map((measurement) => ({
              observedAt: normalizeTimestamp(measurement.observedTime),
              name: "kp" as const,
              value: measurement.kpIndex,
              unit: "unitless" as const,
            })),
            evidenceMode: "analyst_event",
            source,
          },
          source,
          item,
        );
      }),
  };
}

export function createDonkiNotificationAdapter(
  options: DonkiOptions<DonkiNotificationPayload>,
): ProviderAdapter<DonkiNotificationPayload, DonkiEvent> {
  return {
    ...base("notifications", "donki_notifications", options),
    payloadSchema: donkiNotificationSchema,
    normalize: (payload, context) =>
      payload.map((item) => {
        const startedAt = normalizeTimestamp(item.messageIssueTime);
        const source = stamp(
          context,
          item.messageID,
          startedAt,
          item.messageURL,
        );
        return normalized(
          {
            id: `donki_notification:${item.messageID.replaceAll(":", "-")}`,
            eventType: "notification",
            startedAt,
            peakAt: null,
            submittedAt: startedAt,
            classType: item.messageType,
            sourceLocation: null,
            summary: item.messageBody,
            measurements: [],
            evidenceMode: "analyst_event",
            source,
          },
          source,
          item,
        );
      }),
  };
}

export const donkiPublicSourceUrl = PUBLIC_SOURCE_URL;
