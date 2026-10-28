import { HOST_STATUS_INTERVAL_MS, type HostStatusEvent, type IntervalScheduler } from "./contract";
import { createHostStatusEvent, parseHostStatusEvent } from "./messages";

export interface HostStatusSource {
  subscribe(listener: (event: HostStatusEvent) => void): () => void;
  stop(): void;
}

export function createHostStatusSource(options: {
  now: () => Date;
  scheduler: IntervalScheduler;
  intervalMs?: number;
}): HostStatusSource {
  const intervalMs = options.intervalMs ?? HOST_STATUS_INTERVAL_MS;
  if (!Number.isSafeInteger(intervalMs) || intervalMs < 1) {
    throw new Error("intervalMs must be a positive integer");
  }

  const listeners = new Set<(event: HostStatusEvent) => void>();
  let stopTimer: (() => void) | null = null;
  let sequence = 0;

  const stopTimerOnly = (): void => {
    stopTimer?.();
    stopTimer = null;
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      if (!stopTimer) {
        stopTimer = options.scheduler.start(() => {
          sequence += 1;
          const event = parseHostStatusEvent(createHostStatusEvent(sequence, options.now()));
          for (const current of [...listeners]) {
            current(event);
          }
        }, intervalMs);
      }

      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          stopTimerOnly();
        }
      };
    },
    stop() {
      listeners.clear();
      stopTimerOnly();
    },
  };
}
