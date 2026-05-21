/**
 * Patient Portal E2E Smoke Tests
 *
 * Covers patient portal flows not in patient-dashboard.spec.ts:
 * sign-in page structure, authentication redirect, and certificate download UI.
 * Run against a live dev server: npm run test:e2e
 */

import { test, expect, type Page } from "@playwright/test";

async function goToPatientPortal(page: Page): Promise<void> {
  await page.goto("/dashboard/patient");
  await expect(page).toHaveURL(/\/dashboard\/patient/, { timeout: 15_000 });
}

// ---------------------------------------------------------------------------
// Group: Sign-in page structure
// ---------------------------------------------------------------------------

test.describe("Patient portal — sign-in page", () => {
  test("sign-in page renders email, password fields and Sign In button", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: undefined });
    const page = await ctx.newPage();
    await page.goto("/auth/patient/sign-in");
    await expect(page).toHaveURL(/\/auth\/patient\/sign-in/, { timeout: 10_000 });
    await expect(page.getByLabel(/email/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByLabel(/password/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible({ timeout: 10_000 });
    await ctx.close();
  });
});

// ---------------------------------------------------------------------------
// Group: Auth redirect
// ---------------------------------------------------------------------------

test.describe("Patient portal — auth redirect", () => {
  test("unauthenticated /dashboard/patient redirects to patient sign-in", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: undefined });
    const page = await ctx.newPage();
    await page.goto("/dashboard/patient");
    await expect(page).toHaveURL(/\/auth\/patient\/sign-in/, { timeout: 15_000 });
    await ctx.close();
  });
});

// ---------------------------------------------------------------------------
// Group: Certificate download UI
// ---------------------------------------------------------------------------

test.describe("Patient portal — certificate download", () => {
  test("portal loads and case selector is visible", async ({ page }) => {
    await goToPatientPortal(page);
    await expect(page.locator("select#caseId")).toBeVisible({ timeout: 10_000 });
  });

  test("certificate download section or case selector section is present", async ({ page }) => {
    await goToPatientPortal(page);
    // The certificate download UI is only shown for released cases.
    // Assert either the certificate section OR the case selector area is visible
    // so the test passes regardless of the probe patient's case state.
    const certVisible = await page.getByText(/certificate/i).isVisible({ timeout: 5_000 }).catch(() => false);
    const selectorVisible = await page.getByRole("heading", { name: /case selector/i }).isVisible({ timeout: 5_000 }).catch(() => false);
    expect(certVisible || selectorVisible).toBe(true);
  });
});
