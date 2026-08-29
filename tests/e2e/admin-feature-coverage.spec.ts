import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page) {
  await page.goto("/login");
  const email = page.getByLabel("University email");
  const password = page.getByLabel("Password");
  await expect(email).toBeFocused();
  await page.getByRole("button", { name: "Show" }).click();
  await expect(password).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Hide" }).click();
  await expect(password).toHaveAttribute("type", "password");
  await email.fill("admin@ku.th");
  await password.fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Overview" }),
  ).toBeVisible();
}

async function openUserProfile(page: Page) {
  await signIn(page);
  await page.getByRole("button", { name: "Users", exact: true }).click();
  await page.getByRole("textbox", { name: "Search users" }).fill("Akarin Ariyawat");
  await page.getByRole("link", { name: /Akarin Ariyawat/ }).click();
  await expect(page).toHaveURL(/\/users\/68000000$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Akarin Ariyawat" }),
  ).toBeVisible();
}

test.describe("admin feature coverage", () => {
  test("dashboard opens the review queue and activity log", async ({ page }) => {
    await signIn(page);

    await expect(
      page.getByText("Showing 6 latest dispute/report records"),
    ).toBeVisible();
    await page.getByRole("button", { name: "Open review queue" }).click();
    await expect(page).toHaveURL(/view=disputes$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Disputes" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Activity log", exact: true }).click();
    await expect(page).toHaveURL(/view=activity$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Activity log" }),
    ).toBeVisible();
  });

  test("primary navigation opens every admin board", async ({ page }) => {
    await signIn(page);

    const boards = [
      { button: /^Quests/, heading: "Quests" },
      { button: /^Disputes/, heading: "Disputes" },
      { button: /^Reports/, heading: "Reports" },
      { button: /^Payouts/, heading: "Payouts" },
      { button: "Users", heading: "Users" },
      { button: "Activity log", heading: "Activity log" },
    ] as const;

    for (const board of boards) {
      await page.getByRole("button", { name: board.button, exact: true }).click();
      await expect(
        page.getByRole("heading", { level: 1, name: board.heading }),
      ).toBeVisible();
    }
  });

  test("resource search can be reset and table columns can be sorted", async ({
    page,
  }) => {
    await signIn(page);
    await page.getByRole("button", { name: /^Users/ }).click();

    const search = page.getByRole("textbox", { name: "Search users" });
    await search.fill("not-a-real-user");
    await expect(page.getByRole("heading", { name: "No matching records" })).toBeVisible();
    await page.getByRole("button", { name: "Reset view", exact: true }).click();
    await expect(page.getByRole("button", { name: "Open user 68000000" })).toBeVisible();

    await page.getByRole("button", { name: /^Quests/ }).click();
    const wageHeader = page.locator("th").filter({ hasText: "Wage" });
    await wageHeader.locator(".table-sort").click();
    await expect(wageHeader).toHaveAttribute("aria-sort", "ascending");
    await wageHeader.locator(".table-sort").click();
    await expect(wageHeader).toHaveAttribute("aria-sort", "descending");
  });

  test("theme selection persists and can return to the default theme", async ({
    page,
  }) => {
    await signIn(page);

    await page.getByRole("button", { name: /^Theme/ }).click();
    const themes = page.getByRole("group", { name: "Theme options" });
    await expect(page.getByText("Choose a theme")).toBeVisible();
    await themes.getByRole("button", { name: /^Dark/ }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.getByRole("button", { name: /Theme Dark/ }).click();
    await page
      .getByRole("group", { name: "Theme options" })
      .getByRole("button", { name: /^Grey-white/ })
      .click();
    await expect(page.locator("html")).not.toHaveAttribute("data-theme", "dark");
  });

  test("global search supports the keyboard shortcut and escape", async ({ page }) => {
    await signIn(page);

    await page.keyboard.press("Control+k");
    const searchDialog = page.getByRole("dialog", {
      name: "Search marketplace records",
    });
    await expect(searchDialog).toBeVisible();
    await searchDialog
      .getByRole("searchbox", { name: "Search marketplace records" })
      .fill("QST-12001");
    await expect(searchDialog.getByRole("button", { name: /QST-12001/ })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(searchDialog).toBeHidden();
  });

  test("dispute drawer previews evidence and links to the full case", async ({
    page,
  }) => {
    await signIn(page);
    await page.getByRole("button", { name: /^Disputes/ }).click();
    await page.getByRole("button", { name: "Open dispute DSP-5201" }).click();

    const drawer = page.getByRole("dialog", { name: /Record details/ });
    await expect(drawer).toContainText("Dispute overview");
    await expect(drawer.getByText("Require rework", { exact: true })).toBeVisible();
    await drawer.locator(".evidence-item").first().click();
    await expect(page.locator(".utility-preview")).toBeVisible();
    await page
      .locator(".utility-preview")
      .getByRole("button", { name: "Close preview" })
      .click();

    await drawer.getByRole("link", { name: "Full dispute detail" }).click();
    await expect(page).toHaveURL(/\/disputes\/DSP-5201$/);
    await expect(
      page.getByRole("heading", { level: 2, name: "Dispute overview" }),
    ).toBeVisible();
  });

  test("report details require a decision before closing", async ({ page }) => {
    await signIn(page);
    await page.getByRole("button", { name: /^Reports/ }).click();
    await page.getByRole("button", { name: "Open report RPT-8201" }).click();

    const drawer = page.getByRole("dialog", { name: /Record details/ });
    await drawer.getByRole("link", { name: "Review report" }).click();
    await expect(page).toHaveURL(/\/reports\/RPT-8201$/);
    await expect(
      page.getByRole("heading", { level: 2, name: "Report detail" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Close report", exact: true }).first().click();
    await expect(
      page.getByText("Choose Do nothing, Flag only, Temporary ban, or Permanent ban before closing.", {
        exact: true,
      }),
    ).toBeVisible();

    await page
      .getByRole("group", { name: "Report decision" })
      .getByRole("button", { name: /^Flag only/ })
      .click();
    await page.getByRole("button", { name: "Close report", exact: true }).first().click();
    const confirmation = page.getByRole("dialog", { name: "Close report" });
    await expect(confirmation).toBeVisible();
    await expect(
      confirmation.getByRole("button", { name: "Close report" }),
    ).toBeDisabled();
    await confirmation.getByRole("button", { name: "Cancel" }).click();
  });

  test("quest detail exposes the hirer profile and pending-change oversight", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/quests/QST-12001");
    await expect(
      page.getByRole("heading", { level: 2, name: "Quest description" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Open user profile" }).click();
    await expect(page).toHaveURL(/\/users\/\d+$/);

    await page.goto("/quests/QST-12005");
    await expect(
      page.getByRole("heading", { level: 2, name: "Pending hirer changes" }),
    ).toBeVisible();
    await expect(page.getByText("Admin oversight only", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Approve after consent" }),
    ).toHaveCount(0);
  });

  test("user profile tabs expose payout, report, and penalty history", async ({
    page,
  }) => {
    await openUserProfile(page);

    await page.getByRole("button", { name: "Payouts", exact: true }).click();
    await expect(
      page.getByRole("heading", { level: 2, name: "Payout history" }),
    ).toBeVisible();
    await expect(page.getByText("Total earned", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Reports", exact: true }).click();
    await expect(
      page.getByRole("heading", { level: 2, name: "Reports" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Penalty History", exact: true }).click();
    await expect(
      page.getByRole("heading", { level: 2, name: "Penalty History" }),
    ).toBeVisible();
  });

  test("user profile validates and saves an admin note", async ({ page }) => {
    await openUserProfile(page);

    const note = page.locator("[data-user-note-input]");
    await page.getByRole("button", { name: "Save note", exact: true }).click();
    await expect(
      page.getByText("Enter at least 4 characters for the admin note.", { exact: true }),
    ).toBeVisible();

    await note.fill("QA note saved");
    await page.getByRole("button", { name: "Save note", exact: true }).click();
    await expect(
      page.getByText("Admin note saved for Akarin Ariyawat.", { exact: true }),
    ).toBeVisible();
  });

  test("payout status tabs filter the payout board", async ({ page }) => {
    await signIn(page);
    await page.getByRole("button", { name: /^Payouts/ }).click();
    const approvalTab = page.getByRole("button", {
      name: "Needs approval",
      exact: true,
    });
    await approvalTab.click();
    await expect(approvalTab).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("tbody tr").first()).toContainText("Needs approval");

    const completedTab = page.getByRole("button", {
      name: "Completed",
      exact: true,
    });
    await completedTab.click();
    await expect(completedTab).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("tbody tr").first()).toContainText("Completed");
  });
});
