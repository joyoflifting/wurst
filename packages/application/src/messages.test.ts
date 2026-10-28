import { describe, expect, it } from "vitest";
import { ContractViolation } from "./contract";
import {
  createHostStatusEvent,
  createWorkspaceOverview,
  parseHostStatusEvent,
  parseWorkspaceOverview,
} from "./messages";

describe("application messages", () => {
  it("accepts the fixture overview from either bridge", () => {
    expect(parseWorkspaceOverview(createWorkspaceOverview("memory")).bridge).toBe("memory");
    expect(parseWorkspaceOverview(createWorkspaceOverview("electron")).areas.map((area) => area.id)).toEqual([
      "intent",
      "development",
      "deliverables",
    ]);
  });

  it("rejects an overview that is not the labeled fixture", () => {
    const overview = { ...createWorkspaceOverview("memory"), disclaimer: "Connected to Jira" };
    expect(() => parseWorkspaceOverview(overview)).toThrow(ContractViolation);
  });

  it("rejects a tampered area and extra fields", () => {
    const overview = createWorkspaceOverview("electron");
    const tampered = {
      ...overview,
      areas: overview.areas.map((area, index) => (index === 0 ? { ...area, detail: "Agent is running" } : area)),
    };
    expect(() => parseWorkspaceOverview(tampered)).toThrow(ContractViolation);

    expect(() => parseWorkspaceOverview({ ...createWorkspaceOverview("memory"), command: "rm -rf" })).toThrow(
      ContractViolation,
    );
  });

  it("accepts a host status event and rejects malformed ones", () => {
    const event = createHostStatusEvent(2, new Date("2026-10-28T17:00:00.000Z"));
    expect(parseHostStatusEvent(event)).toEqual({
      fixture: true,
      sequence: 2,
      observedAt: "2026-10-28T17:00:00.000Z",
    });
    expect(() => parseHostStatusEvent({ ...event, sequence: 0 })).toThrow(ContractViolation);
    expect(() => parseHostStatusEvent({ fixture: true, sequence: 1 })).toThrow(ContractViolation);
  });
});
