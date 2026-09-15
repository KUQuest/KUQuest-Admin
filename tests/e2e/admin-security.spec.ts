import { expect, test, type BrowserContext } from "@playwright/test";

async function addAdminCookie(context: BrowserContext, value: string) {
  await context.addCookies([{
    name: "kuquest-admin.session_token",
    value,
    domain: "localhost",
    path: "/",
  }]);
}

test.describe("Admin session and private-route boundary", () => {
  test("redirects an Admin without a Session to login", async ({ page }) => {
    await page.goto("/wallet");

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Sign in to admin" })).toBeVisible();
  });

  test("redirects an invalid Admin Session to login", async ({ context, page }) => {
    await addAdminCookie(context, "invalid-session");
    await page.goto("/wallet");

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Sign in to admin" })).toBeVisible();
  });

  test("renders Forbidden for a disabled Admin", async ({ context, page }) => {
    await addAdminCookie(context, "disabled-session");
    await page.goto("/wallet");

    await expect(page).toHaveURL(/\/wallet$/);
    await expect(page.getByRole("heading", { name: "Forbidden" })).toBeVisible();
    await expect(page.getByText("This Admin account is disabled")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Wallets" })).toHaveCount(0);
  });

  test("keeps public assets available and private data protected", async ({ page }) => {
    const assetResponse = await page.request.get("/kuquest-logo.png");
    expect(assetResponse.status()).toBe(200);

    const privateResponse = await page.request.get("/wallet", { maxRedirects: 0 });
    expect(privateResponse.status()).toBe(307);
    expect(privateResponse.headers().location).toBe("/login");
    expect(await privateResponse.text()).not.toContain("Wallets");
  });
});
