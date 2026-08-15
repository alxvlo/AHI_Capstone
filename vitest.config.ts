import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": import.meta.dirname,
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup/vitest.setup.ts"],
    include: [
      "tests/**/*.{test,spec}.{ts,tsx}",
      "app/**/*.{test,spec}.{ts,tsx}",
      "components/**/*.{test,spec}.{ts,tsx}",
      "lib/**/*.{test,spec}.{ts,tsx}",
    ],
    exclude: [
      ".next/**",
      "coverage/**",
      "**/node_modules/**",
      "tests/e2e/**",
      "tests/integration/**",
    ],
    reporters: process.env.CI ? ["default"] : ["dot"],
    environmentOptions: {
      jsdom: {
        url: "http://localhost:3000",
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "./coverage",
      include: [
        "lib/phone.ts",
        "lib/government-id.ts",
        "lib/supabase/roles.ts",
        "lib/supabase/middleware.ts",
        "lib/dashboard/case-progress.ts",
        "features/dashboard/staff/shared.tsx",
        "components/providers/auth-provider.tsx",
      ],
      thresholds: {
        statements: 65,
        branches: 60,
        functions: 63,
        lines: 65,
      },
    },
  },
});
