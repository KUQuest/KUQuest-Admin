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
    const reporter = dialog.getByLabel("Reporting user");
    const category = dialog.getByLabel("Report type");
    const details = dialog.getByLabel("What happened?");
    const evidence = dialog.getByLabel("Evidence file (optional)");
    const reporterValue = await reporter.locator("option").evaluateAll((options) =>
      options.find((option) => option.getAttribute("value"))?.getAttribute("value") || null,
    );
    if (!reporterValue) throw new Error("Report form has no reporter options");
    await reporter.selectOption({ value: reporterValue });
    await category.selectOption({ label: "Fraud or payment issue" });
    await details.fill("The submitted activity does not match the evidence provided.");
    await evidence.setInputFiles({
      name: "report-evidence.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("report evidence"),
    });

    await expect(reporter).toHaveValue(/.+/);
    await expect(category).toHaveValue("Fraud or payment issue");
    await expect(details).toHaveValue(
      "The submitted activity does not match the evidence provided.",
    );
    await expect(dialog.getByText("report-evidence.txt", { exact: true })).toBeVisible();
    await expectResponsiveInput(page, reporter);
    await expectResponsiveInput(page, category);
    await expectResponsiveInput(page, details);
    await expectResponsiveInput(page, dialog.locator('label[for="report-attachment"]'));
    await dialog.getByRole("button", { name: "Close report form" }).click();
  });

  test("penalty radios, reason, and note accept input on mobile", async ({
    page,
  }) => {
    await page.setViewportSize(mobileViewport);
    await signIn(page);
    const drawer = await openUserDrawer(page);
    await drawer.getByRole("button", { name: "Apply penalty" }).click();

    const dialog = page.getByRole("dialog", {
      name: "Apply penalty for Akarin Ariyawat",
    });
    const radios = dialog.getByRole("radio");
    await expect(radios).toHaveCount(3);
    for (const radio of await radios.all()) {
      await radio.check();
      await expect(radio).toBeChecked();
    }

    const reason = dialog.getByRole("textbox", { name: "Reason for this penalty" });
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

  test("lift-ban reason and optional note accept input on mobile", async ({
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
    await page.getByRole("button", { name: "Lift ban" }).click();

    const dialog = page.getByRole("dialog", { name: "Lift ban" });
    const reason = dialog.locator("#confirm-reason");
    const note = dialog.locator("#moderation-lift-note");
    await reason.fill("The appeal review confirmed compliance.");
    await note.fill("Lifted after manual review.");
    await expect(reason).toHaveValue("The appeal review confirmed compliance.");
    await expect(note).toHaveValue("Lifted after manual review.");
    await expectResponsiveInput(page, reason);
    await expectResponsiveInput(page, note);
    await dialog.getByRole("button", { name: "Cancel" }).click();
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
    await page.getByRole("button", { name: /^Flag only/ }).click();
    await page
      .locator(".full-record-actions")
      .getByRole("button", { name: "Close report", exact: true })
      .click();

    const dialog = page.getByRole("dialog", { name: "Close report" });
    const reason = dialog.getByLabel("Reason for this decision");
    await reason.fill("The account action was reviewed and recorded.");
    await expect(reason).toHaveValue("The account action was reviewed and recorded.");
    await expectResponsiveInput(page, reason);
    await dialog.getByRole("button", { name: "Cancel" }).click();
  });

  test("dispute chat message and file inputs accept input on mobile", async ({
    page,
  }) => {
    await page.setViewportSize(mobileViewport);
    await signIn(page);
    await page.goto("/disputes/DSP-5201");

    for (const role of ["hirer", "worker"]) {
      await page.getByRole("button", { name: `Chat with ${role}` }).click();
      const dialog = page.getByRole("dialog", { name: `Chat with ${role}` });
      const message = dialog.getByRole("textbox", { name: `Message ${role}` });
      await message.fill(`Message for the ${role} record.`);
      await dialog.getByLabel("Attach file").setInputFiles({
        name: `${role}-evidence.txt`,
        mimeType: "text/plain",
        buffer: Buffer.from(`${role} evidence`),
      });
      await expect(message).toHaveValue(`Message for the ${role} record.`);
      await expect(dialog.getByText(`${role}-evidence.txt`, { exact: true })).toBeVisible();
      await expectResponsiveInput(page, message);
      await dialog.getByRole("button", { name: "Close chat" }).click();
    }
  });

  test("report chat message and file inputs accept input on mobile", async ({
    page,
  }) => {
    await page.setViewportSize(mobileViewport);
    await signIn(page);
    await page.goto("/reports/RPT-8201");

    for (const participant of ["reporter", "reported user"]) {
      await page.getByRole("button", { name: `Chat with ${participant}` }).click();
      const dialog = page.getByRole("dialog", { name: /Chat with/ });
      const message = dialog.getByRole("textbox", { name: /^Message / });
      await message.fill(`Message for the ${participant}.`);
      await dialog.getByLabel("Attach file").setInputFiles({
        name: `${participant.replaceAll(" ", "-")}-evidence.txt`,
        mimeType: "text/plain",
        buffer: Buffer.from(`${participant} evidence`),
      });
      await expect(message).toHaveValue(`Message for the ${participant}.`);
      await expect(
        dialog.getByText(`${participant.replaceAll(" ", "-")}-evidence.txt`, {
          exact: true,
        }),
      ).toBeVisible();
      await expectResponsiveInput(page, message);
      await dialog.getByRole("button", { name: "Close chat" }).click();
    }
  });
});
