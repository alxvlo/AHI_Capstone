/**
 * Playwright global auth setup — SCRUM-52
 *
 * Signs in as the Reception probe account and saves the browser storage state
 * to tests/e2e/.auth/staff.json so other E2E tests can reuse the session
 * without re-authenticating.
 *
 * The setup project runs automatically before other Playwright projects
 * (see playwright.config.ts `dependencies: ["setup"]`).
 */

import { test as setup, expect } from "@playwright/test";
import path from "path";

const STAFF_AUTH_FILE = path.join(__dirname, ".auth/staff.json");

// Probe account used for the reception workflow walkthrough
const STAFF_EMAIL = "probe.reception.20260320@ahi.local";
const STAFF_PASSWORD = process.env.AHI_PROBE_PASSWORD ?? "";

setup("authenticate as reception probe user", async ({ page }) => {
  setup.setTimeout(60_000); // must exceed waitForURL timeout (45 s); default 30 s fires first otherwise

  if (!STAFF_PASSWORD) {
    throw new Error(
      "AHI_PROBE_PASSWORD is not set. Start the dev server with .env.local loaded."
    );
  }

  // Clear any cookies that might carry a stale Supabase session from a prior run.
  // Without this the middleware sees an existing user and redirects away from the
  // sign-in page before the form renders.
  await page.context().clearCookies();

  await page.goto("/auth/staff/sign-in");

  // Fail fast if the page redirected away (e.g. to /dashboard or a 404) instead of
  // rendering the sign-in form.  Better error message than a 60 s fill() timeout.
  await expect(page).toHaveURL(/\/auth\/staff\/sign-in/, { timeout: 10_000 });

  // pressSequentially fires keydown/keypress/input/keyup per character — more
  // reliable than fill() for React 19 controlled inputs, which may not pick up
  // fill()'s single synthetic InputEvent in all timing scenarios.
  await page.getByLabel(/email/i).pressSequentially(STAFF_EMAIL);
  await page.getByLabel(/password/i).pressSequentially(STAFF_PASSWORD);

  // Intercept the Supabase auth API call so we get the real error immediately
  // if credentials are wrong, rather than waiting out the full 45 s timeout.
  const supabaseAuthResponse = page.waitForResponse(
    (r) =>
      r.url().includes("/auth/v1/token") && r.request().method() === "POST",
    { timeout: 30_000 }
  );

  await page.getByRole("button", { name: /sign in/i }).click();

  const authRes = await supabaseAuthResponse;
  if (!authRes.ok()) {
    const body = await authRes.text().catch(() => "<unreadable>");
    throw new Error(
      `Supabase sign-in returned HTTP ${authRes.status()} — check probe credentials. Body: ${body}`
    );
  }

  // Wait for the Supabase auth round-trip + Next.js route compile on cold start.
  await page.waitForURL("**/dashboard/staff**", { timeout: 30_000 });
  await expect(page).toHaveURL(/\/dashboard\/staff/);

  // Persist authentication state
  await page.context().storageState({ path: STAFF_AUTH_FILE });
});
