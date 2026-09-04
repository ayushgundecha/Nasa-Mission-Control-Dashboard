import type { ProviderAdapter } from "@/providers";

import { mapCelestrakOmm, reconcileCelestrakCatalog } from "./mapper";
import { celestrakOmmSchema, type CelestrakOmm } from "./schema";
import type { CelestrakCuration, CelestrakOrbitalRecord } from "./types";

const HOST = "https://celestrak.org";

export type CelestrakAdapterOptions = Readonly<{
  curation: CelestrakCuration;
  fixturePayload?: CelestrakOmm;
}>;

export function createCelestrakCatalogAdapter(
  options: CelestrakAdapterOptions,
): ProviderAdapter<CelestrakOmm, CelestrakOrbitalRecord> {
  const url = new URL("/NORAD/elements/gp.php", HOST);
  url.searchParams.set("GROUP", options.curation.group);
  url.searchParams.set("FORMAT", "JSON");

  return {
    provider: "celestrak",
    providerLabel: "CelesTrak",
    dataset: `omm_${options.curation.category}`,
    adapterVersion: "1.0.0",
    payloadSchema: celestrakOmmSchema,
    freshness: {
      liveForSeconds: 600,
      currentForSeconds: 7_200,
      delayedForSeconds: 14_400,
      usableForSeconds: 604_800,
    },
    request: () => ({ url: url.toString() }),
    ...(options.fixturePayload
      ? { fixturePayload: options.fixturePayload }
      : {}),
    normalize: (payload, context) =>
      reconcileCelestrakCatalog(
        payload.map((item) => mapCelestrakOmm(item, options.curation, context)),
        options.curation.maxObjects,
      ),
  };
}
