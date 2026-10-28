export const FIXTURE_DISCLAIMER =
  "Fixture content. Jira, agent execution, and live verification are not connected.";

export const HOST_STATUS_INTERVAL_MS = 1000;

export type ApplicationBridge = "memory" | "electron";

export interface WorkspaceArea {
  readonly id: "intent" | "development" | "deliverables";
  readonly title: string;
  readonly detail: string;
}

export const WORKSPACE_AREAS = [
  {
    id: "intent",
    title: "Intent and planning",
    detail: "Placeholder for scope and alignment. No planning system is connected.",
  },
  {
    id: "development",
    title: "Development and validation",
    detail: "Placeholder for implementation and checks. No agents are running.",
  },
  {
    id: "deliverables",
    title: "Deliverables",
    detail: "Placeholder for shippable outputs. Nothing is produced from this view.",
  },
] as const satisfies readonly WorkspaceArea[];

export interface WorkspaceOverview {
  readonly fixture: true;
  readonly disclaimer: typeof FIXTURE_DISCLAIMER;
  readonly bridge: ApplicationBridge;
  readonly areas: readonly [
    (typeof WORKSPACE_AREAS)[0],
    (typeof WORKSPACE_AREAS)[1],
    (typeof WORKSPACE_AREAS)[2],
  ];
}

export interface HostStatusEvent {
  readonly fixture: true;
  readonly sequence: number;
  readonly observedAt: string;
}

export interface ApplicationClient {
  getWorkspaceOverview(): Promise<WorkspaceOverview>;
  subscribeHostStatus(listener: (event: HostStatusEvent) => void): () => void;
}

export interface IntervalScheduler {
  start(onTick: () => void, intervalMs: number): () => void;
}

export class ContractViolation extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContractViolation";
  }
}
