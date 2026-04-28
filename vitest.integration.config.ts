import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Separate vitest config for integration tests that hit a real Supabase project.
 * Run with: node --env-file=.env.local ./node_modules/vitest/vitest.mjs run --config vitest.integration.config.ts
 * Or via npm script: npm run test:integration
 *
 * Requires environment variables from .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY  (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
 *   SUPABASE_SERVICE_ROLE_KEY
 *   AHI_PROBE_PASSWORD
 *
 * NEVER run against the production Supabase project.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": __dirname,
    },
  },
  test: {
    // Use node environment — integration tests make real network calls and don't need jsdom.
    environment: "node",
    // No jsdom/jest-dom setup needed.
    setupFiles: [],
    include: ["tests/integration/**/*.{test,spec}.{ts,mts}"],
    exclude: ["**/node_modules/**", ".next/**"],
    // Integration tests can be slow; increase timeout globally.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    reporters: ["verbose"],
    // Run integration tests sequentially — they share database state.
    sequence: {
      concurrent: false,
    },
  },
});
