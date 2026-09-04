import type { OrbitalObject } from "@/domain";

import { OrbitClock } from "./clock";
import type {
  OrbitWorkerRequest,
  OrbitWorkerResponse,
} from "./worker-protocol";

type WorkerPort = Pick<
  Worker,
  "postMessage" | "addEventListener" | "removeEventListener" | "terminate"
>;
type VisibilitySource = Pick<
  Document,
  "hidden" | "addEventListener" | "removeEventListener"
>;
type Scheduler = Readonly<{
  setInterval: (
    callback: () => void,
    milliseconds: number,
  ) => ReturnType<typeof setInterval>;
  clearInterval: (handle: ReturnType<typeof setInterval>) => void;
}>;

export type OrbitUpdateListener = (response: OrbitWorkerResponse) => void;

export class OrbitPropagationController {
  private objects: readonly OrbitalObject[] = [];
  private listener: OrbitUpdateListener | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private requestSequence = 0;
  private started = false;

  constructor(
    private readonly worker: WorkerPort,
    private readonly clock: OrbitClock,
    private readonly visibility: VisibilitySource,
    private readonly scheduler: Scheduler = {
      setInterval: (callback, milliseconds) =>
        setInterval(callback, milliseconds),
      clearInterval: (handle) => clearInterval(handle),
    },
    private readonly intervalMs = 1_000,
  ) {}

  start(
    objects: readonly OrbitalObject[],
    listener: OrbitUpdateListener,
  ): void {
    if (this.started) this.stop();
    this.objects = objects;
    this.listener = listener;
    this.started = true;
    this.worker.addEventListener("message", this.onMessage);
    this.visibility.addEventListener(
      "visibilitychange",
      this.onVisibilityChange,
    );
    this.clock.setVisible(!this.visibility.hidden);
    if (!this.visibility.hidden) {
      this.request();
      this.startTimer();
    }
  }

  pause(): void {
    this.clock.pause();
    this.stopTimer();
  }

  resume(): void {
    this.clock.resume();
    if (this.started && !this.visibility.hidden) {
      this.request();
      this.startTimer();
    }
  }

  scrub(offsetMs: number): void {
    this.clock.scrub(offsetMs);
    if (!this.visibility.hidden) this.request();
  }

  reset(utc: Date): void {
    this.clock.reset(utc);
    if (!this.visibility.hidden) this.request();
  }

  stop(): void {
    this.stopTimer();
    if (this.started) {
      this.worker.removeEventListener("message", this.onMessage);
      this.visibility.removeEventListener(
        "visibilitychange",
        this.onVisibilityChange,
      );
    }
    this.started = false;
    this.listener = null;
    this.objects = [];
  }

  dispose(): void {
    this.stop();
    this.worker.terminate();
  }

  private readonly onMessage = (event: MessageEvent<OrbitWorkerResponse>) => {
    if (event.data.type === "propagation_result") this.listener?.(event.data);
  };

  private readonly onVisibilityChange = () => {
    const visible = !this.visibility.hidden;
    this.clock.setVisible(visible);
    if (!visible) {
      this.stopTimer();
      return;
    }
    if (this.clock.snapshot().running) {
      this.request();
      this.startTimer();
    }
  };

  private request() {
    const snapshot = this.clock.snapshot();
    if (!snapshot.running || !snapshot.visible) return;
    const request: OrbitWorkerRequest = {
      type: "propagate",
      requestId: `orbit-${++this.requestSequence}`,
      calculatedAt: snapshot.time,
      objects: this.objects,
    };
    this.worker.postMessage(request);
  }

  private startTimer() {
    if (this.timer !== null) return;
    this.timer = this.scheduler.setInterval(
      () => this.request(),
      this.intervalMs,
    );
  }

  private stopTimer() {
    if (this.timer === null) return;
    this.scheduler.clearInterval(this.timer);
    this.timer = null;
  }
}

export function createBrowserOrbitController(initialUtc: Date) {
  const worker = new Worker(
    new URL("./propagation.worker.ts", import.meta.url),
    {
      type: "module",
      name: "astraops-orbit-propagation",
    },
  );
  return new OrbitPropagationController(
    worker,
    new OrbitClock(initialUtc),
    document,
  );
}
