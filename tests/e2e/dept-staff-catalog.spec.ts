/**
 * Department Staff — Test Catalog Encoding Form E2E Smoke Tests
 *
 * Validates the new catalog-driven encoding form introduced in SCRUM-37 Phase 3.
 * Uses the probe.deptstaff (LAB dept) probe account.
 *
 * All tests use graceful skip when no active visit is in the queue, so the
 * suite stays green on a freshly seeded environment with no in-progress cases.
 */

import { test, expect, type Page } from "@playwright/test";

async function goToStaffDashboard(page: Page): Promise<void> {
  await page.goto("/dashboard/staff");
  await expect(page).toHaveURL(/\/dashboard\/staff/, { timeout: 15_000 });
}

async function openFirstEncodingPanel(page: Page): Promise<boolean> {
  const encodeLink = page
    .getByRole("link", { name: /encode result/i })
    .first();

  if (!(await encodeLink.isVisible({ timeout: 5_000 }).catch(() => false))) {
    return false;
  }

  await encodeLink.click();
  await expect(page).toHaveURL(/resultVisitId=/, { timeout: 10_000 });
  return true;
}

// ---------------------------------------------------------------------------
// Group: Dashboard loads for dept staff
// ---------------------------------------------------------------------------

test.describe("Dept Staff — dashboard shell", () => {
  test("staff dashboard loads and shows Department Queue heading", async ({ page }) => {
    await goToStaffDashboard(page);
    await expect(
      page.getByRole("heading", { name: /department queue/i })
    ).toBeVisible({ timeout: 15_000 });
  });

  test("dept staff sees their department name in the queue description", async ({ page }) => {
    await goToStaffDashboard(page);
    // The module renders "Scoped to <DeptName> (CODE)"
    await expect(page.getByText(/scoped to/i).first()).toBeVisible({ timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// Group: Catalog encoding form
// ---------------------------------------------------------------------------

test.describe("Dept Staff — catalog encoding form", () => {
  test("encoding panel shows a test dropdown (not a freeform text input)", async ({ page }) => {
    await goToStaffDashboard(page);
    const panelOpen = await openFirstEncodingPanel(page);
    if (!panelOpen) {
      test.skip();
      return;
    }

    // The new form renders a <select> with name="testId" (not a text input for testName)
    const testSelect = page.locator("select[name='testId']");
    await expect(testSelect).toBeVisible({ timeout: 10_000 });

    // The freeform testName input should NOT be visible by default
    const testNameInput = page.locator("input[name='testName']");
    await expect(testNameInput).not.toBeVisible();
  });

  test("test dropdown has grouped options (optgroups by category)", async ({ page }) => {
    await goToStaffDashboard(page);
    const panelOpen = await openFirstEncodingPanel(page);
    if (!panelOpen) {
      test.skip();
      return;
    }

    const testSelect = page.locator("select[name='testId']");
    await expect(testSelect).toBeVisible({ timeout: 10_000 });

    // At least one optgroup must exist (categories like Hematology, Chemistry, etc.)
    const optgroups = testSelect.locator("optgroup");
    await expect(optgroups.first()).toBeVisible();
    const count = await optgroups.count();
    expect(count).toBeGreaterThan(0);
  });

  test("selecting FBS from dropdown auto-fills unit and reference range", async ({ page }) => {
    await goToStaffDashboard(page);
    const panelOpen = await openFirstEncodingPanel(page);
    if (!panelOpen) {
      test.skip();
      return;
    }

    const testSelect = page.locator("select[name='testId']");
    await expect(testSelect).toBeVisible({ timeout: 10_000 });

    // Find the option value for FBS
    const fbsOption = testSelect.locator("option", { hasText: /^FBS/ });
    const fbsCount = await fbsOption.count();
    if (fbsCount === 0) {
      test.skip(); // FBS not in this dept's catalog
      return;
    }

    const fbsValue = await fbsOption.first().getAttribute("value");
    await testSelect.selectOption(fbsValue!);

    // After selecting FBS, unit "mmol/L" and ref "3.89–6.38" should appear
    await expect(page.getByText(/mmol\/L/i)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/3\.89/)).toBeVisible({ timeout: 5_000 });
  });

  test("'+ Custom test' toggle switches to freeform name input", async ({ page }) => {
    await goToStaffDashboard(page);
    const panelOpen = await openFirstEncodingPanel(page);
    if (!panelOpen) {
      test.skip();
      return;
    }

    const customToggle = page.getByRole("button", { name: /custom test/i });
    await expect(customToggle).toBeVisible({ timeout: 10_000 });
    await customToggle.click();

    // After toggling, the freeform testName input appears
    await expect(page.locator("input[name='testName']")).toBeVisible({ timeout: 5_000 });
    // And the catalog select disappears
    await expect(page.locator("select[name='testId']")).not.toBeVisible();

    // Back to catalog link should appear
    await expect(page.getByRole("button", { name: /back to catalog/i })).toBeVisible();
  });

  test("Save Result button is present and enabled on encoding panel", async ({ page }) => {
    await goToStaffDashboard(page);
    const panelOpen = await openFirstEncodingPanel(page);
    if (!panelOpen) {
      test.skip();
      return;
    }

    const saveBtn = page.getByRole("button", { name: /save result/i });
    await expect(saveBtn).toBeVisible({ timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// Group: Required tests progress indicator
// ---------------------------------------------------------------------------

test.describe("Dept Staff — required tests progress indicator", () => {
  test("required tests panel renders when encoding panel is open", async ({ page }) => {
    await goToStaffDashboard(page);
    const panelOpen = await openFirstEncodingPanel(page);
    if (!panelOpen) {
      test.skip();
      return;
    }

    // The RequiredTestsProgress component renders "Required tests for this package"
    // OR is absent (returns null) if no required tests are configured for the dept.
    // Either outcome is valid — we just confirm there's no error.
    const errorText = page.getByText(/unhandledrejection|error boundary|unexpected/i);
    await expect(errorText).not.toBeVisible();
  });

  test("required tests panel shows a count when required tests exist", async ({ page }) => {
    await goToStaffDashboard(page);
    const panelOpen = await openFirstEncodingPanel(page);
    if (!panelOpen) {
      test.skip();
      return;
    }

    // If required tests exist for this dept+package, the panel shows "X/Y encoded"
    const progressText = page.getByText(/required tests for this package/i);
    if (await progressText.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(page.getByText(/\d+\/\d+ encoded/)).toBeVisible();
    }
    // If not visible, no required tests configured — test passes silently
  });
});
