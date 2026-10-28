import type { ApplicationClient } from "./contract";
import { createWorkspaceOverview, parseWorkspaceOverview } from "./messages";
import { createIntervalScheduler } from "./scheduler";
import { createHostStatusSource } from "./status-source";

export function createInMemoryApplicationClient(options?: {
  now?: () => Date;
  scheduler?: ReturnType<typeof createIntervalScheduler>;
  intervalMs?: number;
}): ApplicationClient {
  const status = createHostStatusSource({
    now: options?.now ?? (() => new Date()),
    scheduler: options?.scheduler ?? createIntervalScheduler(),
    ...(options?.intervalMs === undefined ? {} : { intervalMs: options.intervalMs }),
  });

  return {
    async getWorkspaceOverview() {
      return parseWorkspaceOverview(createWorkspaceOverview("memory"));
    },
    subscribeHostStatus(listener) {
      return status.subscribe(listener);
    },
  };
}
