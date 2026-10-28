import {
  createHostStatusSource,
  createIntervalScheduler,
  createWorkspaceOverview,
  parseWorkspaceOverview,
  type HostStatusEvent,
  type WorkspaceOverview,
} from "@wurst/application";

export interface HostRuntime {
  getWorkspaceOverview(): WorkspaceOverview;
  subscribe(listener: (event: HostStatusEvent) => void): () => void;
  stop(): void;
}

export function createHostRuntime(options?: {
  now?: () => Date;
  scheduler?: ReturnType<typeof createIntervalScheduler>;
  intervalMs?: number;
}): HostRuntime {
  const status = createHostStatusSource({
    now: options?.now ?? (() => new Date()),
    scheduler: options?.scheduler ?? createIntervalScheduler(),
    ...(options?.intervalMs === undefined ? {} : { intervalMs: options.intervalMs }),
  });

  return {
    getWorkspaceOverview() {
      return parseWorkspaceOverview(createWorkspaceOverview("electron"));
    },
    subscribe: status.subscribe,
    stop: status.stop,
  };
}
