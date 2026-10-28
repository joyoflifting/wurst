import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ENGINEERING_POLICY_STATUS } from "@wurst/core";
import { createInMemoryApplicationClient } from "@wurst/application";

const root = process.cwd();

const specifierPatterns = [
  /\bfrom\s+["']([^"']+)["']/g,
  /\bimport\s+["']([^"']+)["']/g,
  /\bimport\(\s*["']([^"']+)["']\s*\)/g,
  /\brequire\(\s*["']([^"']+)["']\s*\)/g,
];

function walk(directory: string): string[] {
  const entries = readdirSync(directory);
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      files.push(...walk(path));
    } else if (/\.(ts|tsx|css|html)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      files.push(path);
    }
  }
  return files;
}

function specifiers(source: string): string[] {
  const found: string[] = [];
  for (const pattern of specifierPatterns) {
    pattern.lastIndex = 0;
    for (const match of source.matchAll(pattern)) {
      const specifier = match[1];
      if (specifier) {
        found.push(specifier);
      }
    }
  }
  return found;
}

function allowRenderer(specifier: string): boolean {
  return (
    specifier.startsWith(".") ||
    specifier === "react" ||
    specifier === "react-dom" ||
    specifier === "react-dom/client" ||
    specifier === "react/jsx-runtime" ||
    specifier === "react/jsx-dev-runtime" ||
    specifier === "@wurst/application" ||
    specifier === "@wurst/presentation"
  );
}

const zones: Array<{ dir: string; allow: (specifier: string) => boolean }> = [
  { dir: "packages/core/src", allow: (specifier) => specifier.startsWith(".") },
  { dir: "packages/application/src", allow: (specifier) => specifier.startsWith(".") },
  {
    dir: "packages/presentation/src",
    allow: (specifier) =>
      specifier.startsWith(".") ||
      specifier === "react" ||
      specifier === "react-dom" ||
      specifier === "react/jsx-runtime" ||
      specifier === "react/jsx-dev-runtime" ||
      specifier === "@wurst/application",
  },
  { dir: "src/shared", allow: (specifier) => specifier.startsWith(".") },
  { dir: "src/renderer", allow: allowRenderer },
  { dir: "src/preview", allow: allowRenderer },
  { dir: "src/preload", allow: (specifier) => specifier.startsWith(".") || specifier === "electron" },
  {
    dir: "src/main",
    allow: (specifier) =>
      specifier.startsWith(".") || specifier === "electron" || specifier === "node:path" || specifier === "@wurst/application",
  },
];

describe("module boundaries", () => {
  it("imports core and the in-memory client without Electron", async () => {
    expect(ENGINEERING_POLICY_STATUS).toBe("unspecified");
    const overview = await createInMemoryApplicationClient({
      scheduler: { start: () => () => undefined },
    }).getWorkspaceOverview();
    expect(overview.bridge).toBe("memory");
  });

  it("keeps package manifests free of forbidden infrastructure", () => {
    const core = JSON.parse(readFileSync(join(root, "packages/core/package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
      optionalDependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
    };
    const application = JSON.parse(readFileSync(join(root, "packages/application/package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
    };
    const presentation = JSON.parse(readFileSync(join(root, "packages/presentation/package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    expect(core.dependencies ?? {}).toEqual({});
    expect(core.optionalDependencies ?? {}).toEqual({});
    expect(core.peerDependencies ?? {}).toEqual({});
    expect(application.dependencies ?? {}).toEqual({});
    expect(Object.keys(presentation.dependencies ?? {}).sort()).toEqual([
      "@wurst/application",
      "react",
      "react-dom",
    ]);
    expect(presentation.devDependencies ?? {}).toEqual({});
  });

  it("allows only inward imports in each source zone", () => {
    const violations: string[] = [];
    for (const zone of zones) {
      const files = walk(join(root, zone.dir));
      expect(files.length, zone.dir).toBeGreaterThan(0);
      for (const file of files) {
        if (!file.endsWith(".ts") && !file.endsWith(".tsx")) {
          continue;
        }
        for (const specifier of specifiers(readFileSync(file, "utf8"))) {
          if (!zone.allow(specifier)) {
            violations.push(`${file.slice(root.length + 1)} imports ${specifier}`);
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("does not grant the renderer Node, shell, or a weakened sandbox", () => {
    const sourceFiles = ["packages", "src"].flatMap((dir) => walk(join(root, dir)));
    const violations: string[] = [];
    for (const file of sourceFiles) {
      if (!file.endsWith(".ts") && !file.endsWith(".tsx")) {
        continue;
      }
      const source = readFileSync(file, "utf8");
      const relative = file.slice(root.length + 1);
      if (/nodeIntegration:\s*true|sandbox:\s*false|contextIsolation:\s*false/.test(source)) {
        violations.push(`${relative} weakens renderer isolation`);
      }
      if (relative.startsWith("src/main/") && /import\s*\{[^}]*\bshell\b/.test(source)) {
        violations.push(`${relative} imports electron shell`);
      }
      if (
        (relative.startsWith("src/renderer/") || relative.startsWith("src/preview/") || relative.startsWith("packages/")) &&
        /\b(ipcRenderer|contextBridge|child_process)\b/.test(source)
      ) {
        violations.push(`${relative} references privileged APIs`);
      }
    }
    expect(violations).toEqual([]);
  });

  it("keeps local documents free of remote script and style URLs", () => {
    const documents = ["src/renderer", "src/preview", "packages/presentation/src"].flatMap((dir) =>
      walk(join(root, dir)).filter((file) => file.endsWith(".html") || file.endsWith(".css")),
    );
    expect(documents.length).toBeGreaterThan(0);
    for (const file of documents) {
      expect(readFileSync(file, "utf8")).not.toMatch(/https?:\/\//);
    }
  });
});
