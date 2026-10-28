import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "electron-vite";

const applicationEntry = resolve("packages/application/src/index.ts");
const presentationEntry = resolve("packages/presentation/src/index.ts");

// electron-vite 6's built-in target table stops at Electron 44 and otherwise
// falls back to an obsolete Node/Chrome pair. These match Electron 45.1.0.
const nodeTarget = "node24.22";
const chromeTarget = "chrome156";

export default defineConfig({
  main: {
    resolve: {
      alias: {
        "@wurst/application": applicationEntry,
      },
    },
    build: {
      target: nodeTarget,
    },
  },
  preload: {
    build: {
      target: nodeTarget,
    },
  },
  renderer: {
    resolve: {
      alias: {
        "@wurst/application": applicationEntry,
        "@wurst/presentation": presentationEntry,
      },
    },
    plugins: [react()],
    server: {
      fs: {
        allow: [resolve(".")],
      },
    },
    build: {
      target: chromeTarget,
    },
  },
});
