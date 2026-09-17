import { expect, test } from "@playwright/test";

import { signIn } from "./support/admin-auth";

test.describe("Conduct Report routes", () => {
  test("opens the full Conduct Report page from the drawer", async ({ page }) => {
    await signIn(page);
    await page.goto("/conduct-report");

    await page.locator('tbody tr[data-conduct-report-id="CND-8301"]').click();
    await expect(page.getByRole("dialog", { name: "Conduct Report details" })).toBeVisible();

    await page.getByRole("link", { name: "Open full Conduct Report" }).click();

    await expect(page).toHaveURL(/\/conduct-report\/CND-8301$/);
    await expect(page.locator("dialog.drawer.open")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1, name: "Abandoned work" })).toBeVisible();
  });
});
