import { ContractViolation, createHostStatusEvent, createWorkspaceOverview } from "@wurst/application";
import { describe, expect, it } from "vitest";
import type { WurstBridge } from "../../shared/bridge";
import { createElectronApplicationClient } from "./electron-application-client";

function createBridge(overview: unknown): WurstBridge & {
  emit: (payload: unknown) => void;
  subscriptions: number;
  unsubscribes: number;
} {
  let listener: ((payload: unknown) => void) | null = null;
  return {
    subscriptions: 0,
    unsubscribes: 0,
    getWorkspaceOverview: async () => overview,
    subscribeHostStatus(next) {
      this.subscriptions += 1;
      listener = next;
      return () => {
        this.unsubscribes += 1;
        listener = null;
      };
    },
    emit(payload) {
      listener?.(payload);
    },
  };
}

describe("electron application client", () => {
  it("validates the overview query", async () => {
    const bridge = createBridge(createWorkspaceOverview("electron"));
    const client = createElectronApplicationClient(bridge);
    await expect(client.getWorkspaceOverview()).resolves.toMatchObject({ bridge: "electron" });

    const rejected = createElectronApplicationClient(createBridge({ fixture: false }));
    await expect(rejected.getWorkspaceOverview()).rejects.toBeInstanceOf(ContractViolation);
  });

  it("shares one bridge subscription and drops it after the last listener unsubscribes", () => {
    const bridge = createBridge(createWorkspaceOverview("electron"));
    const client = createElectronApplicationClient(bridge);
    const first: number[] = [];
    const second: number[] = [];
    const unsubscribeFirst = client.subscribeHostStatus((event) => first.push(event.sequence));
    const unsubscribeSecond = client.subscribeHostStatus((event) => second.push(event.sequence));

    bridge.emit(createHostStatusEvent(1, new Date("2026-10-28T17:00:00.000Z")));
    unsubscribeFirst();
    bridge.emit(createHostStatusEvent(2, new Date("2026-10-28T17:00:01.000Z")));
    unsubscribeSecond();
    bridge.emit(createHostStatusEvent(3, new Date("2026-10-28T17:00:02.000Z")));

    expect(first).toEqual([1]);
    expect(second).toEqual([1, 2]);
    expect(bridge.subscriptions).toBe(1);
    expect(bridge.unsubscribes).toBe(1);
  });

  it("does not deliver an invalid host status payload", () => {
    const bridge = createBridge(createWorkspaceOverview("electron"));
    const client = createElectronApplicationClient(bridge);
    const sequences: number[] = [];
    client.subscribeHostStatus((event) => sequences.push(event.sequence));

    expect(() => bridge.emit({ fixture: true, sequence: 1 })).toThrow(ContractViolation);
    expect(sequences).toEqual([]);
  });
});
