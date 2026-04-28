import { test as setup, expect } from "@playwright/test";
import path from "path";

const PATIENT_AUTH_FILE = path.join(__dirname, ".auth/patient.json");

const PATIENT_EMAIL = "probe.patient.20260320@ahi.local";
const PATIENT_PASSWORD = process.env.AHI_PROBE_PASSWORD ?? "";

setup("authenticate as patient probe user", async ({ page }) => {
  setup.setTimeout(60_000);

  if (!PATIENT_PASSWORD) {
    throw new Error("AHI_PROBE_PASSWORD is not set.");
  }

  await page.context().clearCookies();
  await page.goto("/auth/patient/sign-in");
  await expect(page).toHaveURL(/\/auth\/patient\/sign-in/, { timeout: 10_000 });

  await page.getByLabel(/email/i).pressSequentially(PATIENT_EMAIL);
  await page.getByLabel(/password/i).pressSequentially(PATIENT_PASSWORD);

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

  await page.waitForURL("**/dashboard/patient**", { timeout: 30_000 });
  await expect(page).toHaveURL(/\/dashboard\/patient/);

  await page.context().storageState({ path: PATIENT_AUTH_FILE });
});
