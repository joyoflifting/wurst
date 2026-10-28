import { HostChannel } from "../shared/channels";
import type { WurstBridge } from "../shared/bridge";

export interface PreloadContextBridge {
  exposeInMainWorld(key: string, api: unknown): void;
}

export interface PreloadIpc {
  invoke(channel: string): Promise<unknown>;
  send(channel: string): void;
  on(channel: string, listener: (event: unknown, payload: unknown) => void): void;
  removeListener(channel: string, listener: (event: unknown, payload: unknown) => void): void;
}

export function exposeWurstBridge(options: {
  contextIsolated: boolean;
  bridge: PreloadContextBridge;
  ipc: PreloadIpc;
}): void {
  if (!options.contextIsolated) {
    throw new Error("WURST requires context isolation.");
  }

  const api: WurstBridge = {
    getWorkspaceOverview() {
      return options.ipc.invoke(HostChannel.getWorkspaceOverview);
    },
    subscribeHostStatus(listener) {
      const wrapped = (_event: unknown, payload: unknown): void => {
        listener(payload);
      };
      options.ipc.on(HostChannel.hostStatus, wrapped);
      options.ipc.send(HostChannel.subscribeHostStatus);
      return () => {
        options.ipc.removeListener(HostChannel.hostStatus, wrapped);
        options.ipc.send(HostChannel.unsubscribeHostStatus);
      };
    },
  };

  options.bridge.exposeInMainWorld("wurst", api);
}
