import { readFile } from "node:fs/promises";
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

test.describe("admin click flows", () => {
  test("admin can show and hide the password while signing in", async ({
    page,
  }) => {
    await page.goto("/login");

    const password = page.getByLabel("Password");
    await expect(password).toHaveAttribute("type", "password");

    await page.getByRole("button", { name: "Show" }).click();
    await expect(password).toHaveAttribute("type", "text");
    await expect(page.getByRole("button", { name: "Hide" })).toBeVisible();

    await page.getByRole("button", { name: "Hide" }).click();
    await expect(password).toHaveAttribute("type", "password");
  });

  test("admin can switch the sign-in screen between English and Thai", async ({
    page,
  }) => {
    await page.goto("/login");

    await page.getByRole("button", { name: "ไทย", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "th");
    await expect(
      page.getByRole("heading", { level: 1, name: "เข้าสู่ระบบผู้ดูแล" }),
    ).toBeVisible();
    await expect(page.getByLabel("อีเมลมหาวิทยาลัย")).toBeVisible();

    await page.getByRole("button", { name: "English", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(
      page.getByRole("heading", { level: 1, name: "Sign in to admin" }),
    ).toBeVisible();
  });

  test("admin can sign in and open Users from primary navigation", async ({
    page,
  }) => {
    await signIn(page);

    await page.getByRole("button", { name: "Users", exact: true }).click();

    await expect(page).toHaveURL(/\/\?view=users$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Users" }),
    ).toBeVisible();
  });

  test("admin can export a quest log after switching to Thai", async ({ page }) => {
    await signIn(page);
    await page.getByRole("button", { name: /^Quests/ }).click();
    await page.getByRole("button", { name: "Open quest QST-12001", exact: true }).click();
    await page.getByRole("link", { name: "Full quest detail" }).click();
    await page.waitForFunction(() =>
      Boolean((window as unknown as { __KUQUEST_LANGUAGE__?: unknown }).__KUQUEST_LANGUAGE__),
    );

    await page.getByRole("button", { name: "ไทย", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "th");
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "ส่งออกบันทึก", exact: true }).click(),
    ]);
    expect(download.suggestedFilename()).toBe("kuquest-admin-export.csv");
    const downloadedPath = await download.path();
    if (!downloadedPath) throw new Error("The export download did not provide a file path.");
    const csv = await readFile(downloadedPath, "utf8");
    expect(csv).toContain("record,action,status");
    expect(csv).toContain("synthetic,exported,complete");
  });

  test("admin can switch the interface between English and Thai", async ({
    page,
  }) => {
    await signIn(page);

    const languageOptions = page.getByRole("group", {
      name: /Language options|ตัวเลือกภาษา/,
    });
    await languageOptions.getByRole("button", { name: "ไทย", exact: true }).click();

    await expect(page.locator("html")).toHaveAttribute("lang", "th");
    await expect(
      page.getByRole("heading", { level: 1, name: "ภาพรวม" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "ผู้ใช้", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".profile small")).toHaveText("ผู้ดูแลระบบ");
    await expect(
      languageOptions.getByRole("button", { name: "ไทย", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "th");
    await expect(
      page.getByRole("heading", { level: 1, name: "ภาพรวม" }),
    ).toBeVisible();

    await languageOptions
      .getByRole("button", { name: "English", exact: true })
      .click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(
      page.getByRole("heading", { level: 1, name: "Overview" }),
    ).toBeVisible();
    await expect(page.locator(".profile small")).toHaveText("Administrator");
  });

  test("admin can persist a selected dashboard theme", async ({ page }) => {
    await signIn(page);

    await page.getByRole("button", { name: "Theme Grey-white" }).click();
    await page.getByRole("button", { name: /Dark Low-light workspace/ }).click();

    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible();
  });

  test("admin can open a record from global search", async ({ page }) => {
    await signIn(page);

    await page
      .getByRole("button", { name: "Search quests, users, and payouts" })
      .click();

    const searchDialog = page.getByRole("dialog", {
      name: "Search marketplace records",
    });
    await expect(searchDialog).toBeVisible();

    const search = searchDialog.getByRole("searchbox", {
      name: "Search marketplace records",
    });
    await search.fill("Akarin Ariyawat");

    const userResult = searchDialog.getByRole("button", {
      name: /^Akarin Ariyawat 68000000/,
    });
    await expect(userResult).toBeVisible();
    await userResult.click();

    const drawer = page.getByRole("dialog", { name: /Record details/ });
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText("Akarin Ariyawat");
  });

  test("dashboard dispute links render the selected dispute detail", async ({ page }) => {
    await signIn(page);

    const disputeLink = page.getByRole("link", { name: /Resolve .* dispute/ }).first();
    await expect(disputeLink).toBeVisible();
    const disputeHref = await disputeLink.getAttribute("href");
    expect(disputeHref).toMatch(/^\/disputes\/DSP-\d+$/);
    if (!disputeHref) throw new Error("The dashboard dispute link has no href.");
    const expectedUrl = new URL(disputeHref, page.url()).toString();
    const disputeId = disputeHref.slice(disputeHref.lastIndexOf("/") + 1);
    await disputeLink.click();

    await expect(page).toHaveURL(expectedUrl);
    await expect(page.locator("#main .full-record-head")).toBeVisible();
    await expect(page.locator("#main .record-id")).toHaveText(disputeId);
  });

  test("admin can search users and open the linked profile", async ({ page }) => {
    await signIn(page);
    await page.getByRole("button", { name: "Users", exact: true }).click();

    const search = page.getByRole("textbox", { name: "Search users" });
    await search.fill("Akarin Ariyawat");

    const profileLink = page.getByRole("link", {
      name: /Akarin Ariyawat/,
    });
    await expect(profileLink).toBeVisible();
    await profileLink.click();

    await expect(page).toHaveURL(/\/users\/68000000$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Akarin Ariyawat" }),
    ).toBeVisible();
  });

  test("admin can open and close a user record drawer", async ({ page }) => {
    await signIn(page);
    await page.getByRole("button", { name: "Users", exact: true }).click();

    await page.getByRole("button", { name: "Open user 68000000" }).click();

    const drawer = page.getByRole("dialog", { name: /Record details/ });
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText("Akarin Ariyawat");

    await drawer.getByRole("button", { name: "Close" }).click();
    await expect(
      page.getByRole("dialog", { name: /Record details/ }),
    ).toHaveCount(0);
  });

  test("admin can use the mobile navigation to switch views", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page);

    await page.getByRole("button", { name: "Open navigation" }).click();

    const navigation = page.locator("#site-navigation");
    await expect(navigation).toHaveClass(/open/);
    await navigation
      .getByRole("button", { name: "Users", exact: true })
      .click();

    await expect(
      page.getByRole("heading", { level: 1, name: "Users" }),
    ).toBeVisible();
    await expect(navigation).not.toHaveClass(/open/);
  });

  test("admin can filter quests and move to the next page", async ({ page }) => {
    await signIn(page);
    await page.getByRole("button", { name: /^Quests/ }).click();

    const draftTab = page.getByRole("button", { name: "QUEST_DRAFT", exact: true });
    await expect(draftTab).toBeVisible();
    await draftTab.click();
    await expect(draftTab).toHaveAttribute("aria-pressed", "true");

    await page.getByRole("button", { name: /^All/ }).click();
    await page.getByRole("button", { name: "Show 25", exact: true }).click();

    const pageIndicator = page.getByText(/^Page \d+ of \d+$/);
    await expect(pageIndicator).toHaveText(/Page 1 of/);
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(pageIndicator).toHaveText(/Page 2 of/);
  });

  test("quest status and team or solo filters can be combined", async ({
    page,
  }) => {
    await signIn(page);
    await page.getByRole("button", { name: /^Quests/ }).click();

    const completedTab = page.getByRole("button", {
      name: "QUEST_COMPLETED",
      exact: true,
    });
    const teamTab = page.getByRole("button", { name: "Team", exact: true });
    const soloTab = page.getByRole("button", { name: "Solo", exact: true });
    await expect(completedTab).toBeVisible();
    await expect(soloTab).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Rework", exact: true }),
    ).toHaveCount(0);

    await completedTab.click();
    await teamTab.click();
    await expect(teamTab).toHaveAttribute("aria-pressed", "true");
    await expect(completedTab).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".data tbody")).toContainText("QUEST_COMPLETED");
    await expect(page.locator(".data tbody")).toContainText("Team quest");

    await soloTab.click();
    await expect(teamTab).toHaveAttribute("aria-pressed", "false");
    await expect(soloTab).toHaveAttribute("aria-pressed", "true");
    await expect(completedTab).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".data tbody")).toContainText("QUEST_COMPLETED");
    await expect(page.locator(".data tbody")).not.toContainText("Team quest");
  });

  test("dispute resolution does not offer rework", async ({ page }) => {
    await signIn(page);
    await page.goto("/disputes/DSP-5201");

    await expect(
      page.getByRole("button", { name: /Require rework/, exact: false }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /Hirer wins/, exact: false }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Worker wins/, exact: false }),
    ).toBeVisible();
  });

  test("resolving a dispute in the board drawer refreshes its row", async ({
    page,
  }) => {
    await signIn(page);
    await page.getByRole("button", { name: /^Disputes/ }).click();

    const disputeButton = page.getByRole("button", {
      name: "Open dispute DSP-5201",
      exact: true,
    });
    const disputeRow = disputeButton.locator("xpath=ancestor::tr");
    await expect(disputeRow).toContainText("DISPUTE_CASE_PENDING");
    await disputeButton.click();

    const drawer = page.getByRole("dialog", { name: /Record details/ });
    const questHref = await drawer
      .getByRole("link", { name: "Open full quest", exact: true })
      .getAttribute("href");
    if (!questHref) throw new Error("The dispute has no linked quest.");
    await drawer.getByRole("button", { name: /Hirer wins/ }).click();
    await drawer.getByRole("button", { name: "Resolve dispute", exact: true }).click();

    const confirmation = page.getByRole("dialog", {
      name: "Confirm dispute resolution",
    });
    await confirmation
      .getByLabel("Reason for this decision")
      .fill("The evidence supports a refund to the hirer.");
    await confirmation
      .getByRole("button", { name: "Confirm dispute resolution", exact: true })
      .click();

    await expect(disputeRow).toContainText("DISPUTE_CASE_RESOLVED");
    await expect(disputeRow).not.toHaveClass(/dispute-active-row/);
    await expect(drawer).toContainText("Dispute decision recorded");

    await page.goto(questHref);
    await expect(page.locator(".record-status-bar .badge")).toHaveText("QUEST_FAILED");
  });

  test("admin can review a payout approval and cancel safely", async ({
    page,
  }) => {
    await signIn(page);
    await page.getByRole("button", { name: /^Payouts/ }).click();

    const payout = page.getByRole("button", {
      name: "Open payout PAY-9637",
      exact: true,
    });
    await expect(payout).toBeVisible();
    await payout.click();

    const drawer = page.getByRole("dialog", { name: /Record details/ });
    await expect(drawer).toBeVisible();
    await drawer.getByRole("button", { name: "Approve payout" }).click();

    const confirmation = page.getByRole("dialog", { name: "Approve payout" });
    await expect(confirmation).toBeVisible();
    await expect(confirmation).toContainText("Available balance");
    await confirmation.getByRole("button", { name: "Cancel" }).click();
    await expect(confirmation).toHaveCount(0);
    await expect(drawer).toContainText("PENDING_ADMIN_APPROVAL");
  });

  test("admin must enter a reason before approving a payout", async ({
    page,
  }) => {
    await signIn(page);
    await page.getByRole("button", { name: /^Payouts/ }).click();

    const payout = page.getByRole("button", {
      name: "Open payout PAY-9637",
      exact: true,
    });
    await expect(payout).toBeVisible();
    await payout.click();

    const drawer = page.getByRole("dialog", { name: /Record details/ });
    await drawer.getByRole("button", { name: "Approve payout" }).click();

    const confirmation = page.getByRole("dialog", { name: "Approve payout" });
    const reason = confirmation.getByLabel("Reason for this decision");
    const confirmButton = confirmation.getByRole("button", {
      name: "Approve payout",
    });
    await expect(reason).toBeVisible();
    await expect(reason).toBeEnabled();
    await expect(reason).toBeFocused();
    await expect(confirmButton).toBeDisabled();

    const approvalReason = "Recipient and balance were verified.";
    await reason.fill(approvalReason);
    await expect(confirmButton).toBeEnabled();
    await confirmButton.click();

    await expect(confirmation).toHaveCount(0);
    await payout.click();
    await expect(page.getByRole("dialog", { name: /Record details/ })).toContainText(
      approvalReason,
    );
  });

  test("admin must choose a payout rejection reason before confirming", async ({
    page,
  }) => {
    await signIn(page);
    await page.getByRole("button", { name: /^Payouts/ }).click();

    const payout = page.getByRole("button", {
      name: "Open payout PAY-9637",
      exact: true,
    });
    await expect(payout).toBeVisible();
    await payout.click();

    const drawer = page.getByRole("dialog", { name: /Record details/ });
    await expect(drawer).toBeVisible();
    await drawer.getByRole("button", { name: "Reject payout" }).click();

    const confirmation = page.getByRole("dialog", { name: "Reject payout" });
    const confirmButton = confirmation.getByRole("button", {
      name: "Reject payout",
    });
    await expect(confirmation).toBeVisible();
    await expect(confirmButton).toBeDisabled();

    await confirmation
      .getByLabel("Rejection reason")
      .selectOption({ label: "Insufficient withdrawable balance." });
    await expect(confirmButton).toBeEnabled();
    await confirmation.getByRole("button", { name: "Cancel" }).click();
    await expect(confirmation).toHaveCount(0);
  });

  test("admin can open a quest drawer and follow full quest detail", async ({
    page,
  }) => {
    await signIn(page);
    await page.getByRole("button", { name: /^Quests/ }).click();

    const quest = page.getByRole("button", {
      name: "Open quest QST-12001",
      exact: true,
    });
    await expect(quest).toBeVisible();
    await quest.click();

    const drawer = page.getByRole("dialog", { name: /Record details/ });
    await expect(drawer).toBeVisible();
    const questTitle = (await drawer.locator("h2").first().innerText()).trim();
    await drawer.getByRole("link", { name: "Full quest detail" }).click();

    await expect(page).toHaveURL(/\/quests\/QST-12001$/);
    await expect(page.locator("#main .record-id")).toHaveText("QST-12001");
    await expect(
      page.getByRole("heading", { level: 1, name: questTitle, exact: true }),
    ).toBeVisible();
  });

  test("hiding a quest updates and persists its status", async ({ page }) => {
    await signIn(page);
    await page.getByRole("button", { name: /^Quests/ }).click();

    await page.getByRole("button", {
      name: "Open quest QST-12001",
      exact: true,
    }).click();
    const drawer = page.getByRole("dialog", { name: /Record details/ });
    await drawer.getByRole("button", { name: "Hide quest", exact: true }).click();

    const confirmation = page.getByRole("dialog", { name: "Hide quest" });
    await confirmation.getByLabel("Reason for this decision").fill(
      "This quest should be hidden from the marketplace.",
    );
    await confirmation.getByRole("button", { name: "Hide quest", exact: true }).click();

    const questRow = page
      .getByRole("button", { name: "Open quest QST-12001", exact: true })
      .locator("xpath=ancestor::tr");
    await expect(questRow).toContainText("Hidden");

    await page.reload();
    await page.getByRole("button", { name: /^Quests/ }).click();
    await expect(
      page
        .getByRole("button", { name: "Open quest QST-12001", exact: true })
        .locator("xpath=ancestor::tr"),
    ).toContainText("Hidden");
  });

  test("quest detail does not offer an approval action", async ({
    page,
  }) => {
    await signIn(page);
    await page.getByRole("button", { name: /^Quests/ }).click();

    await page.getByRole("button", {
      name: "Open quest QST-12001",
      exact: true,
    }).click();
    await page
      .getByRole("dialog", { name: /Record details/ })
      .getByRole("link", { name: "Full quest detail" })
      .click();

    await expect(page.getByRole("button", {
      name: "Approve quest",
      exact: true,
    })).toHaveCount(0);
  });

  test("every failed quest links to its dispute case", async ({ page }) => {
    await signIn(page);
    await page.getByRole("button", { name: /^Quests/ }).click();
    await page.getByRole("button", { name: "QUEST_FAILED", exact: true }).click();
    await page.getByRole("button", { name: "Show all", exact: true }).click();

    const rows = page.locator("#main .table-wrap[aria-label='quests table'] tbody tr");
    const links = rows.locator("a.quest-dispute-link");
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);
    await expect(links).toHaveCount(rowCount);
    const hrefs = await links.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("href")),
    );
    expect(hrefs.every((href) => /^\/disputes\/DSP-\d+$/.test(href ?? ""))).toBe(true);
  });

  test("closed disputes leave their linked quest in a final status", async ({ page }) => {
    await signIn(page);
    await page.goto("/?view=disputes");
    await page.getByRole("button", { name: "DISPUTE_CASE_RESOLVED", exact: true }).click();

    const closedCase = page.locator("#main .table-wrap[aria-label='disputes table'] tbody tr").first();
    await expect(closedCase).toBeVisible();
    await closedCase.getByRole("button").first().click();

    const drawer = page.getByRole("dialog", { name: /Record details/ });
    const questLink = drawer.getByRole("link", { name: "Open full quest", exact: true });
    await expect(questLink).toBeVisible();
    const questHref = await questLink.getAttribute("href");
    if (!questHref) throw new Error("The closed dispute has no linked quest.");
    await page.goto(questHref);

    await expect(page.locator(".record-status-bar .badge")).not.toHaveText("Disputed");
    await expect(page.locator(".record-status-bar .badge")).toHaveText("QUEST_FAILED");
  });

  test("banned users are never assigned as quest hirers or workers", async ({ page }) => {
    await signIn(page);
    await page.goto("/?view=quests");
    await page.waitForFunction(() => Boolean(window.data?.quests?.length));

    const invalidAssignments = await page.evaluate(() => {
      const runtimeData = window.data;
      if (!runtimeData) throw new Error("The admin data runtime is not available.");
      const bannedUsers = new Set(
        runtimeData.users
          .filter((user) => user.status === "Temp ban" || user.status === "Perm ban")
          .map((user) => user.title),
      );
      return runtimeData.quests
        .filter((quest) => {
          const workers = quest.teamParticipants?.map(([name]) => name) ??
            (quest.selectedParticipant ? [quest.selectedParticipant] : []);
          return bannedUsers.has(quest.person) || workers.some((worker) => bannedUsers.has(worker));
        })
        .map((quest) => quest.id);
    });

    expect(invalidAssignments).toEqual([]);
  });

  test("dispute full detail keeps its two-column record layout", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/disputes/DSP-5201");

    const grid = page.locator("#main .full-record-grid");
    await expect(grid).toHaveCSS("display", "grid");
    const columns = await grid.evaluate((element) => getComputedStyle(element).gridTemplateColumns);
    expect(columns.split(" ")).toHaveLength(2);
    await expect(page.locator("#main .record-side")).toBeVisible();
    await expect(page.getByText(/Invalid Date/)).toHaveCount(0);
  });

  test("report full detail keeps its alert and metadata layout", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/reports/RPT-8281");

    await expect(page.locator("#main .report-page-alert")).toHaveCSS(
      "display",
      "flex",
    );
    const columns = await page.locator("#main .report-overview .overview-meta").evaluate(
      (element) => getComputedStyle(element).gridTemplateColumns,
    );
    expect(columns.split(" ")).toHaveLength(3);
  });

  test("report and user boards use the app style for profile links", async ({
    page,
  }) => {
    await signIn(page);

    for (const view of ["reports", "users"]) {
      await page.goto(`/?view=${view}`);
      const profileLink = page.locator("#main .user-record-link").first();
      await expect(profileLink).toBeVisible();
      await expect(profileLink).toHaveAttribute("href", /^\/users\//);
      await expect(profileLink).toHaveCSS("text-decoration-line", "none");
    }
  });

  test("all board rows remain actionable after opening a full user profile", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/?view=users");
    await page.locator("#main .user-record-link").first().click();
    await expect(page).toHaveURL(/\/users\//);
    await expect(page.locator("#main .user-summary-panel")).toBeVisible();

    for (const view of ["quests", "disputes", "reports", "payouts"]) {
      await page.locator(`#nav button[data-view="${view}"]`).click();
      await expect(page).toHaveURL(new RegExp(`\\?view=${view}$`));
      await page.locator("#main tbody tr").first().click();
      await expect(page.locator("#drawer")).toHaveAttribute("aria-hidden", "false");
      await page.locator("#drawer #close").click();
      await expect(page.locator("#drawer")).toHaveAttribute("aria-hidden", "true");
    }
  });

  test("user quest history links to the complete quest record", async ({
    page,
  }) => {
    await signIn(page);
    await page.getByRole("button", { name: "Users", exact: true }).click();

    const search = page.getByRole("textbox", { name: "Search users" });
    await search.fill("Akarin Ariyawat");
    await page.getByRole("link", { name: /Akarin Ariyawat/ }).click();

    await page.getByRole("button", { name: "Activity", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Quest history", level: 2 }),
    ).toBeVisible();

    const questLink = page.getByRole("link", { name: /View full quest/ }).first();
    await expect(questLink).toContainText("Quest status");
    const questHref = await questLink.getAttribute("href");
    expect(questHref).toMatch(/^\/quests\/QST-\d+$/);
    if (!questHref) throw new Error("The quest history link has no href.");
    const expectedUrl = new URL(questHref, page.url()).toString();
    const questId = questHref.slice(questHref.lastIndexOf("/") + 1);
    const questTitle = await questLink.locator(".user-quest-history-title strong").innerText();
    await questLink.click();

    await expect(page).toHaveURL(expectedUrl);
    await expect(page.locator("#main .record-id")).toHaveText(questId);
    await expect(
      page.getByRole("heading", { level: 1, name: questTitle, exact: true }),
    ).toBeVisible();
  });

  test("reviews keep search and filters without a separate sort control", async ({
    page,
  }) => {
    await signIn(page);
    await page.getByRole("button", { name: "Users", exact: true }).click();

    const search = page.getByRole("textbox", { name: "Search users" });
    await search.fill("Akarin Ariyawat");
    await page.getByRole("link", { name: /Akarin Ariyawat/ }).click();
    await page.getByRole("button", { name: "Reviews", exact: true }).click();

    await expect(
      page.getByRole("heading", { name: "Reviews", level: 2 }),
    ).toBeVisible();
    await expect(
      page.getByRole("searchbox", { name: "Search reviews" }),
    ).toBeVisible();
    await expect(
      page.getByRole("combobox", { name: "Sort reviews" }),
    ).toHaveCount(0);
  });

  test("review rating filters can be cleared with All", async ({ page }) => {
    await signIn(page);
    await page.getByRole("button", { name: "Users", exact: true }).click();

    const search = page.getByRole("textbox", { name: "Search users" });
    await search.fill("Akarin Ariyawat");
    await page.getByRole("link", { name: /Akarin Ariyawat/ }).click();
    await page.getByRole("button", { name: "Reviews", exact: true }).click();

    const ratingFilters = page.getByRole("group", {
      name: "Filter reviews by rating",
    });
    const allRatings = ratingFilters.getByRole("button", { name: "All" });
    await expect(allRatings).toHaveAttribute("aria-pressed", "true");

    await ratingFilters.getByRole("button", { name: "5 star" }).click();
    await expect(allRatings).toHaveAttribute("aria-pressed", "false");

    await allRatings.click();
    await expect(allRatings).toHaveAttribute("aria-pressed", "true");
  });

  test("reviews cannot be deleted", async ({ page }) => {
    await signIn(page);
    await page.getByRole("button", { name: "Users", exact: true }).click();

    const search = page.getByRole("textbox", { name: "Search users" });
    await search.fill("Akarin Ariyawat");
    await page.getByRole("link", { name: /Akarin Ariyawat/ }).click();
    await page.getByRole("button", { name: "Reviews", exact: true }).click();

    const reviewRows = page.locator(".user-detail-table tbody tr");
    const initialCount = await reviewRows.count();
    expect(initialCount).toBeGreaterThan(0);
    await expect(reviewRows.getByRole("button", { name: "Remove", exact: true })).toHaveCount(0);
    await expect(reviewRows).toHaveCount(initialCount);
  });

  test("hide changes a review status and can be reversed", async ({ page }) => {
    await signIn(page);
    await page.getByRole("button", { name: "Users", exact: true }).click();

    const search = page.getByRole("textbox", { name: "Search users" });
    await search.fill("Akarin Ariyawat");
    await page.getByRole("link", { name: /Akarin Ariyawat/ }).click();
    await page.getByRole("button", { name: "Reviews", exact: true }).click();

    const reviewRows = page.locator(".user-detail-table tbody tr");
    const firstReview = reviewRows.first();
    const reviewer = (await firstReview.locator("td").first().innerText()).trim();
    const previousStatus = (await firstReview.locator("td").nth(5).innerText()).trim();

    await firstReview.getByRole("button", { name: "Hide", exact: true }).click();
    await expect(firstReview.locator("td").nth(5)).toHaveText("Hidden");
    await expect(firstReview.getByRole("button", { name: "Unhide", exact: true })).toBeVisible();

    await page.reload();
    await page.getByRole("button", { name: "Reviews", exact: true }).click();
    const reviewFilters = page.getByRole("group", { name: "Review filters" });
    await reviewFilters.getByRole("button", { name: "Hidden", exact: true }).click();
    const hiddenReview = page.locator(".user-detail-table tbody tr").filter({ hasText: reviewer });
    await expect(hiddenReview).toHaveCount(1);
    await hiddenReview.getByRole("button", { name: "Unhide", exact: true }).click();

    await expect(page.locator(".user-detail-table tbody tr")).toHaveCount(0);
    await reviewFilters.getByRole("button", { name: "All", exact: true }).click();
    const restoredReview = page.locator(".user-detail-table tbody tr").filter({ hasText: reviewer });
    await expect(restoredReview).toHaveCount(1);
    await expect(restoredReview.locator("td").nth(5)).toHaveText(previousStatus);
  });

  test("admin can log out from the dashboard", async ({ page }) => {
    await signIn(page);

    await page.getByRole("button", { name: "Log out", exact: true }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole("heading", { name: "Sign in to admin", level: 1 }),
    ).toBeVisible();
  });

  test("invalid sign-in displays an accessible error", async ({ page }) => {
    await page.goto("/login");
    const email = page.getByLabel("University email");
    await expect(email).toBeFocused();
    await email.fill("not-an-email");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "valid Kasetsart University email" }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
});
