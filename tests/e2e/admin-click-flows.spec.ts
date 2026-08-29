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

    const draftTab = page.getByRole("button", { name: "Draft", exact: true });
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
    await expect(drawer).toContainText("Needs approval");
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
    await drawer.getByRole("link", { name: "Full quest detail" }).click();

    await expect(page).toHaveURL(/\/quests\/QST-12001$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
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
    await questLink.click();

    await expect(page).toHaveURL(/\/quests\/QST-\d+$/);
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
