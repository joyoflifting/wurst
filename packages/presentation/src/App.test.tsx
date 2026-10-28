import {
  createInMemoryApplicationClient,
  createWorkspaceOverview,
  type ApplicationClient,
  type IntervalScheduler,
} from "@wurst/application";
import { cleanup, render, screen } from "@testing-library/react";
import { act } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";

afterEach(() => {
  cleanup();
});

function controllableScheduler(): IntervalScheduler & { tick: () => void; stops: number } {
  let onTick: (() => void) | null = null;
  return {
    stops: 0,
    start(callback) {
      onTick = callback;
      return () => {
        this.stops += 1;
        onTick = null;
      };
    },
    tick() {
      onTick?.();
    },
  };
}

describe("workspace presentation", () => {
  it("renders the fixture areas from the in-memory client and stops listening on unmount", async () => {
    const scheduler = controllableScheduler();
    const client = createInMemoryApplicationClient({
      scheduler,
      now: () => new Date("2026-10-28T17:00:00.000Z"),
    });
    const view = render(<App client={client} />);

    expect(await screen.findByRole("heading", { name: "Intent and planning" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Development and validation" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Deliverables" })).toBeTruthy();
    expect(screen.getByRole("note").textContent).toContain("Jira, agent execution, and live verification are not connected");
    expect(screen.getByText("Application bridge: in-memory client")).toBeTruthy();

    act(() => {
      scheduler.tick();
    });
    expect(screen.getByText("Host status fixture: sequence 1")).toBeTruthy();

    view.unmount();
    expect(scheduler.stops).toBe(1);
  });

  it("labels the Electron bridge and unsubscribes when the view is removed", async () => {
    let unsubscribed = false;
    const client: ApplicationClient = {
      getWorkspaceOverview: async () => createWorkspaceOverview("electron"),
      subscribeHostStatus: () => () => {
        unsubscribed = true;
      },
    };

    const view = render(<App client={client} />);
    expect(await screen.findByText("Application bridge: Electron preload bridge")).toBeTruthy();
    view.unmount();
    expect(unsubscribed).toBe(true);
  });

  it("shows a query failure without rendering workspace areas", async () => {
    const client: ApplicationClient = {
      getWorkspaceOverview: async () => {
        throw new Error("Invalid workspace overview");
      },
      subscribeHostStatus: () => () => undefined,
    };

    render(<App client={client} />);
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Invalid workspace overview");
    expect(screen.queryByRole("heading", { name: "Deliverables" })).toBeNull();
  });
});
