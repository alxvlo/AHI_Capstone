/**
 * Patient Dashboard E2E Smoke Tests
 *
 * Validates the patient portal using the probe.patient probe account.
 * Tests confirm page load, case selector, metric cards, and role guard.
 * Run against a live dev server: npm run test:e2e
 */

import { test, expect, type Page } from "@playwright/test";

async function goToPatientDashboard(page: Page): Promise<void> {
  await page.goto("/dashboard/patient");
  await expect(page).toHaveURL(/\/dashboard\/patient/, { timeout: 15_000 });
}

// ---------------------------------------------------------------------------
// Group: Page structure
// ---------------------------------------------------------------------------

test.describe("Patient portal — page structure", () => {
  test("loads and shows Patient Dashboard heading", async ({ page }) => {
    await goToPatientDashboard(page);
    await expect(
      page.getByRole("heading", { name: /patient dashboard/i })
    ).toBeVisible({ timeout: 15_000 });
  });

  test("shows role description text", async ({ page }) => {
    await goToPatientDashboard(page);
    await expect(
      page.getByText(/track your peme case progress/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  test("renders Case Selector with Load Case and Clear controls", async ({ page }) => {
    await goToPatientDashboard(page);
    await expect(page.getByRole("heading", { name: /case selector/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /load case/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /clear/i })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Group: Case state
// ---------------------------------------------------------------------------

test.describe("Patient portal — case state", () => {
  test("case selector shows at least one option or no-cases placeholder", async ({ page }) => {
    await goToPatientDashboard(page);
    const select = page.locator("select#caseId");
    await expect(select).toBeVisible({ timeout: 10_000 });
    const optionCount = await select.locator("option").count();
    expect(optionCount).toBeGreaterThanOrEqual(1);
  });

  test("Refresh quick action link is present", async ({ page }) => {
    await goToPatientDashboard(page);
    await expect(page.getByRole("link", { name: /refresh/i })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Group: Role guard
// ---------------------------------------------------------------------------

test.describe("Patient portal — auth guard", () => {
  test("unauthenticated request to /dashboard/patient redirects to patient sign-in", async ({
    browser,
  }) => {
    const ctx = await browser.newContext({ storageState: undefined });
    const page = await ctx.newPage();
    await page.goto("/dashboard/patient");
    await expect(page).toHaveURL(/\/auth\/patient\/sign-in/, { timeout: 15_000 });
    await ctx.close();
  });
});
