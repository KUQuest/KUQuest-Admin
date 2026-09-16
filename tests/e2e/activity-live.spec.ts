import { expect, test } from "@playwright/test";

import { signIn } from "./support/admin-auth";

const liveAdminEmail = process.env.LIVE_ADMIN_EMAIL;
const liveAdminPassword = process.env.LIVE_ADMIN_PASSWORD;
const liveAdminCredentials = {
  email: liveAdminEmail ?? "",
  password: liveAdminPassword ?? "",
};

test.skip(
  !liveAdminCredentials.email || !liveAdminCredentials.password,
  "Set LIVE_ADMIN_EMAIL and LIVE_ADMIN_PASSWORD to run the live Activity Log browser test.",
);

test("renders Activity Log data through the live Admin API", async ({ page }) => {
  const apiUrl = "http://localhost:5000/api/v1/admin/activity-log?limit=50&sort=newest";
  const noSessionResponse = await page.request.get(apiUrl);
  expect(noSessionResponse.status()).toBe(401);

  await signIn(page, liveAdminCredentials);

  const invalidSessionResponse = await page.request.get(apiUrl, {
    headers: { cookie: "kuquest-admin.session_token=invalid-session" },
  });
  expect(invalidSessionResponse.status()).toBe(401);

  const apiResponse = await page.request.get(apiUrl);
  expect(apiResponse.status()).toBe(200);
  const apiEnvelope = await apiResponse.json() as { success?: boolean; data?: { items?: unknown[] } };
  expect(apiEnvelope.success).toBe(true);
  expect(Array.isArray(apiEnvelope.data?.items)).toBe(true);
  const items = apiEnvelope.data?.items ?? [];
  expect(items.length).toBeGreaterThan(0);

  await page.goto("/activity");
  const main = page.locator("#activity-main");
  await expect(main.getByRole("heading", { level: 1, name: "Activity Log" })).toBeVisible();
  await expect(main.getByRole("heading", { name: "Activity Log unavailable" })).toHaveCount(0);
  await expect(main.locator("tbody tr").first()).toBeVisible();
  await expect(main.locator("tbody tr").first()).toContainText(/\S+/);
  await page.reload();
  await expect(main.getByRole("heading", { level: 1, name: "Activity Log" })).toBeVisible();
  await expect(main.locator("tbody tr").first()).toBeVisible();
  await expect(main.locator("tbody tr").first()).toContainText(/\S+/);
});
