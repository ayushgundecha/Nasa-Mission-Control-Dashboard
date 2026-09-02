import type { Agency, Launch, VehicleProfile } from "@/domain";

export type LaunchFeed = "previous" | "upcoming";

export type ScheduleChange = Readonly<{
  id: string;
  kind: "cancelled" | "rescheduled" | "scrubbed";
  changedAt: string;
  comment: string;
  sourceUrl: string | null;
}>;

export type LaunchMedia = Readonly<{
  image: Readonly<{
    url: string;
    thumbnailUrl: string | null;
    credit: string | null;
    licenseName: string | null;
    licenseUrl: string | null;
  }> | null;
  informationUrls: readonly Readonly<{
    url: string;
    title: string | null;
    source: string | null;
    type: string | null;
  }>[];
  webcastUrls: readonly Readonly<{
    url: string;
    title: string | null;
    publisher: string | null;
    type: string | null;
  }>[];
  webcastLive: boolean;
}>;

export type LaunchIntelligenceRecord = Readonly<{
  launch: Launch;
  agency: Agency | null;
  vehicle: VehicleProfile | null;
  mission: Readonly<{
    upstreamId: number;
    name: string;
    type: string | null;
    orbitName: string | null;
    orbitAbbreviation: string | null;
    customerAgencyIds: readonly string[];
  }> | null;
  media: LaunchMedia;
  scheduleChanges: readonly ScheduleChange[];
  upstream: Readonly<{
    apiVersion: "2.3.0";
    feed: LaunchFeed;
    lastUpdatedAt: string;
    statusId: number;
    statusName: string;
    statusDescription: string;
    netPrecisionId: number;
    netPrecisionName: string;
    netPrecisionAbbreviation: string;
  }>;
}>;
