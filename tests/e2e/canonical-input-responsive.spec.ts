import { expect, test, type Locator, type Page } from "@playwright/test";

import { signIn } from "./support/admin-auth";

const mobileViewport = { width: 390, height: 844 };

async function expectResponsiveInput(page: Page, input: Locator) {
  await expect(input).toBeVisible();
  const box = await input.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(-1);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width + 1);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
}

test.describe("canonical route inputs and responsive layouts", () => {
  test.use({ viewport: mobileViewport, isMobile: true, hasTouch: true });

  test("login email and password fields accept input on mobile", async ({ page }) => {
    await page.goto("/login");

    const email = page.getByLabel("University email");
    const password = page.getByLabel("Password");
    await email.fill("admin@ku.th");
    await password.fill("password123");
    await expect(email).toHaveValue("admin@ku.th");
    await expect(password).toHaveValue("password123");
    await expectResponsiveInput(page, email);
    await expectResponsiveInput(page, password);
  });

  for (const board of [
    { path: "/quest", name: "Quest", input: "Search Quests…", value: "QST-OPEN" },
    { path: "/dispute", name: "Dispute Case", input: "Search Dispute Cases", value: "DSP-5201" },
    { path: "/report", name: "Report Case", input: "Search Report Cases", value: "RPT-8201" },
    { path: "/conduct-report", name: "Conduct Report", input: "Search Conduct Reports", value: "CR-7001" },
    { path: "/payout", name: "Payout", input: "Search Payouts…", value: "PAY-9637" },
    { path: "/member", name: "Member", input: "Search users", value: "68000000" },
    { path: "/wallet", name: "Wallet", input: "Search Wallets…", value: "WAL-1001" },
  ]) {
    test(`${board.name} search accepts input on mobile`, async ({ page }) => {
      await signIn(page);
      await page.goto(board.path);

      const search = board.input.endsWith("…")
        ? page.getByPlaceholder(board.input)
        : page.getByRole("searchbox", { name: board.input });
      await search.fill(board.value);
      await expect(search).toHaveValue(board.value);
      await expectResponsiveInput(page, search);
    });
  }
});
