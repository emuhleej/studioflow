import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Your studio, at a glance." })).toBeVisible();
});

test("fictional production workspace can be navigated end to end", async ({ page }) => {
  await page.getByRole("link", { name: /Projects/ }).first().click();
  await expect(page.getByRole("heading", { name: "Your production worlds." })).toBeVisible();

  await page.getByRole("link", { name: "Open project" }).click();
  await expect(page.getByRole("heading", { name: "Everyday Absurdity Studio" })).toBeVisible();

  await page.getByRole("link", { name: /Adulting Is Going Poorly/ }).click();
  await expect(page.getByRole("heading", { name: "Adulting Is Going Poorly" })).toBeVisible();

  await page.getByRole("link", { name: /The Refrigerator Takes Sides/ }).click();
  await expect(page.getByRole("heading", { name: "The Refrigerator Takes Sides" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Script" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Scenes & shots" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Prompts & generations" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Time & cost" })).toBeVisible();
});

test("layout has no horizontal overflow and primary controls remain touch sized", async ({ page }) => {
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    offenders: [...document.querySelectorAll<HTMLElement>("body *")]
      .map((element) => ({ tag: element.tagName, className: element.className, right: Math.round(element.getBoundingClientRect().right), width: Math.round(element.getBoundingClientRect().width) }))
      .filter((item) => item.right > document.documentElement.clientWidth + 1 || item.width > document.documentElement.clientWidth + 1)
      .slice(0, 8),
  }));
  expect(dimensions.scrollWidth, JSON.stringify(dimensions.offenders)).toBeLessThanOrEqual(dimensions.clientWidth + 1);

  const controls = page.locator("a.button:visible, button:visible, nav a:visible");
  const count = await controls.count();
  expect(count).toBeGreaterThan(0);
  for (let index = 0; index < Math.min(count, 12); index += 1) {
    const box = await controls.nth(index).boundingBox();
    if (box) expect(Math.round(Math.max(box.height, box.width))).toBeGreaterThanOrEqual(44);
  }
});

test("quick capture opens and saves a phone-friendly idea", async ({ page }) => {
  await page.getByRole("button", { name: "Quick capture" }).first().click();
  await expect(page.getByRole("dialog", { name: "Quick capture" })).toBeVisible();
  await page.getByLabel(/Idea, line, visual/).fill("A microwave starts a performance review during lunch.");
  await page.getByRole("button", { name: "Save capture" }).click();
  await expect(page.getByText("A microwave starts a performance review during lunch.")).toBeVisible();
});

test("prompt history creates a new immutable shot version", async ({ page }) => {
  await page.goto("/episodes/episode-fridge");
  await page.getByRole("tab", { name: "Prompts & generations" }).click();

  await page.getByLabel("Shot").selectOption("shot-1");
  await page.getByLabel("Prompt").fill("A new locked prompt-history test version.");
  await page.getByRole("button", { name: "Save prompt version" }).click();

  await expect(page.getByRole("status")).toHaveText("Saved Video version 3.");
  await expect(page.getByText("Video · v3")).toBeVisible();
  await expect(page.getByText("A new locked prompt-history test version.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Use as next draft" }).first()).toBeVisible();
});

test("manual generation history preserves complete provider provenance", async ({ page }) => {
  await page.goto("/episodes/episode-fridge");
  await page.getByRole("tab", { name: "Prompts & generations" }).click();
  await page.getByRole("button", { name: "Log generation" }).click();

  const dialog = page.getByRole("dialog", { name: "Log generation" });
  await dialog.getByLabel("Provider").fill("Manual Video");
  await dialog.getByLabel("Model").fill("cinema-v2");
  await dialog.getByLabel("Prompt version").selectOption("prompt-shot-one-v2");
  await expect(dialog.getByLabel("Shot")).toHaveValue("shot-1");
  await dialog.getByLabel("Cost (USD)").fill("1.25");
  await dialog.getByLabel("Duration (seconds)").fill("6.5");
  await dialog.getByLabel("Notes").fill("Manual provenance browser test.");
  await dialog.getByRole("button", { name: "Save generation" }).click();

  await expect(page.getByRole("status")).toHaveText("Saved generation from Manual Video · cinema-v2.");
  await expect(page.getByText("Manual Video · cinema-v2", { exact: true })).toBeVisible();
  await expect(page.getByText("6.5s")).toBeVisible();
  await expect(page.getByText("Manual provenance browser test.")).toBeVisible();
});

test("generation results and review decisions persist across reload", async ({ page }) => {
  await page.goto("/episodes/episode-fridge");
  await page.getByRole("tab", { name: "Prompts & generations" }).click();
  await page.getByRole("button", { name: "Manage results" }).click();

  const dialog = page.getByRole("dialog", { name: "Manage result media" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Result media").selectOption("asset-fridge-ref");
  await dialog.getByRole("button", { name: "Attach result" }).click();
  await expect(dialog.getByText("fridge-display-reference.webp")).toBeVisible();

  const viewport = page.viewportSize();
  const dialogBox = await dialog.boundingBox();
  expect(viewport).not.toBeNull();
  expect(dialogBox).not.toBeNull();
  expect(dialogBox!.x).toBeGreaterThanOrEqual(0);
  expect(dialogBox!.x + dialogBox!.width).toBeLessThanOrEqual(viewport!.width);
  expect(dialogBox!.y).toBeGreaterThanOrEqual(0);
  expect(dialogBox!.y + dialogBox!.height).toBeLessThanOrEqual(viewport!.height);

  await dialog.getByRole("button", { name: "Done" }).click();
  await page.getByRole("button", { name: "Reject Example Video cinema-v1" }).click();
  await expect(page.getByRole("status")).toHaveText("Generation marked rejected.");

  const reviewButtons = page.getByRole("group", { name: "Review Example Video cinema-v1" }).getByRole("button");
  for (let index = 0; index < await reviewButtons.count(); index += 1) {
    const box = await reviewButtons.nth(index).boundingBox();
    expect(Math.round(box?.height ?? 0)).toBeGreaterThanOrEqual(44);
  }

  await page.reload();
  await page.getByRole("tab", { name: "Prompts & generations" }).click();
  await expect(page.getByText("fridge-display-reference.webp")).toBeVisible();
  await expect(page.getByText("Rejected", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Media" }).click();
  await expect(page.getByText("fridge-display-reference.webp")).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
});

test("shot planning exposes labelled 44px ordering and edit controls", async ({ page }) => {
  await page.goto("/episodes/episode-fridge");
  await page.getByRole("tab", { name: "Scenes & shots" }).click();

  const controls = [
    page.getByRole("button", { name: "Move Cold open scene down" }),
    page.getByRole("button", { name: "Edit shot 1.1: Immediate argument" }),
    page.getByRole("button", { name: "Move Immediate argument shot up" }),
  ];

  for (const control of controls) {
    await expect(control).toBeVisible();
    const box = await control.boundingBox();
    expect(Math.round(box?.height ?? 0)).toBeGreaterThanOrEqual(44);
  }
});

test("media details support metadata, production links, and safe deletion confirmation", async ({ page }) => {
  await page.goto("/media");
  await expect(page.getByRole("heading", { name: "Every asset, with context." })).toBeVisible();

  await page.getByRole("button", { name: /maya-fridge-hook-v03\.mp4/ }).click();
  const detail = page.getByRole("dialog", { name: "maya-fridge-hook-v03.mp4" });
  await expect(detail.getByRole("button", { name: "Download" })).toBeVisible();
  await detail.getByLabel("Notes").fill("Verified lifecycle note.");
  await detail.getByRole("button", { name: "Save details" }).click();
  await expect(detail.getByRole("status")).toHaveText("Media details saved.");
  await detail.getByRole("button", { name: "Add link" }).click();
  await expect(detail.getByRole("status")).toHaveText("Production link added.");
  await detail.getByRole("button", { name: "Close dialog" }).click();

  await page.getByRole("button", { name: "Move to trash" }).first().click();
  await page.getByRole("button", { name: "Trash", exact: true }).click();
  await page.getByRole("button", { name: /Permanently delete maya-fridge-hook-v03\.mp4/ }).click();
  const confirmation = page.getByRole("dialog", { name: "Delete media permanently?" });
  await expect(confirmation).toContainText("cannot be undone");
  await confirmation.getByRole("button", { name: "Cancel" }).click();
  await expect(confirmation).not.toBeVisible();
});
