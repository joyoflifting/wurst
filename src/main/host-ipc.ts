import type { HostStatusEvent, WorkspaceOverview } from "@wurst/application";
import { HostChannel } from "../shared/channels";
import type { HostRuntime } from "./host-runtime";

export class UnexpectedHostPayloadError extends Error {
  constructor() {
    super("Unexpected IPC payload");
    this.name = "UnexpectedHostPayloadError";
  }
}

export interface IpcSender {
  id: number;
  isDestroyed(): boolean;
  send(channel: string, payload: unknown): void;
  onDestroyed(listener: () => void): void;
}

export interface HostIpc {
  handle(channel: string, listener: (event: { sender: IpcSender }, ...args: unknown[]) => unknown): void;
  on(channel: string, listener: (event: { sender: IpcSender }, ...args: unknown[]) => void): void;
}

export interface HostIpcRegistration {
  releaseSender(senderId: number): void;
}

export function registerHostIpc(ipc: HostIpc, runtime: HostRuntime): HostIpcRegistration {
  const subscriptions = new Map<number, Array<() => void>>();

  const releaseSender = (senderId: number): void => {
    const stops = subscriptions.get(senderId);
    if (!stops) {
      return;
    }
    subscriptions.delete(senderId);
    for (const stop of stops) {
      stop();
    }
  };

  ipc.handle(HostChannel.getWorkspaceOverview, (_event, ...args): WorkspaceOverview => {
    if (args.length > 0) {
      throw new UnexpectedHostPayloadError();
    }
    return runtime.getWorkspaceOverview();
  });

  ipc.on(HostChannel.subscribeHostStatus, (event, ...args) => {
    if (args.length > 0) {
      return;
    }
    const { sender } = event;
    const stop = runtime.subscribe((statusEvent: HostStatusEvent) => {
      if (sender.isDestroyed()) {
        return;
      }
      sender.send(HostChannel.hostStatus, statusEvent);
    });
    const existing = subscriptions.get(sender.id);
    if (existing) {
      existing.push(stop);
      return;
    }
    subscriptions.set(sender.id, [stop]);
    sender.onDestroyed(() => releaseSender(sender.id));
  });

  ipc.on(HostChannel.unsubscribeHostStatus, (event, ...args) => {
    if (args.length > 0) {
      return;
    }
    const stack = subscriptions.get(event.sender.id);
    const stop = stack?.pop();
    stop?.();
    if (stack && stack.length === 0) {
      subscriptions.delete(event.sender.id);
    }
  });

  return { releaseSender };
}
