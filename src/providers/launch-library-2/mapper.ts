import { createHash } from "node:crypto";

import {
  agencySchema,
  launchSchema,
  vehicleProfileSchema,
  type Agency,
  type Launch,
  type LaunchStatus,
  type SourceStamp,
  type TimePrecision,
  type VehicleProfile,
} from "@/domain";
import type { NormalizeContext, NormalizedProviderRecord } from "@/providers";

import type { Ll2Agency, Ll2Launch } from "./schema";
import type {
  LaunchFeed,
  LaunchIntelligenceRecord,
  ScheduleChange,
} from "./types";

const broadPrecisions = new Set([
  "AM",
  "PM",
  "WK",
  "M",
  "Q1",
  "Q2",
  "Q3",
  "Q4",
  "H1",
  "H2",
  "Y",
  "FY",
  "DEC",
]);

function sourceStamp(
  launch: Ll2Launch,
  context: NormalizeContext,
): SourceStamp {
  return {
    provider: context.provider,
    providerLabel: context.providerLabel,
    upstreamRecordId: launch.id,
    sourceUrl: launch.url,
    observedAt: launch.last_updated,
    fetchedAt: context.fetchedAt,
    upstreamVersion: launch.last_updated,
    adapterVersion: context.adapterVersion,
    freshness: {
      state: "live",
      ageSeconds: 0,
      staleAfterSeconds: 3_600,
      reason: null,
    },
  };
}

function mapProviderStatus(statusId: number, statusName: string): LaunchStatus {
  const byId: Record<number, LaunchStatus> = {
    1: "go",
    2: "scheduled",
    3: "success",
    4: "failure",
    5: "hold",
    6: "in_flight",
    7: "partial_failure",
    8: "scheduled",
    9: "in_flight",
  };
  if (/cancel/i.test(statusName)) return "cancelled";
  return byId[statusId] ?? "unknown";
}

function scheduleChanges(launch: Ll2Launch): ScheduleChange[] {
  return launch.updates
    .flatMap((update): ScheduleChange[] => {
      const kind = /cancel(?:led|ed|lation)/i.test(update.comment)
        ? "cancelled"
        : /scrub(?:bed)?/i.test(update.comment)
          ? "scrubbed"
          : /reschedul|delay|postpon/i.test(update.comment)
            ? "rescheduled"
            : null;
      return kind
        ? [
            {
              id: `ll2_update:${update.id}`,
              kind,
              changedAt: update.created_on,
              comment: update.comment,
              sourceUrl: update.info_url ?? null,
            },
          ]
        : [];
    })
    .sort(
      (left, right) => Date.parse(right.changedAt) - Date.parse(left.changedAt),
    );
}

function mapStatus(
  launch: Ll2Launch,
  changes: readonly ScheduleChange[],
): LaunchStatus {
  const providerStatus = mapProviderStatus(
    launch.status.id,
    launch.status.name,
  );
  if (providerStatus !== "scheduled") return providerStatus;
  const latestUpdate = [...launch.updates].sort(
    (left, right) => Date.parse(right.created_on) - Date.parse(left.created_on),
  )[0];
  const currentScheduleChange = latestUpdate
    ? changes.find((change) => change.id === `ll2_update:${latestUpdate.id}`)
    : null;
  if (currentScheduleChange?.kind === "cancelled") return "cancelled";
  if (currentScheduleChange?.kind === "scrubbed") return "scrubbed";
  return providerStatus;
}

function mapPrecision(abbreviation: string): TimePrecision {
  if (abbreviation === "SEC") return "second";
  if (abbreviation === "MIN") return "minute";
  if (abbreviation === "HR") return "hour";
  if (abbreviation === "DAY") return "day";
  if (broadPrecisions.has(abbreviation)) return "window";
  return "unknown";
}

function endOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );
}

function broadWindow(
  abbreviation: string,
  net: string,
  upstreamStart: string,
  upstreamEnd: string,
): { start: string; end: string } {
  if (Date.parse(upstreamEnd) > Date.parse(upstreamStart)) {
    return { start: upstreamStart, end: upstreamEnd };
  }

  const date = new Date(net);
  const year = date.getUTCFullYear();
  let start = new Date(Date.UTC(year, date.getUTCMonth(), date.getUTCDate()));
  let end = endOfUtcDay(start);

  if (abbreviation === "WK") {
    const mondayOffset = (start.getUTCDay() + 6) % 7;
    start = new Date(start.getTime() - mondayOffset * 86_400_000);
    end = endOfUtcDay(new Date(start.getTime() + 6 * 86_400_000));
  } else if (abbreviation === "M") {
    start = new Date(Date.UTC(year, date.getUTCMonth(), 1));
    end = new Date(Date.UTC(year, date.getUTCMonth() + 1, 1) - 1);
  } else if (/^Q[1-4]$/.test(abbreviation)) {
    const quarter = Number(abbreviation[1]) - 1;
    start = new Date(Date.UTC(year, quarter * 3, 1));
    end = new Date(Date.UTC(year, quarter * 3 + 3, 1) - 1);
  } else if (abbreviation === "H1" || abbreviation === "H2") {
    const startMonth = abbreviation === "H1" ? 0 : 6;
    start = new Date(Date.UTC(year, startMonth, 1));
    end = new Date(Date.UTC(year, startMonth + 6, 1) - 1);
  } else if (abbreviation === "DEC") {
    const decade = Math.floor(year / 10) * 10;
    start = new Date(Date.UTC(decade, 0, 1));
    end = new Date(Date.UTC(decade + 10, 0, 1) - 1);
  } else if (abbreviation === "Y" || abbreviation === "FY") {
    start = new Date(Date.UTC(year, 0, 1));
    end = new Date(Date.UTC(year + 1, 0, 1) - 1);
  }

  return { start: start.toISOString(), end: end.toISOString() };
}

function mapAgency(
  agency: Ll2Agency | null,
  source: SourceStamp,
): Agency | null {
  if (!agency) return null;
  const typeName = agency.type?.name.toLowerCase() ?? "";
  const type: Agency["type"] = /commercial|private/.test(typeName)
    ? "commercial"
    : /government/.test(typeName)
      ? "government"
      : /multinational|intergovernmental/.test(typeName)
        ? "multinational"
        : /academic|educational|university/.test(typeName)
          ? "academic"
          : "unknown";

  return agencySchema.parse({
    id: `ll2_agency:${agency.id}`,
    name: agency.name,
    abbreviation: agency.abbrev?.trim() || null,
    type,
    countryCodes: agency.country.map((country) => country.alpha_2_code),
    websiteUrl: agency.info_url ?? null,
    source: {
      ...source,
      upstreamRecordId: String(agency.id),
      sourceUrl: agency.url,
    },
  });
}

function mapVehicle(
  launch: Ll2Launch,
  source: SourceStamp,
): VehicleProfile | null {
  const configuration = launch.rocket?.configuration;
  if (!configuration) return null;
  const vehicleSource: SourceStamp = {
    ...source,
    upstreamRecordId: String(configuration.id),
    sourceUrl: configuration.url,
  };

  return vehicleProfileSchema.parse({
    id: `ll2_vehicle:${configuration.id}`,
    name: configuration.full_name,
    family: configuration.name || null,
    manufacturerAgencyId: configuration.manufacturer
      ? `ll2_agency:${configuration.manufacturer.id}`
      : null,
    status: configuration.active ? "active" : "retired",
    payloadToLeo:
      configuration.leo_capacity === null
        ? null
        : {
            value: configuration.leo_capacity,
            unit: "kg",
            evidenceClass: "provider_observed",
            source: vehicleSource,
            method: null,
            uncertainty: null,
          },
    height:
      configuration.length === null
        ? null
        : {
            value: configuration.length,
            unit: "m",
            evidenceClass: "provider_observed",
            source: vehicleSource,
            method: null,
            uncertainty: null,
          },
    reusable: configuration.reusable,
    source: vehicleSource,
  });
}

export function mapLl2Launch(
  upstream: Ll2Launch,
  feed: LaunchFeed,
  context: NormalizeContext,
): NormalizedProviderRecord<LaunchIntelligenceRecord> {
  const source = sourceStamp(upstream, context);
  const changes = scheduleChanges(upstream);
  const precision = mapPrecision(upstream.net_precision.abbrev);
  const window =
    precision === "window"
      ? broadWindow(
          upstream.net_precision.abbrev,
          upstream.net,
          upstream.window_start,
          upstream.window_end,
        )
      : { start: upstream.window_start, end: upstream.window_end };
  const informationUrls = [...upstream.info_urls]
    .sort((left, right) => (left.priority ?? 100) - (right.priority ?? 100))
    .map((item) => ({
      url: item.url,
      title: item.title ?? null,
      source: item.source ?? null,
      type: item.type?.name ?? null,
    }));
  const webcastUrls = [...upstream.vid_urls]
    .sort((left, right) => (left.priority ?? 100) - (right.priority ?? 100))
    .map((item) => ({
      url: item.url,
      title: item.title ?? null,
      publisher: item.publisher ?? null,
      type: item.type?.name ?? null,
    }));

  const launch: Launch = launchSchema.parse({
    id: `ll2:${upstream.id}`,
    name: upstream.name,
    slug: upstream.slug,
    status: mapStatus(upstream, changes),
    window: { ...window, precision },
    launchServiceProviderId: upstream.launch_service_provider
      ? `ll2_agency:${upstream.launch_service_provider.id}`
      : null,
    vehicleId: upstream.rocket?.configuration
      ? `ll2_vehicle:${upstream.rocket.configuration.id}`
      : null,
    missionDescription: upstream.mission?.description || null,
    pad: upstream.pad
      ? {
          name: upstream.pad.name,
          locationName: upstream.pad.location?.name ?? upstream.pad.name,
          position:
            upstream.pad.latitude !== null && upstream.pad.longitude !== null
              ? {
                  latitudeDegrees: upstream.pad.latitude,
                  longitudeDegrees: upstream.pad.longitude,
                }
              : null,
        }
      : null,
    webcastUrl: webcastUrls[0]?.url ?? null,
    imageUrl: upstream.image?.image_url ?? null,
    source,
  });

  const data: LaunchIntelligenceRecord = {
    launch,
    agency: mapAgency(upstream.launch_service_provider, source),
    vehicle: mapVehicle(upstream, source),
    mission: upstream.mission
      ? {
          upstreamId: upstream.mission.id,
          name: upstream.mission.name,
          type: upstream.mission.type,
          orbitName: upstream.mission.orbit?.name ?? null,
          orbitAbbreviation: upstream.mission.orbit?.abbrev ?? null,
          customerAgencyIds: upstream.mission.agencies.map(
            (agency) => `ll2_agency:${agency.id}`,
          ),
        }
      : null,
    media: {
      image: upstream.image
        ? {
            url: upstream.image.image_url,
            thumbnailUrl: upstream.image.thumbnail_url ?? null,
            credit: upstream.image.credit,
            licenseName: upstream.image.license?.name ?? null,
            licenseUrl: upstream.image.license?.link ?? null,
          }
        : null,
      informationUrls,
      webcastUrls,
      webcastLive: upstream.webcast_live,
    },
    scheduleChanges: changes,
    upstream: {
      apiVersion: "2.3.0",
      feed,
      lastUpdatedAt: upstream.last_updated,
      statusId: upstream.status.id,
      statusName: upstream.status.name,
      statusDescription: upstream.status.description,
      netPrecisionId: upstream.net_precision.id,
      netPrecisionName: upstream.net_precision.name,
      netPrecisionAbbreviation: upstream.net_precision.abbrev,
    },
  };

  return {
    id: launch.id,
    upstreamRecordId: upstream.id,
    data,
    source,
    contentHash: createHash("sha256")
      .update(JSON.stringify(upstream))
      .digest("hex"),
  };
}
