/**
 * Patient Sign-Up Form Validation E2E Tests
 *
 * Tests client-side form validation on /auth/patient/sign-up.
 * No auth required — all validation fires before any network call.
 * Run against a live dev server: npm run test:e2e
 */

import { test, expect, type Page } from "@playwright/test";

const SIGN_UP_URL = "/auth/patient/sign-up";

async function fillRequiredFields(page: Page) {
  await page.getByLabel(/full name/i).fill("Test User");
  await page.locator("#dateOfBirth").fill("1990-01-01");
  await page.locator("#sex").selectOption("Male");
  await page.getByLabel(/email address/i).fill("test@example.com");
  await page.locator("#contactNumber").fill("+63 912 345 6789");
  await page.locator("#governmentIdType").selectOption({ index: 1 });
  await page.locator("#governmentId").fill("A1234567");
}

test.describe("Patient sign-up — page structure", () => {
  test("page loads with Create Patient Account heading and Create Account button", async ({ page }) => {
    await page.goto(SIGN_UP_URL);
    await expect(page).toHaveURL(/sign-up/, { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: /create patient account/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: /create account/i })).toBeVisible({ timeout: 10_000 });
  });

  test("sign-in link is present on the sign-up page", async ({ page }) => {
    await page.goto(SIGN_UP_URL);
    await expect(page.getByRole("link", { name: /sign in/i })).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Patient sign-up — form validation", () => {
  test("empty form submit shows required-fields toast", async ({ page }) => {
    await page.goto(SIGN_UP_URL);
    await expect(page).toHaveURL(/sign-up/, { timeout: 10_000 });
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page.getByText(/please fill in all required fields/i)).toBeVisible({ timeout: 5_000 });
  });

  test("mismatched passwords show Passwords do not match toast", async ({ page }) => {
    await page.goto(SIGN_UP_URL);
    await expect(page).toHaveURL(/sign-up/, { timeout: 10_000 });
    await fillRequiredFields(page);
    await page.locator("#password").fill("Password1!");
    await page.locator("#confirmPassword").fill("Password2!");
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page.getByText(/passwords do not match/i)).toBeVisible({ timeout: 5_000 });
  });

  test("short password shows minimum-length toast", async ({ page }) => {
    await page.goto(SIGN_UP_URL);
    await expect(page).toHaveURL(/sign-up/, { timeout: 10_000 });
    await fillRequiredFields(page);
    await page.locator("#password").fill("abc12");
    await page.locator("#confirmPassword").fill("abc12");
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page.getByText(/at least 8 characters/i)).toBeVisible({ timeout: 5_000 });
  });
});
