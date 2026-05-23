import { test as setup, expect } from "@playwright/test";
import path from "path";

const ADMIN_AUTH_FILE = path.join(__dirname, ".auth/admin.json");

const ADMIN_EMAIL = "probe.admin.20260320@ahi.local";
const ADMIN_PASSWORD = process.env.AHI_PROBE_PASSWORD ?? "";

setup("authenticate as admin probe user", async ({ page }) => {
  setup.setTimeout(60_000);

  if (!ADMIN_PASSWORD) {
    throw new Error("AHI_PROBE_PASSWORD is not set.");
  }

  await page.context().clearCookies();
  await page.goto("/auth/staff/sign-in");
  await expect(page).toHaveURL(/\/auth\/staff\/sign-in/, { timeout: 10_000 });

  await page.getByLabel("Staff Email", { exact: true }).fill(ADMIN_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(ADMIN_PASSWORD);

  const [authRes] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes("/auth/v1/token") && r.request().method() === "POST",
      { timeout: 30_000 },
    ),
    page.getByRole("button", { name: /sign in/i }).click(),
  ]);

  if (!authRes.ok()) {
    const body = await authRes.text().catch(() => "<unreadable>");
    throw new Error(`Supabase sign-in returned HTTP ${authRes.status()} — Body: ${body}`);
  }

  await page.waitForURL("**/dashboard/admin**", {
    timeout: 30_000,
    waitUntil: "commit",
  });
  await expect(page).toHaveURL(/\/dashboard\/admin/);

  await page.context().storageState({ path: ADMIN_AUTH_FILE });
});
