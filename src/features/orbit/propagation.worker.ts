/// <reference lib="webworker" />

import {
  handleOrbitWorkerRequest,
  type OrbitWorkerRequest,
} from "./worker-protocol";

declare const self: DedicatedWorkerGlobalScope;

self.addEventListener("message", (event: MessageEvent<OrbitWorkerRequest>) => {
  if (event.data.type !== "propagate") return;
  self.postMessage(handleOrbitWorkerRequest(event.data));
});

export {};
