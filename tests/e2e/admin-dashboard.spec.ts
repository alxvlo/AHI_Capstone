/**
 * Admin Dashboard E2E Smoke Tests
 *
 * Validates the system admin portal using the probe.admin probe account.
 * Tests confirm page load, overview metrics, tab navigation, and role guard.
 * Run against a live dev server: npm run test:e2e
 */

import { test, expect, type Page } from "@playwright/test";

async function goToAdminDashboard(page: Page): Promise<void> {
  await page.goto("/dashboard/admin");
  await expect(page).toHaveURL(/\/dashboard\/admin/, { timeout: 15_000 });
}

// ---------------------------------------------------------------------------
// Group: Page structure
// ---------------------------------------------------------------------------

test.describe("Admin dashboard — page structure", () => {
  test("loads and shows System Admin Dashboard heading", async ({ page }) => {
    await goToAdminDashboard(page);
    await expect(
      page.getByRole("heading", { name: /system admin dashboard/i })
    ).toBeVisible({ timeout: 15_000 });
  });

  test("renders overview metric cards", async ({ page }) => {
    await goToAdminDashboard(page);
    // Overview tab is active by default — metric cards should be present
    const cards = page.locator("[class*='metric'], [class*='card']");
    await expect(cards.first()).toBeVisible({ timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// Group: Tab navigation
// ---------------------------------------------------------------------------

test.describe("Admin dashboard — tab navigation", () => {
  test("Users tab link is present", async ({ page }) => {
    await goToAdminDashboard(page);
    await expect(page.getByRole("link", { name: /^users$/i })).toBeVisible();
  });

  test("Reference Data tab link is present", async ({ page }) => {
    await goToAdminDashboard(page);
    await expect(page.getByRole("link", { name: /reference data/i })).toBeVisible();
  });

  test("Audit Logs tab link is present", async ({ page }) => {
    await goToAdminDashboard(page);
    await expect(page.getByRole("link", { name: /audit logs/i })).toBeVisible();
  });

  test("navigating to Users tab renders user management content", async ({ page }) => {
    await goToAdminDashboard(page);
    await page.getByRole("link", { name: /^users$/i }).click();
    await expect(page).toHaveURL(/tab=users/, { timeout: 10_000 });
    // User table or management heading should appear
    await expect(
      page.getByText(/user|account|role/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("navigating to Reference Data tab renders reference content", async ({ page }) => {
    await goToAdminDashboard(page);
    await page.getByRole("link", { name: /reference data/i }).click();
    await expect(page).toHaveURL(/tab=reference/, { timeout: 10_000 });
    await expect(
      page.getByText(/department|package|company/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("navigating to Audit Logs tab renders audit content", async ({ page }) => {
    await goToAdminDashboard(page);
    await page.getByRole("link", { name: /audit logs/i }).click();
    await expect(page).toHaveURL(/tab=audit/, { timeout: 10_000 });
    await expect(
      page.getByText(/audit|action|event/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// Group: Role guard
// ---------------------------------------------------------------------------

test.describe("Admin dashboard — auth guard", () => {
  test("unauthenticated request to /dashboard/admin redirects to sign-in", async ({
    browser,
  }) => {
    const ctx = await browser.newContext({ storageState: undefined });
    const page = await ctx.newPage();
    await page.goto("/dashboard/admin");
    await expect(page).toHaveURL(/\/auth\//, { timeout: 15_000 });
    await ctx.close();
  });
});
