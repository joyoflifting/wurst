import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: resolve("src/preview"),
  plugins: [react()],
  resolve: {
    alias: {
      "@wurst/application": resolve("packages/application/src/index.ts"),
      "@wurst/presentation": resolve("packages/presentation/src/index.ts"),
    },
  },
  server: {
    port: 5174,
    strictPort: true,
    fs: {
      allow: [resolve(".")],
    },
  },
});
