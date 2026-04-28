/**
 * Client Representative Dashboard E2E Smoke Tests
 *
 * Validates the agency/client portal using the probe.client probe account.
 * Tests confirm page load, DPA gate metric, released-cases metric, and role guard.
 * Run against a live dev server: npm run test:e2e
 */

import { test, expect, type Page } from "@playwright/test";

async function goToClientDashboard(page: Page): Promise<void> {
  await page.goto("/dashboard/client");
  await expect(page).toHaveURL(/\/dashboard\/client/, { timeout: 15_000 });
}

// ---------------------------------------------------------------------------
// Group: Page structure
// ---------------------------------------------------------------------------

test.describe("Client portal — page structure", () => {
  test("loads and shows Client Representative Dashboard heading", async ({ page }) => {
    await goToClientDashboard(page);
    await expect(
      page.getByRole("heading", { name: /client representative dashboard/i })
    ).toBeVisible({ timeout: 15_000 });
  });

  test("shows role description text", async ({ page }) => {
    await goToClientDashboard(page);
    await expect(
      page.getByText(/search released company cases/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  test("renders DPA Gate metric card", async ({ page }) => {
    await goToClientDashboard(page);
    await expect(page.getByText(/dpa gate/i)).toBeVisible({ timeout: 10_000 });
  });

  test("renders Released Cases metric card", async ({ page }) => {
    await goToClientDashboard(page);
    await expect(page.getByText(/released cases/i)).toBeVisible({ timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// Group: DPA and case access
// ---------------------------------------------------------------------------

test.describe("Client portal — DPA and case access", () => {
  test("Selected Case section is present", async ({ page }) => {
    await goToClientDashboard(page);
    await expect(page.getByRole("heading", { name: /selected case/i })).toBeVisible();
  });

  test("company access restriction notice is visible", async ({ page }) => {
    await goToClientDashboard(page);
    await expect(
      page.getByText(/company access is restricted/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  test("Refresh quick action link is present", async ({ page }) => {
    await goToClientDashboard(page);
    await expect(page.getByRole("link", { name: /refresh/i })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Group: Role guard
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
