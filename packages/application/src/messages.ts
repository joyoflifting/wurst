import {
  ContractViolation,
  FIXTURE_DISCLAIMER,
  WORKSPACE_AREAS,
  type ApplicationBridge,
  type HostStatusEvent,
  type WorkspaceOverview,
} from "./contract";

const OVERVIEW_KEYS = ["areas", "bridge", "disclaimer", "fixture"] as const;
const AREA_KEYS = ["detail", "id", "title"] as const;
const STATUS_KEYS = ["fixture", "observedAt", "sequence"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  return actual.length === keys.length && actual.every((key, index) => key === keys[index]);
}

export function createWorkspaceOverview(bridge: ApplicationBridge): WorkspaceOverview {
  return {
    fixture: true,
    disclaimer: FIXTURE_DISCLAIMER,
    bridge,
    areas: WORKSPACE_AREAS,
  };
}

export function parseWorkspaceOverview(value: unknown): WorkspaceOverview {
  if (!isRecord(value) || !hasExactKeys(value, OVERVIEW_KEYS)) {
    throw new ContractViolation("Invalid workspace overview");
  }
  if (value.fixture !== true || value.disclaimer !== FIXTURE_DISCLAIMER) {
    throw new ContractViolation("Workspace overview is not labeled fixture content");
  }
  if (value.bridge !== "memory" && value.bridge !== "electron") {
    throw new ContractViolation("Invalid application bridge");
  }
  if (!Array.isArray(value.areas) || value.areas.length !== WORKSPACE_AREAS.length) {
    throw new ContractViolation("Invalid workspace areas");
  }
  const areas: readonly unknown[] = value.areas;

  WORKSPACE_AREAS.forEach((expected, index) => {
    const area = areas[index];
    if (!isRecord(area) || !hasExactKeys(area, AREA_KEYS)) {
      throw new ContractViolation("Invalid workspace area");
    }
    if (area.id !== expected.id || area.title !== expected.title || area.detail !== expected.detail) {
      throw new ContractViolation("Workspace area does not match the fixture");
    }
  });

  return createWorkspaceOverview(value.bridge);
}

export function createHostStatusEvent(sequence: number, now: Date): HostStatusEvent {
  if (!Number.isSafeInteger(sequence) || sequence < 1) {
    throw new ContractViolation("Host status sequence must be a positive integer");
  }
  return {
    fixture: true,
    sequence,
    observedAt: now.toISOString(),
  };
}

export function parseHostStatusEvent(value: unknown): HostStatusEvent {
  if (!isRecord(value) || !hasExactKeys(value, STATUS_KEYS)) {
    throw new ContractViolation("Invalid host status event");
  }
  if (value.fixture !== true) {
    throw new ContractViolation("Host status event is not labeled fixture content");
  }
  if (typeof value.sequence !== "number" || !Number.isSafeInteger(value.sequence) || value.sequence < 1) {
    throw new ContractViolation("Invalid host status sequence");
  }
  if (typeof value.observedAt !== "string" || Number.isNaN(Date.parse(value.observedAt))) {
    throw new ContractViolation("Invalid host status time");
  }
  return {
    fixture: true,
    sequence: value.sequence,
    observedAt: value.observedAt,
  };
}
