import { expect, test, type Page } from "@playwright/test";

const adminEmail = process.env.QUEST_E2E_ADMIN_EMAIL;
const adminPassword = process.env.QUEST_E2E_ADMIN_PASSWORD;
const questId = process.env.QUEST_E2E_QUEST_ID ?? "00000000-0000-0000-0000-000000000705";
const questTitle = process.env.QUEST_E2E_QUEST_TITLE ?? "[Admin Demo] Failed Quest without a Dispute Case";

async function signIn(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("University email").fill(adminEmail ?? "");
  await page.getByLabel("Password").fill(adminPassword ?? "");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/overview$/);
}

test.describe("Quest route against the real Admin API", () => {
  test.skip(!adminEmail || !adminPassword, "Set QUEST_E2E_ADMIN_EMAIL and QUEST_E2E_ADMIN_PASSWORD to run the real API check.");

  test("loads the Quest board, full detail, and drawer from the real API", async ({ page }) => {
    await signIn(page);

    const apiResponse = await page.request.get(`http://localhost:5000/api/v1/admin/quests/${questId}`);
    expect(apiResponse.status()).toBe(200);
    const apiEnvelope = await apiResponse.json() as { success?: boolean; data?: { id?: string; title?: string } };
    expect(apiEnvelope.success).toBe(true);
    expect(apiEnvelope.data).toMatchObject({ id: questId, title: questTitle });

    await page.goto(`/quest/${questId}`);
    await expect(page.locator(".quest-detail-page h1")).toHaveText(questTitle);
    await expect(page.getByText("Full Quest record from the Admin API.", { exact: true })).toHaveCount(0);

    await page.goto("/quest");
    await page.getByPlaceholder("Search Quests…").fill(questTitle);
    const questRow = page.locator("tr.quest-row").filter({ hasText: questTitle });
    await expect(questRow).toBeVisible();
    await questRow.locator("a").first().click();

    const drawer = page.locator(".quest-drawer");
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText(questTitle);
  });
});
