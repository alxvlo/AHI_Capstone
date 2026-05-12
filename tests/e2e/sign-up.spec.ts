import { test, expect } from '@playwright/test';

test.describe('Patient Sign-Up Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/patient/sign-up');
  });

  test('Test 1: Page loads with "Create Patient Account" heading and "Create Account" button visible', async ({
    page,
  }) => {
    // Verify heading is visible
    const heading = page.getByRole('heading', { name: /Create Patient Account/i });
    await expect(heading).toBeVisible();

    // Verify Create Account button is visible
    const createButton = page.getByRole('button', { name: /Create Account/i });
    await expect(createButton).toBeVisible();
  });

  test('Test 2: Empty form submission displays toast "Please fill in all required fields"', async ({
    page,
  }) => {
    // Click Create Account button without filling form
    const createButton = page.getByRole('button', { name: /Create Account/i });
    await createButton.click();

    // Wait for and verify toast message
    const toast = page.getByText(/Please fill in all required fields/i);
    await expect(toast).toBeVisible({ timeout: 5000 });
  });

  test('Test 3: Mismatched passwords display toast "Passwords do not match"', async ({ page }) => {
    // Fill form with mismatched passwords
    await page.fill('input[name="fullName"]', 'John Doe');
    await page.fill('input[name="dateOfBirth"]', '1990-01-15');
    await page.fill('input[name="email"]', 'john@example.com');
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.fill('input[name="confirmPassword"]', 'SecurePass456!');
    await page.fill('input[name="contactNumber"]', '09123456789');
    await page.fill('input[name="governmentIdType"]', 'Passport');
    await page.fill('input[name="governmentIdNumber"]', 'AB123456');

    // Click Create Account button
    const createButton = page.getByRole('button', { name: /Create Account/i });
    await createButton.click();

    // Wait for and verify toast message
    const toast = page.getByText(/Passwords do not match/i);
    await expect(toast).toBeVisible({ timeout: 5000 });
  });

  test('Test 4: Password shorter than 8 characters displays toast "at least 8 characters"', async ({
    page,
  }) => {
    // Fill form with short password
    await page.fill('input[name="fullName"]', 'John Doe');
    await page.fill('input[name="dateOfBirth"]', '1990-01-15');
    await page.fill('input[name="email"]', 'john@example.com');
    await page.fill('input[name="password"]', 'Short1!');
    await page.fill('input[name="confirmPassword"]', 'Short1!');
    await page.fill('input[name="contactNumber"]', '09123456789');
    await page.fill('input[name="governmentIdType"]', 'Passport');
    await page.fill('input[name="governmentIdNumber"]', 'AB123456');

    // Click Create Account button
    const createButton = page.getByRole('button', { name: /Create Account/i });
    await createButton.click();

    // Wait for and verify toast message
    const toast = page.getByText(/at least 8 characters/i);
    await expect(toast).toBeVisible({ timeout: 5000 });
  });

  test('Test 5: Sign-in link is present and visible', async ({ page }) => {
    // Verify sign-in link is visible
    const signInLink = page.getByRole('link', { name: /Sign in/i });
    await expect(signInLink).toBeVisible();
  });
});
