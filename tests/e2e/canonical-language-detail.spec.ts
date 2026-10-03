import { expect, test, type Page } from "@playwright/test";

import { signIn } from "./support/admin-auth";

async function switchToThai(page: Page) {
  const languageOptions = page.getByRole("group", { name: /Language options|ตัวเลือกภาษา/ });
  const thaiButton = languageOptions.getByRole("button", { name: "ไทย", exact: true });
  await expect(thaiButton).toBeVisible();
  await expect(thaiButton).toBeEnabled();
  await thaiButton.click();
  await expect(thaiButton).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("html")).toHaveAttribute("lang", "th");
}

test.describe("Thai language on canonical routes", () => {
  test("translates the login screen", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "ไทย", exact: true }).click();

    await expect(page.getByRole("heading", { level: 1, name: "เข้าสู่ระบบผู้ดูแล" })).toBeVisible();
    await expect(page.getByLabel("อีเมลมหาวิทยาลัย")).toBeVisible();
  });

  test("translates a canonical board and full Member detail page", async ({ page }) => {
    await signIn(page, { expectLanguageOptions: true, waitForNetworkIdle: true });
    await switchToThai(page);

    await page.goto("/member");
    await expect(page.getByRole("heading", { level: 1, name: "สมาชิก" })).toBeVisible();
    await expect(page.getByRole("searchbox", { name: "ค้นหาสมาชิก" })).toBeVisible();

    await page.getByRole("button", { name: "เปิดสมาชิก 68000000" }).click();
    await page.getByRole("dialog", { name: "68000000" }).getByRole("link", { name: "ดูโปรไฟล์สมาชิกฉบับเต็ม" }).click();
    await expect(page).toHaveURL(/\/member\/68000000$/);
    await expect(page.getByRole("navigation", { name: "ส่วนรายละเอียดสมาชิก" })).toBeVisible();
    await expect(page.getByRole("link", { name: "รายการ Wallet", exact: true })).toBeVisible();
  });

  test("keeps translated detail controls on the canonical Report Case route", async ({ page }) => {
    await signIn(page, { expectLanguageOptions: true, waitForNetworkIdle: true });
    await switchToThai(page);
    await page.goto("/report/RPT-8201");

    await expect(page.getByText("คดีรายงานที่เปิดอยู่ — ต้องตรวจสอบ", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "ดูโปรไฟล์ Member", exact: true }).first()).toBeVisible();
  });

});
