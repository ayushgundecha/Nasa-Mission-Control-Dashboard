import type { OrbitalObject } from "@/domain";

import { propagateCatalog, type PropagationResult } from "./propagation";

export type OrbitWorkerRequest = Readonly<{
  type: "propagate";
  requestId: string;
  calculatedAt: string;
  objects: readonly OrbitalObject[];
}>;

export type OrbitWorkerResponse = Readonly<{
  type: "propagation_result";
  requestId: string;
  calculatedAt: string;
  durationMs: number;
  results: readonly PropagationResult[];
}>;

export function handleOrbitWorkerRequest(
  request: OrbitWorkerRequest,
  now: () => number = () => performance.now(),
): OrbitWorkerResponse {
  const started = now();
  const at = new Date(request.calculatedAt);
  const results = propagateCatalog(request.objects, at);
  return {
    type: "propagation_result",
    requestId: request.requestId,
    calculatedAt: request.calculatedAt,
    durationMs: Math.max(0, now() - started),
    results,
  };
}
