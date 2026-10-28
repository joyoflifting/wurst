import { createHostStatusEvent, createWorkspaceOverview, type HostStatusEvent } from "@wurst/application";
import { describe, expect, it } from "vitest";
import { HostChannel } from "../shared/channels";
import { registerHostIpc, UnexpectedHostPayloadError, type HostIpc, type IpcSender } from "./host-ipc";
import type { HostRuntime } from "./host-runtime";

class FakeSender implements IpcSender {
  readonly sent: unknown[] = [];
  destroyed = false;
  private destroyedListener: (() => void) | null = null;

  constructor(readonly id: number) {}

  isDestroyed(): boolean {
    return this.destroyed;
  }

  send(_channel: string, payload: unknown): void {
    this.sent.push(payload);
  }

  onDestroyed(listener: () => void): void {
    this.destroyedListener = listener;
  }

  destroy(): void {
    this.destroyed = true;
    this.destroyedListener?.();
  }
}

function createHarness() {
  const handles = new Map<string, (event: { sender: IpcSender }, ...args: unknown[]) => unknown>();
  const listeners = new Map<string, (event: { sender: IpcSender }, ...args: unknown[]) => void>();
  const ipc: HostIpc = {
    handle(channel, listener) {
      handles.set(channel, listener);
    },
    on(channel, listener) {
      listeners.set(channel, listener);
    },
  };
  const subscriptions: Array<{ deliver: (event: HostStatusEvent) => void; id: number }> = [];
  const stops: number[] = [];
  let overviewReads = 0;
  let nextStop = 0;
  const runtime: HostRuntime = {
    getWorkspaceOverview() {
      overviewReads += 1;
      return createWorkspaceOverview("electron");
    },
    subscribe(listener) {
      const id = nextStop;
      nextStop += 1;
      stops[id] = 0;
      const entry = { deliver: listener, id };
      subscriptions.push(entry);
      return () => {
        stops[id] = (stops[id] ?? 0) + 1;
        const index = subscriptions.indexOf(entry);
        if (index >= 0) {
          subscriptions.splice(index, 1);
        }
      };
    },
    stop() {
      subscriptions.splice(0);
    },
  };
  const registration = registerHostIpc(ipc, runtime);
  return { handles, listeners, registration, subscriptions, stops, overviewReads: () => overviewReads };
}

describe("host IPC adapter", () => {
  it("registers only the workspace query and subscription channels", () => {
    const harness = createHarness();
    expect([...harness.handles.keys(), ...harness.listeners.keys()]).toEqual([
      "wurst:get-workspace-overview",
      "wurst:subscribe-host-status",
      "wurst:unsubscribe-host-status",
    ]);
  });

  it("serves the overview and rejects an unexpected query payload", () => {
    const harness = createHarness();
    const sender = new FakeSender(1);
    const query = harness.handles.get(HostChannel.getWorkspaceOverview);
    expect(query?.({ sender })).toMatchObject({ bridge: "electron", fixture: true });
    expect(() => query?.({ sender }, { command: "ls" })).toThrow(UnexpectedHostPayloadError);
    expect(harness.overviewReads()).toBe(1);
  });

  it("ignores subscription messages that carry a payload", () => {
    const harness = createHarness();
    const sender = new FakeSender(4);
    harness.listeners.get(HostChannel.subscribeHostStatus)?.({ sender }, "extra");
    harness.listeners.get(HostChannel.unsubscribeHostStatus)?.({ sender }, "extra");
    expect(harness.subscriptions).toHaveLength(0);
  });

  it("delivers status once per subscription and stops when the sender is gone", () => {
    const harness = createHarness();
    const sender = new FakeSender(7);
    harness.listeners.get(HostChannel.subscribeHostStatus)?.({ sender });
    const event = createHostStatusEvent(1, new Date("2026-10-28T17:00:00.000Z"));
    harness.subscriptions[0]?.deliver(event);
    expect(sender.sent).toEqual([event]);

    sender.destroyed = true;
    harness.subscriptions[0]?.deliver(createHostStatusEvent(2, new Date("2026-10-28T17:00:01.000Z")));
    expect(sender.sent).toHaveLength(1);

    sender.destroy();
    expect(harness.stops[0]).toBe(1);
    expect(harness.subscriptions).toHaveLength(0);
  });

  it("releases one subscription on unsubscribe and the rest when the sender is destroyed", () => {
    const harness = createHarness();
    const sender = new FakeSender(8);
    const subscribe = harness.listeners.get(HostChannel.subscribeHostStatus);
    const unsubscribe = harness.listeners.get(HostChannel.unsubscribeHostStatus);
    subscribe?.({ sender });
    subscribe?.({ sender });
    unsubscribe?.({ sender });
    expect(harness.stops[1]).toBe(1);
    expect(harness.subscriptions).toHaveLength(1);

    harness.registration.releaseSender(sender.id);
    expect(harness.stops[0]).toBe(1);
    expect(harness.subscriptions).toHaveLength(0);
  });
});
