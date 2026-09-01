import { expect, test, type Locator, type Page } from "@playwright/test";

const mobileViewport = { width: 390, height: 844 };

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

async function expectResponsiveInput(page: Page, input: Locator) {
  await expect(input).toBeVisible();
  const box = await input.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(-1);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width + 1);
  await expect
    .poll(() => page.evaluate(() => matchMedia("(pointer: coarse)").matches))
    .toBe(true);
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    )
    .toBe(true);
}

async function openBoard(page: Page, label: string, heading: string) {
  const mobileMenu = page.getByRole("button", { name: "Open navigation" });
  if (await mobileMenu.isVisible()) await mobileMenu.click();
  await page.getByRole("button", { name: new RegExp(`^${label}`) }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: heading }),
  ).toBeVisible();
}

async function openUserDrawer(page: Page) {
  await openBoard(page, "Users", "Users");
  await page.getByRole("button", { name: "Open user 68000000" }).click();
  const drawer = page.getByRole("dialog", { name: /Record details/ });
  await expect(drawer).toBeVisible();
  return drawer;
}

async function openPayoutDrawer(page: Page) {
  await openBoard(page, "Payouts", "Payouts");
  await page.getByRole("button", { name: "Open payout PAY-9637" }).click();
  const drawer = page.getByRole("dialog", { name: /Record details/ });
  await expect(drawer).toBeVisible();
  return drawer;
}

test.describe("input fields and responsive layouts", () => {
  test.use({
    viewport: mobileViewport,
    isMobile: true,
    hasTouch: true,
  });

  test("login email and password fields accept input on mobile", async ({
    page,
  }) => {
    await page.setViewportSize(mobileViewport);
    await page.goto("/login");

    const email = page.getByLabel("University email");
    const password = page.getByLabel("Password");
    await expect(email).toBeFocused();
    await email.fill("admin@ku.th");
    await password.fill("password123");

    await expect(email).toHaveValue("admin@ku.th");
    await expect(password).toHaveValue("password123");
    await expectResponsiveInput(page, email);
    await expectResponsiveInput(page, password);
  });

  for (const board of [
    { label: "Quests", view: "quests", query: "QST-12001" },
    { label: "Disputes", view: "disputes", query: "DSP-5201" },
    { label: "Reports", view: "reports", query: "RPT-8201" },
    { label: "Payouts", view: "payouts", query: "PAY-9637" },
    { label: "Users", view: "users", query: "Akarin" },
  ]) {
    test(`${board.view} search accepts input and fits the mobile viewport`, async ({
      page,
    }) => {
      await page.setViewportSize(mobileViewport);
      await signIn(page);
      await openBoard(page, board.label, board.label);

      const search = page.getByRole("textbox", {
        name: `Search ${board.view}`,
      });
      await search.fill(board.query);
      await expect(search).toHaveValue(board.query);
      await expectResponsiveInput(page, search);
    });
  }

  test("activity search accepts input and fits the mobile viewport", async ({
    page,
  }) => {
    await page.setViewportSize(mobileViewport);
    await signIn(page);
    await openBoard(page, "Activity log", "Activity log");
    await expect(
      page.getByRole("heading", { level: 1, name: "Activity log" }),
    ).toBeVisible();

    const search = page.getByRole("searchbox", { name: "Search activity" });
    await search.fill("payout");
    await expect(search).toHaveValue("payout");
    await expectResponsiveInput(page, search);
  });

  test("home global search accepts input and fits the mobile viewport", async ({
    page,
  }) => {
    await page.setViewportSize(mobileViewport);
    await signIn(page);
    await page
      .getByRole("button", { name: "Search quests, users, and payouts" })
      .click();

    const search = page.getByRole("searchbox", {
      name: "Search marketplace records",
    });
    await search.fill("QST-12001");
    await expect(search).toHaveValue("QST-12001");
    await expectResponsiveInput(page, search);
    await page.keyboard.press("Escape");
  });

  test("detail global search accepts input and fits the mobile viewport", async ({
    page,
  }) => {
    await page.setViewportSize(mobileViewport);
    await signIn(page);
    await page.goto("/quests/QST-12001");
    await expect(
      page.getByRole("heading", { level: 1, name: /Audit campus laboratory signage/ }),
    ).toBeVisible();
    await page.keyboard.press("Control+k");

    const search = page.getByRole("searchbox", {
      name: "Search quests, users, payouts, or student IDs",
    });
    await search.fill("Akarin Ariyawat");
    await expect(search).toHaveValue("Akarin Ariyawat");
    await expectResponsiveInput(page, search);
    await page.keyboard.press("Escape");
  });

  test("user profile note and review search accept input on mobile", async ({
    page,
  }) => {
    await page.setViewportSize(mobileViewport);
    await signIn(page);
    await openBoard(page, "Users", "Users");
    await page.getByRole("link", { name: /Akarin Ariyawat/ }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Akarin Ariyawat" }),
    ).toBeVisible();

    const note = page.getByLabel("Internal note");
    await note.fill("Mobile profile note");
    await expect(note).toHaveValue("Mobile profile note");
    await expectResponsiveInput(page, note);

    await page.getByRole("button", { name: "Reviews", exact: true }).click();
    const reviewSearch = page.getByRole("searchbox", {
      name: "Search reviews",
    });
    await reviewSearch.fill("delivery");
    await expect(reviewSearch).toHaveValue("delivery");
    await expectResponsiveInput(page, reviewSearch);
  });

  test("payout approval reason accepts input and fits the mobile dialog", async ({
    page,
  }) => {
    await page.setViewportSize(mobileViewport);
    await signIn(page);
    const drawer = await openPayoutDrawer(page);
    await drawer.getByRole("button", { name: "Approve payout" }).click();

    const dialog = page.getByRole("dialog", { name: "Approve payout" });
    const reason = dialog.getByLabel("Reason for this decision");
    await reason.fill("Recipient and balance were verified.");
    await expect(reason).toHaveValue("Recipient and balance were verified.");
    await expectResponsiveInput(page, reason);
    await dialog.getByRole("button", { name: "Cancel" }).click();
  });

  test("payout rejection select and admin note accept input on mobile", async ({
    page,
  }) => {
    await page.setViewportSize(mobileViewport);
    await signIn(page);
    const drawer = await openPayoutDrawer(page);
    await drawer.getByRole("button", { name: "Reject payout" }).click();

    const dialog = page.getByRole("dialog", { name: "Reject payout" });
    const rejection = dialog.getByLabel("Rejection reason");
    const note = dialog.getByRole("textbox");
    await rejection.selectOption({ label: "Insufficient withdrawable balance." });
    await note.fill("Balance needs correction.");
    await expect(rejection).toHaveValue("Insufficient withdrawable balance.");
    await expect(note).toHaveValue("Balance needs correction.");
    await expectResponsiveInput(page, rejection);
    await expectResponsiveInput(page, note);
    await dialog.getByRole("button", { name: "Cancel" }).click();
  });

  test("report creation form inputs accept input on mobile", async ({ page }) => {
    await page.setViewportSize(mobileViewport);
    await signIn(page);
    const drawer = await openUserDrawer(page);
    await drawer.getByRole("button", { name: "Report user" }).click();

    const dialog = page.getByRole("dialog", { name: "Report Akarin Ariyawat" });
    const selectedUser = dialog.getByRole("group", { name: "Reported user" });
    const category = dialog.getByLabel("Report type");
    const details = dialog.getByLabel("What happened?");
    const evidence = dialog.getByLabel("Evidence file (optional)");
    const selectedUserName = (await selectedUser.locator("strong").textContent())?.trim() ?? "";
    const selectedUserId = (await selectedUser.locator("small").textContent())?.replace("Student ID ·", "").trim() ?? "";
    const reporterId = await dialog.locator('input[name="reporter"]').inputValue();
    const reportDetails = "The submitted activity does not match the evidence provided.";
    expect(selectedUserName).not.toBe("");
    expect(selectedUserId).not.toBe("");
    await expect(selectedUser).toContainText(selectedUserName);
    await expect(selectedUser).toContainText(selectedUserId);
    await expect(dialog.getByLabel("Reporting user")).toHaveCount(0);
    await category.selectOption({ label: "Fraud or payment issue" });
    await details.fill(reportDetails);
    await evidence.setInputFiles({
      name: "report-evidence.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("report evidence"),
    });

    await expect(category).toHaveValue("Fraud or payment issue");
    await expect(details).toHaveValue(reportDetails);
    await expect(dialog.getByText("report-evidence.txt", { exact: true })).toBeVisible();
    await expectResponsiveInput(page, category);
    await expectResponsiveInput(page, details);
    await expectResponsiveInput(page, dialog.locator('label[for="report-attachment"]'));
    await dialog.getByRole("button", { name: "Submit report" }).click();
    await expect(page.getByText(`Report submitted against ${selectedUserName}.`, { exact: true })).toBeVisible();

    const persistedReport = await page.evaluate(({ details, reporterId }) => {
      type StoredRecord = {
        id?: string;
        title?: string;
        details?: string;
        reporterId?: string;
        reporterName?: string;
        reportedUserId?: string;
        reportedUserName?: string;
      };
      const raw = window.localStorage.getItem("kuquest-admin-demo-data");
      if (!raw) return null;
      const stored = JSON.parse(raw) as {
        collections?: { reports?: StoredRecord[]; users?: StoredRecord[] };
      };
      const report = stored.collections?.reports?.find((candidate) => candidate.details === details);
      const reporter = stored.collections?.users?.find((candidate) => candidate.id === reporterId);
      if (!report) return null;
      return {
        report: {
          details: report.details,
          reporterId: report.reporterId,
          reporterName: report.reporterName,
          reportedUserId: report.reportedUserId,
          reportedUserName: report.reportedUserName,
        },
        reporterName: reporter?.title ?? null,
      };
    }, { details: reportDetails, reporterId });

    if (!persistedReport) throw new Error("Submitted report was not persisted.");
    expect(persistedReport.reporterName).toBeTruthy();
    expect(persistedReport.report).toMatchObject({
      details: reportDetails,
      reporterId,
      reporterName: persistedReport.reporterName,
      reportedUserId: selectedUserId,
      reportedUserName: selectedUserName,
    });
  });

  test("penalty ladder reason and note accept input on mobile", async ({
    page,
  }) => {
    await page.setViewportSize(mobileViewport);
    await signIn(page);
    const drawer = await openUserDrawer(page);
    await drawer.getByRole("button", { name: "Record violation" }).click();

    const dialog = page.getByRole("dialog", {
      name: "Confirm violation for Akarin Ariyawat",
    });
    await expect(dialog.getByText("1st violation: Red Flag", { exact: false })).toBeVisible();
    await expect(dialog.getByText("Next outcomeRed Flag · 7 days", { exact: false })).toBeVisible();

    const reason = dialog.getByRole("textbox", { name: "Reason for confirmed violation" });
    const note = dialog.getByRole("textbox", {
      name: "Internal admin note (optional)",
    });
    await reason.fill("Repeated off-platform payment requests.");
    await note.fill("Review again after the appeal window.");
    await expect(reason).toHaveValue("Repeated off-platform payment requests.");
    await expect(note).toHaveValue("Review again after the appeal window.");
    await expectResponsiveInput(page, reason);
    await expectResponsiveInput(page, note);
    await dialog.getByRole("button", { name: "Close penalty form" }).click();
  });

  test("confirmed violations advance through the automatic penalty ladder", async ({
    page,
  }) => {
    await signIn(page);
    let drawer = await openUserDrawer(page);
    await drawer.getByRole("button", { name: "Record violation" }).click();

    let dialog = page.getByRole("dialog", {
      name: "Confirm violation for Akarin Ariyawat",
    });
    await dialog
      .getByRole("textbox", { name: "Reason for confirmed violation" })
      .fill("The evidence confirms a policy violation.");
    await dialog.getByRole("button", { name: "Confirm violation" }).click();

    drawer = page.getByRole("dialog", { name: /Record details/ });
    await expect(drawer).toContainText("Red Flag");
    await expect(drawer).toContainText("Confirmed violations");
    await expect(drawer).toContainText("1");

    await drawer.getByRole("button", { name: "Record violation" }).click();
    dialog = page.getByRole("dialog", {
      name: "Confirm violation for Akarin Ariyawat",
    });
    await dialog
      .getByRole("textbox", { name: "Reason for confirmed violation" })
      .fill("The second confirmed violation is on record.");
    await dialog.getByRole("button", { name: "Confirm violation" }).click();

    drawer = page.getByRole("dialog", { name: /Record details/ });
    await expect(drawer).toContainText("FROZEN");
    await expect(drawer).toContainText("Expires");
  });

  test("admin note dialog accepts input and fits the mobile viewport", async ({
    page,
  }) => {
    await page.setViewportSize(mobileViewport);
    await signIn(page);
    const drawer = await openUserDrawer(page);
    await drawer.getByRole("button", { name: "Add note" }).click();

    const dialog = page.getByRole("dialog", {
      name: "Add admin note for Akarin Ariyawat",
    });
    const note = dialog.getByRole("textbox", { name: "Internal note" });
    await note.fill("Drawer note input works.");
    await expect(note).toHaveValue("Drawer note input works.");
    await expectResponsiveInput(page, note);
    await dialog.getByRole("button", { name: "Close admin note form" }).click();
  });

  test("temporary ban follows the fixed SRS duration", async ({
    page,
  }) => {
    await page.setViewportSize(mobileViewport);
    await signIn(page);
    await openBoard(page, "Users", "Users");
    await page.getByRole("textbox", { name: "Search users" }).fill("Jakkrit Ariyawat");
    await page.getByRole("link", { name: /Jakkrit Ariyawat/ }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Jakkrit Ariyawat" }),
    ).toBeVisible();
    await expect(page.getByText("No manual penalty override is available.", { exact: false })).toBeVisible();
    await expect(page.getByText("Temporary ban expires", { exact: false })).toBeVisible();
  });

  test("quest termination reason accepts input on mobile", async ({ page }) => {
    await page.setViewportSize(mobileViewport);
    await signIn(page);
    await page.goto("/quests/QST-12001");
    await page.getByRole("button", { name: "Terminate quest" }).click();

    const dialog = page.getByRole("dialog", { name: "Terminate quest" });
    const reason = dialog.getByLabel("Reason for this decision");
    await reason.fill("The hirer withdrew this request.");
    await expect(reason).toHaveValue("The hirer withdrew this request.");
    await expectResponsiveInput(page, reason);
    await dialog.getByRole("button", { name: "Cancel" }).click();
  });

  test("dispute resolution reason accepts input on mobile", async ({ page }) => {
    await page.setViewportSize(mobileViewport);
    await signIn(page);
    await page.goto("/disputes/DSP-5201");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.getByRole("button", { name: /Hirer wins/ }).click();
    await page.getByRole("button", { name: "Resolve dispute" }).click();

    const dialog = page.getByRole("dialog", {
      name: "Confirm dispute resolution",
    });
    const reason = dialog.getByLabel("Reason for this decision");
    await reason.fill("Evidence supports a refund to the hirer.");
    await expect(reason).toHaveValue("Evidence supports a refund to the hirer.");
    await expectResponsiveInput(page, reason);
    await dialog.getByRole("button", { name: "Cancel" }).click();
  });

  test("report close reason accepts input on mobile", async ({ page }) => {
    await page.setViewportSize(mobileViewport);
    await signIn(page);
    await page.goto("/reports/RPT-8201");
    await page.getByRole("radio", { name: /^Confirm violation/ }).check();
    await page.getByRole("button", { name: "Close report" }).first().click();

    const dialog = page.getByRole("dialog", { name: "Close report" });
    const reason = dialog.getByLabel("Reason for this decision");
    await reason.fill("The account action was reviewed and recorded.");
    await expect(reason).toHaveValue("The account action was reviewed and recorded.");
    await expectResponsiveInput(page, reason);
    await dialog.getByRole("button", { name: "Cancel" }).click();
  });

  test("Admin Chat composers are not shown on dispute and report pages", async ({
    page,
  }) => {
    await page.setViewportSize(mobileViewport);
    await signIn(page);
    await page.goto("/disputes/DSP-5201");
    await expect(page.locator(".chat-compose")).toHaveCount(0);
    await expect(page.locator('[data-chat-role], [data-report-chat-role]')).toHaveCount(0);

    await page.goto("/reports/RPT-8201");
    await expect(page.locator(".chat-compose")).toHaveCount(0);
    await expect(page.locator('[data-chat-role], [data-report-chat-role]')).toHaveCount(0);
  });
});
