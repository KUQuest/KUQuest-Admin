import { expect, test, type Page } from "@playwright/test";

const canonicalRoutes = [
  { path: "/overview", activeHref: "/overview" },
  { path: "/quest", activeHref: "/quest" },
  { path: "/dispute", activeHref: "/dispute" },
  { path: "/report", activeHref: "/report" },
  { path: "/conduct-report", activeHref: "/conduct-report" },
  { path: "/payout", activeHref: "/payout" },
  { path: "/member", activeHref: "/member" },
  { path: "/wallet", activeHref: "/wallet" },
  { path: "/activity", activeHref: "/activity" },
  { path: "/quest/QST-12001", activeHref: "/quest" },
  { path: "/dispute/DSP-5201", activeHref: "/dispute" },
  { path: "/report/RPT-8201", activeHref: "/report" },
  { path: "/payout/PAY-9637", activeHref: "/payout" },
  { path: "/member/68000000", activeHref: "/member" },
] as const;

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("University email").fill("admin@ku.th");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/overview$/);
  await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible();
  await page.waitForLoadState("networkidle");
}

test.describe("shared Admin shell", () => {
  test("uses canonical links and keeps the board active on detail routes", async ({ page }) => {
    await signIn(page);

    const shell = page.locator(".admin-shell");
    const navigationLinks = shell.locator("aside a");
    const hrefs = await navigationLinks.evaluateAll((links) =>
      links.map((link) => link.getAttribute("href")),
    );
    expect(hrefs).toEqual([
      "/overview",
      "/quest",
      "/dispute",
      "/report",
      "/conduct-report",
      "/payout",
      "/member",
      "/wallet",
      "/activity",
    ]);
    expect(hrefs.some((href) => href?.includes("?view="))).toBe(false);
    await expect(shell.locator('a[href="/dispute"] .admin-nav-count')).toHaveText("2");
    await expect(shell.locator('a[href="/report"] .admin-nav-count')).toHaveText("2");
    await expect(shell.locator('a[href="/conduct-report"] .admin-nav-count')).toHaveText("0");
    await expect(shell.locator('a[href="/payout"] .admin-nav-count')).toHaveText("3");

    for (const route of canonicalRoutes) {
      await page.goto(route.path);
      await expect(shell).toBeVisible();
      await expect(
        shell.locator(`a[aria-current="page"][href="${route.activeHref}"]`),
      ).toBeVisible();
    }
  });

  test("keeps mobile navigation open and close behavior", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page);

    const navigation = page.locator("#site-navigation");
    const menu = page.getByRole("button", { name: "Open navigation" });
    await menu.click();
    await expect(navigation).toHaveClass(/open/);
    await expect(page.getByRole("button", { name: "Close navigation" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );

    await page.setViewportSize({ width: 1200, height: 844 });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(navigation).not.toHaveClass(/open/);
    await expect(page.getByRole("button", { name: "Open navigation" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );

    const reopenedMenu = page.getByRole("button", { name: "Open navigation" });
    await reopenedMenu.click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Open navigation" })).toBeFocused();

    await page.getByRole("button", { name: "Open navigation" }).click();
    await navigation.getByRole("link", { name: "Members" }).click();
    await expect(page).toHaveURL(/\/member$/);
    await expect(navigation).not.toHaveClass(/open/);
    await expect(page.getByRole("button", { name: "Open navigation" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    await expect(page.getByRole("button", { name: "Open navigation" })).toBeFocused();
  });

  test("keeps theme and language controls available in the shared shell", async ({ page }) => {
    await signIn(page);

    await page.getByRole("button", { name: /Theme Grey-white/ }).click();
    await page.getByRole("button", { name: /Dark Low-light workspace/ }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    const languageOptions = page.getByRole("group", { name: /Language options|ตัวเลือกภาษา/ });
    await languageOptions.getByRole("button", { name: "ไทย", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "th");
    await expect(page.getByRole("link", { name: "ภาพรวม", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "สมาชิก", exact: true })).toBeVisible();
    await expect(page.getByText("ระบบ", { exact: true })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "การนำทางหลัก" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "การนำทางระบบ" })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole("button", { name: "เปิดการนำทาง" })).toBeVisible();
    await page.getByRole("button", { name: "เปิดการนำทาง" }).click();
    await expect(page.getByRole("button", { name: "ปิดการนำทาง" })).toBeVisible();
    await expect(
      languageOptions.getByRole("button", { name: "ไทย", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  });

});
