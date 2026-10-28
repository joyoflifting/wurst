import { describe, expect, it } from "vitest";
import type { WurstBridge } from "../shared/bridge";
import { exposeWurstBridge, type PreloadIpc } from "./expose-bridge";

function createIpc(): PreloadIpc & {
  channels: string[];
  emit(payload: unknown): void;
  listeners: number;
} {
  const listeners = new Set<(event: unknown, payload: unknown) => void>();
  const channels: string[] = [];
  return {
    channels,
    listeners: 0,
    invoke(channel) {
      channels.push(channel);
      return Promise.resolve({ ok: true });
    },
    send(channel) {
      channels.push(channel);
    },
    on(channel, listener) {
      channels.push(channel);
      listeners.add(listener);
      this.listeners = listeners.size;
    },
    removeListener(channel, listener) {
      channels.push(channel);
      listeners.delete(listener);
      this.listeners = listeners.size;
    },
    emit(payload) {
      for (const listener of listeners) {
        listener({}, payload);
      }
    },
  };
}

describe("preload bridge", () => {
  it("refuses to expose an API when context isolation is off", () => {
    const exposed: string[] = [];
    expect(() =>
      exposeWurstBridge({
        contextIsolated: false,
        bridge: {
          exposeInMainWorld(key) {
            exposed.push(key);
          },
        },
        ipc: createIpc(),
      }),
    ).toThrow(/context isolation/);
    expect(exposed).toEqual([]);
  });

  it("exposes only the workspace query and a host-status subscription", async () => {
    const ipc = createIpc();
    const exposed: { api?: WurstBridge } = {};
    exposeWurstBridge({
      contextIsolated: true,
      bridge: {
        exposeInMainWorld(key, value) {
          expect(key).toBe("wurst");
          exposed.api = value as WurstBridge;
        },
      },
      ipc,
    });

    const api = exposed.api;
    if (!api) {
      throw new Error("preload did not expose the bridge");
    }
    expect(Object.keys(api)).toEqual(["getWorkspaceOverview", "subscribeHostStatus"]);
    await api.getWorkspaceOverview();
    const received: unknown[] = [];
    const unsubscribe = api.subscribeHostStatus((payload) => received.push(payload));
    ipc.emit({ sequence: 1 });
    unsubscribe?.();
    ipc.emit({ sequence: 2 });

    expect(received).toEqual([{ sequence: 1 }]);
    expect(ipc.listeners).toBe(0);
    expect(ipc.channels).toEqual([
      "wurst:get-workspace-overview",
      "wurst:host-status",
      "wurst:subscribe-host-status",
      "wurst:host-status",
      "wurst:unsubscribe-host-status",
    ]);
  });
});
