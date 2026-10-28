import { parseHostStatusEvent, parseWorkspaceOverview, type ApplicationClient } from "@wurst/application";
import type { WurstBridge } from "../../shared/bridge";

export function createElectronApplicationClient(bridge: WurstBridge): ApplicationClient {
  const listeners = new Set<(event: ReturnType<typeof parseHostStatusEvent>) => void>();
  let unsubscribeBridge: (() => void) | null = null;

  return {
    async getWorkspaceOverview() {
      return parseWorkspaceOverview(await bridge.getWorkspaceOverview());
    },
    subscribeHostStatus(listener) {
      listeners.add(listener);
      if (!unsubscribeBridge) {
        unsubscribeBridge = bridge.subscribeHostStatus((payload) => {
          const event = parseHostStatusEvent(payload);
          for (const current of [...listeners]) {
            current(event);
          }
        });
      }

      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && unsubscribeBridge) {
          unsubscribeBridge();
          unsubscribeBridge = null;
        }
      };
    },
  };
}
