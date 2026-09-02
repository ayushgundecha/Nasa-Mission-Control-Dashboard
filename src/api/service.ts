import { CONTRACT_VERSION } from "@/domain";

import {
  launchDetailSchema,
  type LaunchDetail,
  type LaunchesQuery,
} from "./contracts";
import { launchFromRecord, type ProductData } from "./data";

function cursor(offset: number): string {
  return Buffer.from(`v1:${offset}`).toString("base64url");
}

function offset(value?: string): number {
  if (!value) return 0;
  const decoded = Buffer.from(value, "base64url").toString("utf8");
  const match = /^v1:(\d+)$/.exec(decoded);
  if (!match) throw new Error("INVALID_CURSOR");
  const parsed = Number(match[1]);
  if (!Number.isSafeInteger(parsed)) throw new Error("INVALID_CURSOR");
  return parsed;
}

function envelope(data: ProductData) {
  return {
    contractVersion: CONTRACT_VERSION,
    generatedAt: data.generatedAt,
    partial: data.sources.some((source) => source.freshness === "unavailable"),
    warnings: [...data.warnings],
    sources: [...data.sources],
  } as const;
}

export function listLaunches(data: ProductData, query: LaunchesQuery) {
  const direction = query.direction === "asc" ? 1 : -1;
  const needle = query.query?.toLocaleLowerCase();
  const filtered = data.launches
    .filter(
      (record) => !query.status || query.status.includes(record.launch.status),
    )
    .filter(
      (record) =>
        !query.provider ||
        record.agency?.name
          .toLocaleLowerCase()
          .includes(query.provider.toLocaleLowerCase()),
    )
    .filter(
      (record) =>
        !needle ||
        [
          record.launch.name,
          record.launch.missionDescription,
          record.agency?.name,
          record.vehicle?.name,
          record.launch.pad?.locationName,
        ].some((value) => value?.toLocaleLowerCase().includes(needle)),
    )
    .sort((left, right) => {
      const leftValue =
        query.sort === "name"
          ? left.launch.name
          : query.sort === "status"
            ? left.launch.status
            : left.launch.window.start;
      const rightValue =
        query.sort === "name"
          ? right.launch.name
          : query.sort === "status"
            ? right.launch.status
            : right.launch.window.start;
      return (
        leftValue.localeCompare(rightValue) * direction ||
        left.launch.id.localeCompare(right.launch.id)
      );
    });
  const start = offset(query.cursor);
  const page = filtered.slice(start, start + query.limit);
  const nextOffset = start + page.length;

  return {
    ...envelope(data),
    data: page.map(launchFromRecord),
    page: {
      nextCursor: nextOffset < filtered.length ? cursor(nextOffset) : null,
      hasNextPage: nextOffset < filtered.length,
      returned: page.length,
      total: filtered.length,
    },
  };
}

export function launchDetail(
  data: ProductData,
  id: string,
): LaunchDetail | null {
  const record = data.launches.find(
    (item) => item.launch.id === id || item.launch.slug === id,
  );
  if (!record) return null;
  const { upstream, ...detail } = record;
  void upstream;
  return launchDetailSchema.parse(detail);
}

export function detailEnvelope(data: ProductData, detail: LaunchDetail) {
  return { ...envelope(data), data: detail };
}

export function weatherEnvelope(data: ProductData) {
  return { ...envelope(data), data: data.spaceWeather };
}

export function overviewEnvelope(data: ProductData) {
  const generatedAt = Date.parse(data.generatedAt);
  const chronological = [...data.launches].sort((left, right) =>
    left.launch.window.start.localeCompare(right.launch.window.start),
  );
  const future = chronological.filter(
    (record) =>
      ![
        "cancelled",
        "failure",
        "partial_failure",
        "scrubbed",
        "success",
      ].includes(record.launch.status) &&
      Date.parse(record.launch.window.end) >= generatedAt,
  );
  const nextLaunches = future.slice(0, 5).map(launchFromRecord);
  return {
    ...envelope(data),
    data: {
      nextLaunches,
      launchCount: data.launches.length,
      spaceWeather: data.spaceWeather,
    },
  };
}

export function healthEnvelope(data: ProductData) {
  return {
    ...envelope(data),
    data: data.health.map((item) => ({
      provider: item.provider,
      dataset: item.dataset,
      state: item.state,
      freshness: item.freshness,
      lastSucceededAt: item.lastSucceededAt,
      lastFailedAt: item.lastFailedAt,
      recordsWritten: item.recordsWritten,
      consecutiveFailures: item.consecutiveFailures,
      nextEligibleRefreshAt: item.nextEligibleRefreshAt,
      error: item.error
        ? {
            code: item.error.code,
            message: item.error.message,
            retryable: item.error.retryable,
          }
        : null,
    })),
  };
}
