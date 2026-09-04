import type { NearEarthApproach } from "@/domain";

export type JplCadRecord = Readonly<{
  approach: NearEarthApproach;
  distanceSummary: string;
}>;
