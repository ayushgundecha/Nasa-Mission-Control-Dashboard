// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import {
  celestrakCuration,
  celestrakOmmFixture,
  mapCelestrakOmm,
} from "@/providers/celestrak";

import { OrbitClock } from "./clock";
import { OrbitPropagationController } from "./worker-client";
import type { OrbitWorkerRequest } from "./worker-protocol";

class FakeWorker {
  requests: OrbitWorkerRequest[] = [];
  listener: ((event: MessageEvent) => void) | null = null;
  terminated = false;
  postMessage(request: OrbitWorkerRequest) {
    this.requests.push(request);
  }
  addEventListener(
    _type: string,
    listener: EventListenerOrEventListenerObject,
  ) {
    this.listener = listener as (event: MessageEvent) => void;
  }
  removeEventListener() {
    this.listener = null;
  }
  terminate() {
    this.terminated = true;
  }
}

class FakeVisibility {
  hidden = false;
  listener: (() => void) | null = null;
  addEventListener(
    _type: string,
    listener: EventListenerOrEventListenerObject,
  ) {
    this.listener = listener as () => void;
  }
  removeEventListener() {
    this.listener = null;
  }
  setHidden(hidden: boolean) {
    this.hidden = hidden;
    this.listener?.();
  }
}

describe("OrbitPropagationController", () => {
  it("posts typed work off-main-thread and stops scheduling while hidden or paused", () => {
    const worker = new FakeWorker();
    const visibility = new FakeVisibility();
    const intervals = new Map<number, () => void>();
    let nextInterval = 0;
    const scheduler = {
      setInterval(callback: () => void) {
        const id = ++nextInterval;
        intervals.set(id, callback);
        return id as unknown as ReturnType<typeof setInterval>;
      },
      clearInterval(id: ReturnType<typeof setInterval>) {
        intervals.delete(id as unknown as number);
      },
    };
    const object = mapCelestrakOmm(
      celestrakOmmFixture[0]!,
      celestrakCuration[0]!,
      {
        provider: "celestrak",
        providerLabel: "CelesTrak",
        dataset: "omm_stations",
        adapterVersion: "1.0.0",
        sourceUrl: "https://example.test/omm",
        fetchedAt: "2026-09-04T08:00:00.000Z",
      },
    ).data.object;
    const controller = new OrbitPropagationController(
      worker as unknown as Worker,
      new OrbitClock(new Date("2026-09-04T08:00:00.000Z"), () => 0),
      visibility as unknown as Document,
      scheduler,
    );

    const listener = vi.fn();
    controller.start([object], listener);
    expect(worker.requests).toHaveLength(1);
    expect(intervals.size).toBe(1);
    [...intervals.values()][0]?.();
    expect(worker.requests).toHaveLength(2);
    worker.listener?.({
      data: {
        type: "propagation_result",
        requestId: "orbit-2",
        calculatedAt: "2026-09-04T08:00:00.000Z",
        durationMs: 1,
        results: [],
      },
    } as MessageEvent);
    expect(listener).toHaveBeenCalledOnce();
    visibility.setHidden(true);
    expect(intervals.size).toBe(0);
    visibility.setHidden(false);
    expect(worker.requests).toHaveLength(3);
    controller.scrub(3_600_000);
    controller.reset(new Date("2026-09-04T09:00:00.000Z"));
    expect(worker.requests).toHaveLength(5);
    controller.pause();
    expect(intervals.size).toBe(0);
    controller.resume();
    expect(worker.requests).toHaveLength(6);
    controller.dispose();
    expect(worker.terminated).toBe(true);
    expect(worker.listener).toBeNull();
    expect(visibility.listener).toBeNull();
  });
});
