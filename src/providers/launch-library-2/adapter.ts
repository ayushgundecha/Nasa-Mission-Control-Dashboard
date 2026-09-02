import type { ProviderAdapter } from "@/providers";

import { mapLl2Launch } from "./mapper";
import { ll2LaunchPageSchema, type Ll2LaunchPage } from "./schema";
import type { LaunchFeed, LaunchIntelligenceRecord } from "./types";

const LL2_VERSION = "2.3.0";

export type LaunchLibraryAdapterOptions = Readonly<{
  feed: LaunchFeed;
  environment: "development" | "production";
  fixturePayload?: Ll2LaunchPage;
}>;

export function createLaunchLibraryAdapter(
  options: LaunchLibraryAdapterOptions,
): ProviderAdapter<Ll2LaunchPage, LaunchIntelligenceRecord> {
  const host =
    options.environment === "production"
      ? "https://ll.thespacedevs.com"
      : "https://lldev.thespacedevs.com";
  const url = new URL(`/${LL2_VERSION}/launches/${options.feed}/`, host);
  url.searchParams.set("limit", "100");
  url.searchParams.set("mode", "detailed");
  url.searchParams.set(
    "ordering",
    options.feed === "upcoming" ? "net" : "-net",
  );

  return {
    provider: "launch_library_2",
    providerLabel: "Launch Library 2",
    dataset: `launches_${options.feed}`,
    adapterVersion: "1.0.0",
    payloadSchema: ll2LaunchPageSchema,
    freshness: {
      liveForSeconds: 300,
      currentForSeconds: 3_600,
      delayedForSeconds: 7_200,
      usableForSeconds: 604_800,
    },
    request: () => ({ url: url.toString() }),
    ...(options.fixturePayload
      ? { fixturePayload: options.fixturePayload }
      : {}),
    normalize: (payload, context) =>
      payload.results.map((launch) =>
        mapLl2Launch(launch, options.feed, context),
      ),
  };
}
