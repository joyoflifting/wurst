import { describe, expect, it } from "vitest";
import { isAppNavigation } from "./navigation";

describe("renderer navigation policy", () => {
  it("allows only the dev server origin while a development server is in use", () => {
    const devServer = "http://127.0.0.1:5173";
    expect(isAppNavigation("http://127.0.0.1:5173/index.html", devServer)).toBe(true);
    expect(isAppNavigation("https://example.test", devServer)).toBe(false);
    expect(isAppNavigation("file:///tmp/renderer/index.html", devServer)).toBe(false);
  });

  it("allows only the packaged renderer document when no dev server is configured", () => {
    expect(isAppNavigation("file:///app/out/renderer/index.html", undefined)).toBe(true);
    expect(isAppNavigation("file:///app/out/renderer/other.html", undefined)).toBe(false);
    expect(isAppNavigation("https://example.test", undefined)).toBe(false);
    expect(isAppNavigation("not a url", undefined)).toBe(false);
  });
});
