/**
 * Client/Agency Portal E2E Smoke Tests
 *
 * Validates the agency sign-in flow and DPA-gated access to the client portal.
 * Tests confirm sign-in page structure, auth guard, DPA gate messaging, and case access restrictions.
 * Run against a live dev server: npm run test:e2e
 */

import { test, expect, type Page } from "@playwright/test";

async function goToClientPortal(page: Page): Promise<void> {
  await page.goto("/dashboard/client");
  await expect(page).toHaveURL(/\/dashboard\/client/, { timeout: 15_000 });
}

// ---------------------------------------------------------------------------
// Group: Agency sign-in page
// ---------------------------------------------------------------------------

test.describe("Client portal — agency sign-in page", () => {
  test("sign-in page renders correctly", async ({ page }) => {
    await page.goto("/auth/agency/sign-in");
    await expect(page).toHaveURL(/\/auth\/agency\/sign-in/, { timeout: 15_000 });
    
    // Verify Email label is visible
    await expect(page.getByLabel(/email/i)).toBeVisible({ timeout: 10_000 });
    
    // Verify Password label is visible
    await expect(page.getByLabel(/password/i)).toBeVisible({ timeout: 10_000 });
    
    // Verify Sign In button is present
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible({ timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// Group: Auth guard
// ---------------------------------------------------------------------------

test.describe("Client portal — auth guard", () => {
  test("unauthenticated request to /dashboard/client redirects to sign-in", async ({
    browser,
  }) => {
    const ctx = await browser.newContext({ storageState: undefined });
    const page = await ctx.newPage();
    await page.goto("/dashboard/client");
    await expect(page).toHaveURL(/\/auth\//, { timeout: 15_000 });
    await ctx.close();
  });
});

// ---------------------------------------------------------------------------
// Group: DPA gate and case access
// ---------------------------------------------------------------------------

test.describe("Client portal — DPA gate and case access", () => {
  test("shows DPA gate information", async ({ page }) => {
    await goToClientPortal(page);
    // Verify DPA/Data Privacy/waiver-related text is visible
    await expect(
      page.getByText(/dpa|data privacy|waiver/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  test("shows company case access section", async ({ page }) => {
    await goToClientPortal(page);
    // Verify Selected Case section or company access restriction notice is visible
    const selectedCaseHeading = page.getByRole("heading", { name: /selected case/i });
    const accessRestrictionText = page.getByText(/company access/i);
    
    // At least one should be visible
    const isSelectedCaseVisible = await selectedCaseHeading.isVisible().catch(() => false);
    const isAccessRestrictionVisible = await accessRestrictionText.isVisible().catch(() => false);
    
    expect(isSelectedCaseVisible || isAccessRestrictionVisible).toBe(true);
  });
});
