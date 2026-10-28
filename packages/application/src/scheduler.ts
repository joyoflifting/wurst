import type { IntervalScheduler } from "./contract";

interface TimerHost {
  setInterval: (callback: () => void, intervalMs: number) => unknown;
  clearInterval: (handle: unknown) => void;
}

export function createIntervalScheduler(host: TimerHost = globalThis as unknown as TimerHost): IntervalScheduler {
  return {
    start(onTick, intervalMs) {
      const handle = host.setInterval(onTick, intervalMs);
      return () => {
        host.clearInterval(handle);
      };
    },
  };
}
