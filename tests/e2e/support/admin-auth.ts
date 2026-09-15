import { expect, type Page } from "@playwright/test";

export type AdminSignInOptions = {
  email?: string;
  password?: string;
  expectEmailFocused?: boolean;
  expectLanguageOptions?: boolean;
  waitForNetworkIdle?: boolean;
};

export async function signIn(page: Page, options: AdminSignInOptions = {}): Promise<void> {
  await page.goto("/login");
  const email = page.getByLabel("University email");
  if (options.expectEmailFocused) await expect(email).toBeFocused();
  await email.fill(options.email ?? "admin@ku.th");
  await page.getByLabel("Password").fill(options.password ?? "password123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/overview$/);
  await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible();
  if (options.expectLanguageOptions) {
    await expect(page.getByRole("group", { name: "Language options" })).toBeVisible();
  }
  if (options.waitForNetworkIdle) await page.waitForLoadState("networkidle");
}
