import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page) {
  await page.goto("/login");
  const email = page.getByLabel("University email");
  await expect(email).toBeFocused();
  await email.fill("admin@ku.th");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Overview" }),
  ).toBeVisible();
}

async function switchToThai(page: Page) {
  const languageOptions = page.getByRole("group", {
    name: /Language options|ตัวเลือกภาษา/,
  });
  await languageOptions.getByRole("button", { name: "ไทย", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "th");
}

test.describe("Thai translation for full records and overlays", () => {
  test("translates quest full detail and pending-change content", async ({ page }) => {
    await signIn(page);
    await switchToThai(page);
    await page.goto("/quests/QST-12005");

    await expect(
      page.getByRole("heading", { name: "รายละเอียดงาน", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "การเปลี่ยนแปลงจากผู้ว่าจ้างที่รอดำเนินการ",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByText("Pending hirer changes", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Platform fee on completion", { exact: true })).toHaveCount(0);
  });

  test("translates dispute chat content inserted after Thai is active", async ({ page }) => {
    await signIn(page);
    await switchToThai(page);
    await page.goto("/disputes/DSP-5201");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.locator('[data-chat-role="hirer"]').click();

    const chat = page.getByRole("dialog", { name: "แชทกับผู้ว่าจ้าง" });
    await expect(chat).toBeVisible();
    await expect(chat.getByText("ส่งข้อความถึงผู้ว่าจ้าง", { exact: true })).toBeVisible();
    await expect(chat.getByText("แนบไฟล์", { exact: true })).toBeVisible();
    await expect(chat.getByText("Send message", { exact: true })).toHaveCount(0);
  });

  test("translates report decision and reporter chat content", async ({ page }) => {
    await signIn(page);
    await switchToThai(page);
    await page.goto("/reports/RPT-8201");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await expect(
      page.getByRole("heading", { name: "การตัดสินใจเกี่ยวกับรายงาน", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Temporary ban · 7 days", { exact: true })).toHaveCount(0);

    await page.locator('[data-report-chat-role="reporter"]').click();
    const chat = page.getByRole("dialog", { name: /แชทกับ/ });
    await expect(chat).toBeVisible();
    await expect(chat.getByText("ส่งข้อความถึง Mek Ariyawat", { exact: true })).toBeVisible();
    await expect(chat.getByText("Attach file", { exact: true })).toHaveCount(0);
  });

  test("translates report drawer action links", async ({ page }) => {
    await signIn(page);
    await switchToThai(page);
    await page.goto("/?view=reports");

    const reportButton = page.locator('button[data-open="reports:0"]');
    await expect(reportButton).toBeVisible();
    await reportButton.click();

    const drawer = page.locator("#drawer");
    await expect(drawer.getByText("ตรวจสอบรายงาน", { exact: true })).toBeVisible();
    await expect(drawer.getByText("Review report", { exact: true })).toHaveCount(0);

    await drawer.locator("#close").click();
    await page.locator('button[data-open="reports:1"]').click();

    await expect(drawer.getByText("รายละเอียดรายงานทั้งหมด", { exact: true })).toBeVisible();
    await expect(drawer.getByText("Full report detail", { exact: true })).toHaveCount(0);
  });
});
