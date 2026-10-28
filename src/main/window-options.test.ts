import { describe, expect, it } from "vitest";
import { createMainWindowOptions } from "./window-options";

describe("browser window security", () => {
  it("keeps the renderer sandboxed and isolated from Node", () => {
    const options = createMainWindowOptions("/app/preload/index.js");
    expect(options.show).toBe(false);
    expect(options.webPreferences).toEqual({
      preload: "/app/preload/index.js",
      contextIsolation: true,
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      sandbox: true,
      webSecurity: true,
    });
  });
});
