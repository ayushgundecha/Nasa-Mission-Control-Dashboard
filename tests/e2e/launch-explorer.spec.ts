import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (!["127.0.0.1", "localhost"].includes(url.hostname)) {
      throw new Error(
        `Unexpected external request during fixture test: ${route.request().url()}`,
      );
    }
    await route.continue();
  });
});

test("launch filters are URL-backed, restorable, and provide a useful empty state", async ({
  page,
}) => {
  await page.goto("/launches");
  await page.getByLabel("Search launches").fill("cancelled");
  await page.getByLabel("Status").selectOption("cancelled");
  await page.getByRole("button", { name: "Apply filters" }).click();

  await expect(page).toHaveURL(/query=cancelled/);
  await expect(page).toHaveURL(/status=cancelled/);
  await expect(page.getByRole("heading", { name: "1 launch" })).toBeVisible();
  await expect(page.getByLabel("Search launches")).toHaveValue("cancelled");
  await expect(page.getByLabel("Status")).toHaveValue("cancelled");

  await page.getByLabel("Search launches").fill("does-not-exist");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(
    page.getByText("No launches match this operating view"),
  ).toBeVisible();
  await expect(page.getByLabel("Search launches")).toHaveValue(
    "does-not-exist",
  );
});

test("launch dossier preserves discovery state and explains evidence boundaries", async ({
  page,
}) => {
  await page.goto("/launches?provider=Rocket+Lab&orbit=Low+Earth+Orbit");
  await page
    .getByRole("link", { name: /Dossier|Open mission dossier/i })
    .first()
    .click();

  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Owl Around The World",
  );
  await expect(page.getByText("Aggregator is not operator")).toBeVisible();
  await expect(
    page.getByText("Rocket Lab", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Baseline unavailable" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("link", { name: "Back to launch explorer" }),
  ).toHaveAttribute("href", /provider=Rocket\+Lab/);

  const externalLinks = page.locator('a[target="_blank"]');
  expect(await externalLinks.count()).toBeGreaterThan(0);
  for (const link of await externalLinks.all()) {
    await expect(link).toHaveAttribute("rel", /noreferrer|noopener/);
  }

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

for (const width of [320, 375, 768, 1024, 1440] as const) {
  test(`launch explorer has no page overflow at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width < 768 ? 812 : 900 });
    await page.goto("/launches");
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

test("launch discovery remains usable in mobile landscape and reduced motion", async ({
  page,
}) => {
  await page.setViewportSize({ width: 667, height: 375 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/launches");

  await expect(page.getByLabel("Search launches")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Apply filters" }),
  ).toBeVisible();
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  const transitionDuration = await page
    .getByRole("button", { name: "Apply filters" })
    .evaluate((button) => getComputedStyle(button).transitionDuration);

  expect(overflow).toBeLessThanOrEqual(1);
  expect(Number.parseFloat(transitionDuration)).toBeLessThanOrEqual(0.00001);
});

test("launch explorer tolerates 200 percent text scaling", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/launches");
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByLabel("Search launches")).toBeVisible();
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  const overflowDetails =
    overflow > 1
      ? await page.locator("body *").evaluateAll((elements) =>
          elements
            .map((element) => {
              const rect = element.getBoundingClientRect();
              return {
                element: `${element.tagName.toLowerCase()}.${element.className}`,
                right: Math.round(rect.right),
                width: Math.round(rect.width),
              };
            })
            .filter(
              (item) => item.right > document.documentElement.clientWidth + 1,
            )
            .slice(0, 10),
        )
      : [];
  expect(overflow, JSON.stringify(overflowDetails)).toBeLessThanOrEqual(1);
});

for (const width of [375, 1440] as const) {
  test(`launch dossier has no page overflow at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width < 768 ? 812 : 900 });
    await page.goto("/launches/electron-owl-around-the-world");
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
}
