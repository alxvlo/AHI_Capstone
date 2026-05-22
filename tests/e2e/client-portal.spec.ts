/**
 * Client Portal E2E Smoke Tests
 *
 * Covers client portal flows not in client-dashboard.spec.ts:
 * agency sign-in page structure, auth redirect, and DPA-gated access UI.
 * Run against a live dev server: npm run test:e2e
 */

import { test, expect, type Page } from "@playwright/test";

async function goToClientPortal(page: Page): Promise<void> {
  await page.goto("/dashboard/client");
  await expect(page).toHaveURL(/\/dashboard\/client/, { timeout: 15_000 });
}

test.describe("Client portal — agency sign-in page", () => {
  test("agency sign-in renders email, password fields and Sign In button", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: undefined });
    const page = await ctx.newPage();
    await page.goto("/auth/agency/sign-in");
    await expect(page).toHaveURL(/\/auth\/agency\/sign-in/, { timeout: 10_000 });
    await expect(page.getByLabel(/email/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByLabel(/password/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible({ timeout: 10_000 });
    await ctx.close();
  });
});

test.describe("Client portal — auth redirect", () => {
  test("unauthenticated /dashboard/client redirects to an auth page", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: undefined });
    const page = await ctx.newPage();
    await page.goto("/dashboard/client");
    await expect(page).toHaveURL(/\/auth\//, { timeout: 15_000 });
    await ctx.close();
  });
});

test.describe("Client portal — DPA-gated case access", () => {
  test("portal loads and shows DPA Gate metric or related text", async ({ page }) => {
    await goToClientPortal(page);
    const dpaVisible = await page.getByText(/dpa/i).first().isVisible({ timeout: 10_000 }).catch(() => false);
    const privacyVisible = await page.getByText(/privacy/i).first().isVisible({ timeout: 10_000 }).catch(() => false);
    const waiverVisible = await page.getByText(/waiver/i).first().isVisible({ timeout: 10_000 }).catch(() => false);
    expect(dpaVisible || privacyVisible || waiverVisible).toBe(true);
  });

  test("portal shows Selected Case section or company access restriction notice", async ({ page }) => {
    await goToClientPortal(page);
    const selectedCaseVisible = await page.getByRole("heading", { name: /selected case/i }).isVisible({ timeout: 10_000 }).catch(() => false);
    const restrictionVisible = await page.getByText(/company access/i).isVisible({ timeout: 10_000 }).catch(() => false);
    expect(selectedCaseVisible || restrictionVisible).toBe(true);
  });
});
