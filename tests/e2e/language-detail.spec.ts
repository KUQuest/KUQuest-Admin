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

  test("translates functional controls in the rendered quest page", async ({ page }) => {
    await signIn(page);
    await switchToThai(page);
    await page.goto("/quests/QST-12001");

    const exportLog = page.getByRole("button", { name: "ส่งออกบันทึก", exact: true });
    await expect(exportLog).toBeVisible();
    await expect(exportLog).toHaveAttribute("data-functional-action", "export-log");
    await expect(page.getByRole("button", { name: "Export log", exact: true })).toHaveCount(0);
  });

  test("does not show an Admin Chat composer when Thai is active", async ({ page }) => {
    await signIn(page);
    await switchToThai(page);
    await page.goto("/disputes/DSP-5201");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator(".chat-compose")).toHaveCount(0);
    await expect(page.locator('[data-chat-role], [data-report-chat-role]')).toHaveCount(0);
  });

  test("translates dispute search placeholder and table headers", async ({ page }) => {
    await signIn(page);
    await switchToThai(page);
    await page.goto("/?view=disputes");

    const search = page.getByRole("textbox", { name: "ค้นหาข้อพิพาท" });
    await expect(search).toHaveAttribute("placeholder", "ค้นหาข้อพิพาท…");

    const firstHeader = page.locator("table thead th").first();
    await expect(firstHeader).toHaveText(/คดี/);
    await expect(firstHeader).not.toHaveText(/Case/);
  });

  test("translates report decision without an Admin Chat composer", async ({ page }) => {
    await signIn(page);
    await switchToThai(page);
    await page.goto("/reports/RPT-8201");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await expect(
      page.getByRole("heading", { name: "การตัดสินใจเกี่ยวกับรายงาน", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Temporary ban · 7 days", { exact: true })).toHaveCount(0);

    await expect(page.locator(".chat-compose")).toHaveCount(0);
    await expect(page.locator('[data-chat-role], [data-report-chat-role]')).toHaveCount(0);
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
