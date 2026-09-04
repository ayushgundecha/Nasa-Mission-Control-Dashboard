import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    exclude: [
      "tests/e2e/**",
      "**/node_modules/**",
      ".next/**",
      "client/**",
      "server/**",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.d.ts",
        "src/**/*.test.{ts,tsx}",
        "src/app/**",
        "src/test/**",
        "src/db/client.ts",
        "src/db/schema.ts",
        "src/components/shell/app-shell.tsx",
        "src/components/shell/navigation.tsx",
        "src/components/shell/phase-preview.tsx",
        "src/components/ui/**",
        "src/features/command/orbital-overview.tsx",
        // Browser-only spatial components are exercised through Playwright,
        // including WebGL failure/context-loss paths and accessible fallbacks.
        "src/features/environment/**/*.tsx",
        // The worker entry is verified through its typed protocol/controller.
        "src/features/orbit/propagation.worker.ts",
      ],
      thresholds: {
        statements: 70,
        branches: 65,
        functions: 70,
        lines: 70,
      },
    },
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
      "server-only": new URL("./src/test/server-only.ts", import.meta.url)
        .pathname,
    },
  },
});
