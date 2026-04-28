import { defineConfig, devices } from "@playwright/test";
import path from "path";

/**
 * Playwright configuration for SCRUM-52 — Staff Dashboard E2E tests.
 *
 * Prerequisites before running:
 *   1. npm run dev (or npm run build && npm run start) must be running on port 3000
 *   2. .env.local must contain AHI_PROBE_PASSWORD and valid Supabase credentials
 *   3. Probe accounts must be seeded (npm run probe:bootstrap)
 *
 * Run:
 *   npm run test:e2e           — headless Chromium
 *   npm run test:e2e:headed    — headed browser for debugging
 *   npm run test:e2e:ui        — Playwright UI mode
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false, // E2E tests share app state; run sequentially
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["html", { outputFolder: "playwright-report" }], ["list"]],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // Load .env.local env vars via the dotenv loader below
  },

  projects: [
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Each E2E test file that needs auth reuses the stored session.
        storageState: path.join(__dirname, "tests/e2e/.auth/staff.json"),
      },
      dependencies: ["setup"],
    },
  ],

  // Automatically start the dev server if not already running.
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      // Next.js reads .env.local automatically — no special handling needed here.
    },
  },
});
