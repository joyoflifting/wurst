import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@wurst/core": resolve("packages/core/src/index.ts"),
      "@wurst/application": resolve("packages/application/src/index.ts"),
      "@wurst/presentation": resolve("packages/presentation/src/index.ts"),
    },
  },
  test: {
    environment: "happy-dom",
    include: ["packages/**/*.test.ts", "packages/**/*.test.tsx", "src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
