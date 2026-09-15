import { expect, test, type Locator, type Page } from "@playwright/test";

import { MOCK_OPEN_QUEST_ID } from "../../src/features/admin/quest/quest-mock-data";
import { signIn } from "./support/admin-auth";

// Ports the legacy suite assertions (tests/e2e-legacy) to canonical routes.
// Legacy checks for features that the canonical routes do not have yet are listed in tests/e2e-legacy/README.md.

const mobileViewport = { width: 390, height: 844 };

async function switchToThai(page: Page) {
  await page.waitForLoadState("networkidle");
  const languageOptions = page.getByRole("group", { name: /Language options|ตัวเลือกภาษา/ });
  const thaiButton = languageOptions.getByRole("button", { name: "ไทย", exact: true });
  await thaiButton.click();
  await expect(thaiButton).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("html")).toHaveAttribute("lang", "th");
}

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

async function openMemberDrawer(page: Page) {
  await page.goto("/member");
  await page.getByRole("button", { name: "Open Member 68000000" }).click();
  const drawer = page.getByRole("dialog", { name: "Record details" });
  await expect(drawer).toBeVisible();
  return drawer;
}

test.describe("legacy parity on canonical routes", () => {
  test("Wallet board shows Wallet funds and balance columns", async ({ page }) => {
    await signIn(page);
    await page.goto("/wallet");

    await expect(page.locator(".wallet-funds-summary")).toContainText("Total Wallet Funds");
    await expect(page.locator(".wallet-funds-summary")).toContainText("฿");
    const header = page.locator(".wallet-board-table thead");
    await expect(header).toContainText("Current Wallet Balance");
    await expect(header).toContainText("Latest Wallet Transaction Date");
  });

  test("Member Wallet Statement keeps balances, filters, Load more, and tab history", async ({ page }) => {
    await signIn(page);
    await page.goto("/member/68000000?tab=wallet-statement");

    const statement = page.locator("[data-user-wallet-statement]");
    await expect(statement.getByRole("heading", { level: 2, name: "Wallet Statement" })).toBeVisible();
    await expect(statement.locator(".wallet-statement-balance")).toHaveCount(4);
    for (const label of ["Spending Balance", "Earnings Balance", "Funding Reserved", "Reserved For Payouts"]) {
      await expect(statement.locator(".wallet-statement-balance-grid")).toContainText(label);
    }
    await expect(statement.getByLabel("Event type")).toBeVisible();
    await expect(statement.getByLabel("Event type").locator("option")).toHaveText([
      "All event types",
      "TOP_UP",
      "PAYOUT",
      "FUNDING_RESERVE",
      "FUNDING_RELEASE",
      "FUNDING_SETTLEMENT",
      "ADJUSTMENT",
      "EARNINGS_CONVERSION",
    ]);
    await expect(statement.getByLabel("From ICT date")).toBeVisible();
    await expect(statement.getByLabel("To ICT date")).toBeVisible();

    const rows = statement.locator(".wallet-statement-table tbody tr");
    await expect(rows).toHaveCount(25);
    await statement.getByRole("button", { name: "Load more" }).click();
    await expect(rows).toHaveCount(50);

    await statement.getByLabel("Event type").selectOption("TOP_UP");
    await statement.getByRole("button", { name: "Apply filters" }).click();
    await expect(rows.first()).toBeVisible();
    const eventTypes = await rows.locator("td:nth-child(2) strong").allTextContents();
    expect(eventTypes.length).toBeGreaterThan(0);
    expect(eventTypes.every((eventType) => eventType === "TOP_UP")).toBe(true);

    const tabs = page.getByRole("navigation", { name: "Member detail sections" });
    await tabs.getByRole("link", { name: "Overview", exact: true }).click();
    await expect(page).toHaveURL(/\/member\/68000000$/);
    await tabs.getByRole("link", { name: "Wallet Statement", exact: true }).click();
    await expect(page).toHaveURL(/\/member\/68000000\?tab=wallet-statement$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/member\/68000000$/);
    await page.goForward();
    await expect(page).toHaveURL(/\/member\/68000000\?tab=wallet-statement$/);
    await expect(page.locator("[data-user-wallet-statement]")).toBeVisible();
  });

  test("Member reviews keep rating filters without a sort control or a delete action", async ({ page }) => {
    await signIn(page);
    await page.goto("/member/68000000?tab=reviews");

    await expect(page.getByRole("searchbox", { name: "Search reviews" })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Sort reviews" })).toHaveCount(0);

    const ratingFilters = page.getByRole("group", { name: "Filter reviews by rating" });
    const allRatings = ratingFilters.getByRole("button", { name: "All", exact: true });
    await expect(allRatings).toHaveAttribute("aria-pressed", "true");
    await ratingFilters.getByRole("button", { name: "5 star" }).click();
    await expect(allRatings).toHaveAttribute("aria-pressed", "false");
    await allRatings.click();
    await expect(allRatings).toHaveAttribute("aria-pressed", "true");

    const rows = page.locator(".user-detail-table tbody tr");
    await expect(rows.first()).toBeVisible();
    await expect(rows.getByRole("button", { name: "Remove", exact: true })).toHaveCount(0);
  });

  test("Member and Wallet boards use the app style for Member profile links", async ({ page }) => {
    await signIn(page);

    for (const board of ["/member", "/wallet"]) {
      await page.goto(board);
      const profileLink = page.locator(".user-record-link").first();
      await expect(profileLink).toBeVisible();
      await expect(profileLink).toHaveAttribute("href", /^\/member\//);
      await expect(profileLink).toHaveCSS("text-decoration-line", "none");
    }
  });

  test("Quest detail does not offer an approval action", async ({ page }) => {
    await signIn(page);
    await page.goto("/quest/QST-12001");

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: /Approve Quest/i })).toHaveCount(0);
  });

  test("Dispute Case detail offers only Hirer wins or Worker wins and keeps its two-column layout", async ({ page }) => {
    await signIn(page);
    await page.goto("/dispute/DSP-5201");

    await expect(page.getByText("Hirer wins", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Worker wins", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/Require rework/i)).toHaveCount(0);

    const grid = page.locator(".full-record-grid").first();
    await expect(grid).toHaveCSS("display", "grid");
    const columns = await grid.evaluate((element) => getComputedStyle(element).gridTemplateColumns);
    expect(columns.split(" ")).toHaveLength(2);
    await expect(page.getByText(/Invalid Date/)).toHaveCount(0);
  });

  test("Report Case detail keeps its alert layout", async ({ page }) => {
    await signIn(page);
    await page.goto("/report/RPT-8201");

    await expect(page.locator(".report-page-alert").first()).toHaveCSS("display", "flex");
  });

  test("Dispute Case and Report Case pages show no Admin Chat composer in English or Thai", async ({ page }) => {
    await signIn(page);

    for (const thai of [false, true]) {
      if (thai) {
        await page.goto("/overview");
        await switchToThai(page);
      }
      for (const path of ["/dispute/DSP-5201", "/report/RPT-8201"]) {
        await page.goto(path);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await expect(page.locator(".chat-compose")).toHaveCount(0);
        await expect(page.locator("[data-chat-role], [data-report-chat-role]")).toHaveCount(0);
      }
    }
  });

  test("the selected language stays after reload", async ({ page }) => {
    await signIn(page);
    await switchToThai(page);

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "th");

    await page.getByRole("group", { name: /Language options|ตัวเลือกภาษา/ }).getByRole("button", { name: "English", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible();
  });

  test("the Report Case decision is translated to Thai", async ({ page }) => {
    await signIn(page);
    await switchToThai(page);
    await page.goto("/report/RPT-8201");

    await expect(page.getByText("การตัดสินคดีรายงาน", { exact: true }).first()).toBeVisible();
  });
});

test.describe("legacy parity for inputs on mobile", () => {
  test.use({ viewport: mobileViewport, isMobile: true, hasTouch: true });

  test("Overview global search accepts input on mobile", async ({ page }) => {
    await signIn(page);
    await page.getByRole("button", { name: "Search marketplace records" }).click();

    const search = page.getByRole("searchbox", { name: "Search marketplace records" });
    await search.fill("QST-12001");
    await expect(search).toHaveValue("QST-12001");
    await expectResponsiveInput(page, search);
  });

  test("Member review search accepts input on mobile", async ({ page }) => {
    await signIn(page);
    await page.goto("/member/68000000?tab=reviews");

    const search = page.getByRole("searchbox", { name: "Search reviews" });
    await search.fill("delivery");
    await expect(search).toHaveValue("delivery");
    await expectResponsiveInput(page, search);
  });

  test("Member report form accepts input on mobile", async ({ page }) => {
    await signIn(page);
    const drawer = await openMemberDrawer(page);
    await drawer.getByRole("button", { name: "Report Member" }).click();

    const dialog = page.getByRole("dialog", { name: "Report Akarin Ariyawat" });
    await expect(dialog.getByRole("group", { name: "Reported Member" })).toContainText("Akarin Ariyawat");
    const category = dialog.getByLabel("Report type");
    const details = dialog.getByLabel("What happened?");
    await category.selectOption({ label: "Fraud or payment issue" });
    await details.fill("The submitted activity does not match the evidence provided.");
    await expect(category).toHaveValue("Fraud or payment issue");
    await expectResponsiveInput(page, category);
    await expectResponsiveInput(page, details);
    await dialog.getByRole("button", { name: "Close report form" }).click();
    await expect(dialog).toHaveCount(0);
  });

  test("Member penalty ladder form accepts input on mobile", async ({ page }) => {
    await signIn(page);
    const drawer = await openMemberDrawer(page);
    await drawer.getByRole("button", { name: "Record violation" }).click();

    const dialog = page.getByRole("dialog", { name: "Confirm violation for Akarin Ariyawat" });
    await expect(dialog.getByRole("region", { name: "Penalty ladder" })).toContainText("Next outcome");
    const reason = dialog.getByLabel("Reason for confirmed violation");
    const note = dialog.getByLabel("Internal admin note (optional)");
    await reason.fill("Repeated off-platform payment requests.");
    await note.fill("Review again after the appeal window.");
    await expect(reason).toHaveValue("Repeated off-platform payment requests.");
    await expectResponsiveInput(page, reason);
    await expectResponsiveInput(page, note);
    await dialog.getByRole("button", { name: "Close penalty form" }).click();
    await expect(dialog).toHaveCount(0);
  });

  test("Quest termination reason accepts input on mobile", async ({ page }) => {
    await signIn(page);
    await page.goto(`/quest/${MOCK_OPEN_QUEST_ID}`);
    await page.getByRole("button", { name: "Terminate Quest" }).click();

    const dialog = page.getByRole("dialog", { name: "Terminate Quest" });
    const reason = dialog.getByRole("textbox", { name: "Reason", exact: true });
    await reason.fill("The Hirer withdrew this request.");
    await expect(reason).toHaveValue("The Hirer withdrew this request.");
    await expectResponsiveInput(page, reason);
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toHaveCount(0);
  });

  test("Report Case decision reason accepts input on mobile", async ({ page }) => {
    await signIn(page);
    await page.goto("/report/RPT-8201");
    await page.getByRole("radio", { name: /^Confirm violation/ }).check();
    await page.getByRole("button", { name: "Close report" }).first().click();

    const dialog = page.locator("dialog.report-decision-dialog");
    const reason = dialog.getByLabel("Reason for this decision");
    await reason.fill("The account action was reviewed and recorded.");
    await expect(reason).toHaveValue("The account action was reviewed and recorded.");
    await expectResponsiveInput(page, reason);
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toHaveCount(0);
  });

  test("Member admin note accepts input on mobile", async ({ page }) => {
    await signIn(page);
    await page.goto("/member/68000000");
    await page.getByRole("button", { name: "Add note" }).click();

    const dialog = page.getByRole("dialog", { name: "Add admin note for Akarin Ariyawat" });
    const note = dialog.getByLabel("Internal note");
    await note.fill("Drawer note input works.");
    await expect(note).toHaveValue("Drawer note input works.");
    await expectResponsiveInput(page, note);
    await dialog.getByRole("button", { name: "Close admin note form" }).click();
    await expect(dialog).toHaveCount(0);
  });

  test("Payout approval and rejection reason codes accept input on mobile", async ({ page }) => {
    await signIn(page);
    await page.goto("/payout/PAY-9637");

    for (const [command, reasonCode] of [["Approve Payout", "PAYOUT_POLICY_REVIEW"], ["Reject Payout", "PAYOUT_INVALID_DESTINATION"]] as const) {
      await page.getByRole("button", { name: command }).click();
      const dialog = page.getByRole("dialog", { name: command });
      const select = dialog.getByLabel(/Reason code/);
      await select.selectOption(reasonCode);
      await expect(select).toHaveValue(reasonCode);
      await expectResponsiveInput(page, select);
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
    }
  });

  test("Dispute Case decision reason accepts input on mobile", async ({ page }) => {
    await signIn(page);
    await page.goto("/dispute/DSP-5201");
    await page.getByRole("radio", { name: /Hirer wins/ }).check();
    await page.getByRole("button", { name: "Record decision" }).first().click();

    const dialog = page.locator("dialog.dispute-decision-dialog");
    const reason = dialog.getByLabel("Reason for this decision");
    await reason.fill("Evidence supports a refund to the Hirer.");
    await expect(reason).toHaveValue("Evidence supports a refund to the Hirer.");
    await expectResponsiveInput(page, reason);
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toHaveCount(0);
  });
});

test.describe("legacy parity for board controls and moderation", () => {
  test("Quest board keeps its filter tabs and page controls", async ({ page }) => {
    await signIn(page);
    await page.goto("/quest");

    const filters = page.getByLabel("Quest filters");
    const draft = filters.getByRole("button", { name: "Draft", exact: true });
    await draft.click();
    await expect(draft).toHaveAttribute("aria-pressed", "true");
    const all = filters.getByRole("button", { name: /^All/ });
    await all.click();
    await expect(all).toHaveAttribute("aria-pressed", "true");
    await expect(draft).toHaveAttribute("aria-pressed", "false");

    await page.getByRole("button", { name: "Show 25", exact: true }).click();
    await expect(page.getByText(/^Page 1 of \d+$/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Previous", exact: true })).toBeDisabled();
  });

  test("confirmed violations advance through the automatic penalty ladder", async ({ page }) => {
    await signIn(page);
    const drawer = await openMemberDrawer(page);

    const reasons = ["The evidence confirms a policy violation.", "The second confirmed violation is on record."];
    for (const [index, reason] of reasons.entries()) {
      await drawer.getByRole("button", { name: "Record violation" }).click();
      const dialog = page.getByRole("dialog", { name: "Confirm violation for Akarin Ariyawat" });
      await dialog.getByLabel("Reason for confirmed violation").fill(reason);
      await dialog.getByRole("button", { name: "Confirm violation" }).click();
      await expect(dialog).toHaveCount(0);
      await expect(drawer).toContainText(new RegExp(`Confirmed violations\\s*${index + 1}`));
      if (index === 0) await expect(drawer).toContainText("Flag");
    }

    await expect(drawer).toContainText(/frozen/i);
  });

  test("the Report Case drawer action link is translated to Thai", async ({ page }) => {
    await signIn(page);
    await switchToThai(page);
    await page.goto("/report");

    await page.locator("#report-main tbody tr[data-report-id]").first().click();
    const drawer = page.locator("dialog.drawer.open");
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText("เปิดคดีรายงานฉบับเต็ม", { exact: true })).toBeVisible();
    await expect(drawer.getByText("Open full Report Case", { exact: true })).toHaveCount(0);
  });
});
