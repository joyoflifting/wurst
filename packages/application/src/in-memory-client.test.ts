import { afterEach, describe, expect, it, vi } from "vitest";
import type { IntervalScheduler } from "./contract";
import { createInMemoryApplicationClient } from "./in-memory-client";
import { createIntervalScheduler } from "./scheduler";

const now = (): Date => new Date("2026-10-28T17:00:00.000Z");

function controllableScheduler(): IntervalScheduler & { tick: () => void; stops: number } {
  let onTick: (() => void) | null = null;
  return {
    stops: 0,
    start(callback) {
      onTick = callback;
      return () => {
        this.stops += 1;
        onTick = null;
      };
    },
    tick() {
      onTick?.();
    },
  };
}

describe("in-memory application client", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the fixture overview from the memory bridge", async () => {
    const client = createInMemoryApplicationClient({ now, scheduler: controllableScheduler() });
    const overview = await client.getWorkspaceOverview();
    expect(overview.bridge).toBe("memory");
    expect(overview.fixture).toBe(true);
    expect(overview.disclaimer).toContain("not connected");
  });

  it("fans out status events and stops the scheduler when the last listener unsubscribes", () => {
    const scheduler = controllableScheduler();
    const client = createInMemoryApplicationClient({ now, scheduler });
    const first: number[] = [];
    const second: number[] = [];
    const unsubscribeFirst = client.subscribeHostStatus((event) => first.push(event.sequence));
    const unsubscribeSecond = client.subscribeHostStatus((event) => second.push(event.sequence));

    scheduler.tick();
    unsubscribeFirst();
    scheduler.tick();
    unsubscribeSecond();
    scheduler.tick();

    expect(first).toEqual([1]);
    expect(second).toEqual([1, 2]);
    expect(scheduler.stops).toBe(1);
  });

  it("clears the default interval after unsubscribe", () => {
    vi.useFakeTimers();
    const client = createInMemoryApplicationClient({
      now,
      scheduler: createIntervalScheduler(),
      intervalMs: 1000,
    });
    const sequences: number[] = [];
    const unsubscribe = client.subscribeHostStatus((event) => sequences.push(event.sequence));

    vi.advanceTimersByTime(1000);
    unsubscribe();
    vi.advanceTimersByTime(5000);

    expect(sequences).toEqual([1]);
  });
});
