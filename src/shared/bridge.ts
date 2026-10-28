export interface WurstBridge {
  getWorkspaceOverview(): Promise<unknown>;
  subscribeHostStatus(listener: (payload: unknown) => void): () => void;
}
