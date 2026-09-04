import type { OrbitalObject } from "@/domain";
import {
  celestrakCuration,
  celestrakOrbitWatchFixture,
  mapCelestrakOmm,
  type CelestrakCurationCategory,
} from "@/providers/celestrak";
import {
  jplCadApproachFeedFixture,
  mapJplCadRow,
  type JplCadRecord,
} from "@/providers/jpl-cad";

export type OrbitWatchObject = Readonly<{
  object: OrbitalObject;
  category: CelestrakCurationCategory;
}>;

const categoryByIndex: readonly CelestrakCurationCategory[] = [
  "stations",
  "science_weather",
  "navigation",
  "navigation",
  "commercial_communications",
  "commercial_communications",
  "science_weather",
  "science_weather",
];

export function readFixtureOrbitWatchCatalog(): readonly OrbitWatchObject[] {
  return celestrakOrbitWatchFixture.map((item, index) => {
    const category = categoryByIndex[index] ?? "science_weather";
    const curation = celestrakCuration.find(
      (entry) => entry.category === category,
    )!;
    return {
      object: mapCelestrakOmm(item, curation, {
        provider: "celestrak",
        providerLabel: "CelesTrak",
        dataset: `omm_${category}`,
        adapterVersion: "1.0.0",
        sourceUrl: `https://celestrak.org/NORAD/elements/gp.php?GROUP=${curation.group}&FORMAT=JSON`,
        fetchedAt: "2026-09-02T08:00:00.000Z",
      }).data.object,
      category,
    };
  });
}

export function readFixtureApproachFeed(): readonly JplCadRecord[] {
  const context = {
    provider: "jpl_cad",
    providerLabel: "NASA/JPL SBDB CAD",
    dataset: "earth_close_approaches",
    adapterVersion: "1.0.0",
    sourceUrl:
      "https://ssd-api.jpl.nasa.gov/cad.api?body=Earth&date-min=now&date-max=%2B60&dist-max=10LD&diameter=true&fullname=true",
    fetchedAt: "2026-09-02T08:00:00.000Z",
  };
  return (jplCadApproachFeedFixture.data ?? []).map(
    (row) => mapJplCadRow(row, context).data,
  );
}
