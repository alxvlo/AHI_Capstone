import { test as setup, expect } from "@playwright/test";
import path from "path";

const DEPTSTAFF_AUTH_FILE = path.join(__dirname, ".auth/deptstaff.json");

const DEPTSTAFF_EMAIL = "probe.deptstaff.20260320@ahi.local";
const DEPTSTAFF_PASSWORD = process.env.AHI_PROBE_PASSWORD ?? "";

setup("authenticate as dept-staff probe user", async ({ page }) => {
  setup.setTimeout(60_000);

  if (!DEPTSTAFF_PASSWORD) {
    throw new Error("AHI_PROBE_PASSWORD is not set.");
  }

  await page.context().clearCookies();
  await page.goto("/auth/staff/sign-in");
  await expect(page).toHaveURL(/\/auth\/staff\/sign-in/, { timeout: 10_000 });

  await page.getByLabel(/email/i).pressSequentially(DEPTSTAFF_EMAIL);
  await page.getByLabel(/password/i).pressSequentially(DEPTSTAFF_PASSWORD);

  const supabaseAuthResponse = page.waitForResponse(
    (r) => r.url().includes("/auth/v1/token") && r.request().method() === "POST",
    { timeout: 30_000 }
  );

  await page.getByRole("button", { name: /sign in/i }).click();

  const authRes = await supabaseAuthResponse;
  if (!authRes.ok()) {
    const body = await authRes.text().catch(() => "<unreadable>");
    throw new Error(`Supabase sign-in returned HTTP ${authRes.status()} — Body: ${body}`);
  }

  await page.waitForURL("**/dashboard/staff**", { timeout: 30_000 });
  await expect(page).toHaveURL(/\/dashboard\/staff/);

  await page.context().storageState({ path: DEPTSTAFF_AUTH_FILE });
});
