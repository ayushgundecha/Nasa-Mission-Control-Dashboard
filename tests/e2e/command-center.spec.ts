import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const reviewWidths = [375, 768, 1024, 1440] as const;

test.beforeEach(async ({ page }) => {
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (!["127.0.0.1", "localhost"].includes(url.hostname)) {
      throw new Error(
        `Unexpected live-provider request during fixture test: ${route.request().url()}`,
      );
    }
    await route.continue();
  });
});

test("command center has semantic structure and no automatic accessibility violations", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "operating picture",
  );
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.locator('nav[aria-label="Primary"]:visible')).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

for (const width of reviewWidths) {
  test(`command center remains operable without horizontal overflow at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width < 768 ? 812 : 900 });
    await page.goto("/");

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);

    const undersizedTargets = await page
      .locator(
        "a:visible, button:visible, input:visible, select:visible, textarea:visible",
      )
      .evaluateAll((elements) =>
        elements
          .map((element) => {
            const rect = element.getBoundingClientRect();
            return {
              label:
                element.getAttribute("aria-label") ??
                element.textContent?.trim(),
              width: rect.width,
              height: rect.height,
            };
          })
          .filter((target) => target.width < 44 || target.height < 44),
      );
    expect(undersizedTargets).toEqual([]);

    if (width < 1024) {
      await expect(page.locator("aside")).toBeHidden();
    } else {
      await expect(page.locator("aside")).toBeVisible();
    }
  });
}

test("source evidence and experience preferences remain keyboard-accessible and persistent", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");

  const source = page
    .getByRole("button", { name: /Launch Library 2 · Fresh 15m/i })
    .first();
  await source.focus();
  await page.keyboard.press("Enter");
  await expect(source).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByText("Source details").first()).toBeVisible();

  await page.getByRole("button", { name: "Enable interface audio" }).click();
  await page.getByRole("button", { name: "Reduce interface motion" }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Mute interface audio" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "Use system motion preference" }),
  ).toHaveAttribute("aria-pressed", "true");
});
