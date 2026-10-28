import { describe, expect, it } from "vitest";
import type { IntervalScheduler } from "@wurst/application";
import { createHostRuntime } from "./host-runtime";

describe("electron host runtime", () => {
  it("publishes the electron fixture overview and stops status delivery", () => {
    const timer: { onTick: (() => void) | null } = { onTick: null };
    const scheduler: IntervalScheduler = {
      start(callback) {
        timer.onTick = callback;
        return () => {
          timer.onTick = null;
        };
      },
    };
    const runtime = createHostRuntime({
      scheduler,
      now: () => new Date("2026-10-28T17:00:00.000Z"),
    });
    const sequences: number[] = [];
    runtime.subscribe((event) => sequences.push(event.sequence));

    expect(runtime.getWorkspaceOverview().bridge).toBe("electron");
    timer.onTick?.();
    runtime.stop();
    timer.onTick?.();

    expect(sequences).toEqual([1]);
    expect(timer.onTick).toBeNull();
  });
});
