import { expect, test, type Page } from "@playwright/test";

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value)
    throw new Error(`${name} is required for the live Payout browser test.`);
  return value;
}

async function signIn(page: Page) {
  await page.goto("/login");
  await page
    .getByLabel("University email")
    .fill(requiredEnvironment("LIVE_ADMIN_EMAIL"));
  await page
    .getByLabel("Password")
    .fill(requiredEnvironment("LIVE_ADMIN_PASSWORD"));
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/overview$/);
}

test("renders a Payout from the live Admin API", async ({ page }) => {
  await signIn(page);
  await page.goto("/payout");

  await expect(
    page.getByRole("heading", { level: 1, name: "Payouts" }),
  ).toBeVisible();
  const payoutLink = page
    .getByRole("link", { name: /Open Payout [0-9a-f-]{36}/i })
    .first();
  await expect(payoutLink).toBeVisible();

  const detailHref = await payoutLink.getAttribute("href");
  expect(detailHref).toMatch(/^\/payout\/[0-9a-f-]{36}$/i);
  expect(detailHref).not.toBe("/payout/PAY-9637");
  const payoutId = detailHref!.split("/").at(-1)!;

  await payoutLink.click();
  await expect(page).toHaveURL(new RegExp(`/payout/${payoutId}$`));
  const drawer = page.getByRole("dialog", { name: payoutId });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText("Payout amounts")).toBeVisible();
  await expect(
    drawer.getByRole("link", { name: "Full Payout detail" }),
  ).toBeVisible();

  await drawer.getByRole("link", { name: "Full Payout detail" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: payoutId }),
  ).toBeVisible();
  await expect(page.getByRole("dialog", { name: payoutId })).toHaveCount(0);
});
