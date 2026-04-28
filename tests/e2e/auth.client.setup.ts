import { test as setup, expect } from "@playwright/test";
import path from "path";

const CLIENT_AUTH_FILE = path.join(__dirname, ".auth/client.json");

const CLIENT_EMAIL = "probe.client.20260320@ahi.local";
const CLIENT_PASSWORD = process.env.AHI_PROBE_PASSWORD ?? "";

setup("authenticate as client rep probe user", async ({ page }) => {
  setup.setTimeout(60_000);

  if (!CLIENT_PASSWORD) {
    throw new Error("AHI_PROBE_PASSWORD is not set.");
  }

  await page.context().clearCookies();
  await page.goto("/auth/agency/sign-in");
  await expect(page).toHaveURL(/\/auth\/agency\/sign-in/, { timeout: 10_000 });

  await page.getByLabel(/email/i).pressSequentially(CLIENT_EMAIL);
  await page.getByLabel(/password/i).pressSequentially(CLIENT_PASSWORD);

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

  await page.waitForURL("**/dashboard/client**", { timeout: 30_000 });
  await expect(page).toHaveURL(/\/dashboard\/client/);

  await page.context().storageState({ path: CLIENT_AUTH_FILE });
});
