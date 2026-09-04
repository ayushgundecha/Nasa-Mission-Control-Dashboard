import type { ProviderAdapter } from "@/providers";

import { mapJplCadRow } from "./mapper";
import { jplCadPayloadSchema, type JplCadPayload } from "./schema";
import type { JplCadRecord } from "./types";

const HOST = "https://ssd-api.jpl.nasa.gov";
const DAY_MS = 86_400_000;

export type JplCadAdapterOptions = Readonly<{
  startDate: string;
  endDate: string;
  fixturePayload?: JplCadPayload;
}>;

function boundedWindow(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  const days = (end.getTime() - start.getTime()) / DAY_MS;
  if (
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime()) ||
    startDate < "2017-01-01" ||
    days < 0 ||
    days > 90
  ) {
    throw new Error(
      "JPL CAD window must be a valid 0–90 day range from 2017 onward",
    );
  }
  return { startDate, endDate };
}

export function createJplCadAdapter(
  options: JplCadAdapterOptions,
): ProviderAdapter<JplCadPayload, JplCadRecord> {
  const window = boundedWindow(options.startDate, options.endDate);
  const url = new URL("/cad.api", HOST);
  url.searchParams.set("date-min", window.startDate);
  url.searchParams.set("date-max", window.endDate);
  url.searchParams.set("dist-max", "10LD");
  url.searchParams.set("body", "Earth");
  url.searchParams.set("neo", "true");
  url.searchParams.set("sort", "date");
  url.searchParams.set("limit", "100");
  url.searchParams.set("diameter", "true");
  url.searchParams.set("fullname", "true");

  return {
    provider: "jpl_cad",
    providerLabel: "NASA/JPL SBDB Close Approach Data",
    dataset: "earth_close_approaches",
    adapterVersion: "1.0.0",
    allowEmptySnapshot: true,
    payloadSchema: jplCadPayloadSchema,
    freshness: {
      liveForSeconds: 900,
      currentForSeconds: 21_600,
      delayedForSeconds: 43_200,
      usableForSeconds: 604_800,
    },
    request: () => ({ url: url.toString() }),
    ...(options.fixturePayload
      ? { fixturePayload: options.fixturePayload }
      : {}),
    normalize: (payload, context) =>
      (payload.data ?? []).map((row) => mapJplCadRow(row, context)),
  };
}
