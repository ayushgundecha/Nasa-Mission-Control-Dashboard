import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const reviewWidths = [320, 375, 768, 1024, 1440] as const;

test.beforeEach(async ({ page }) => {
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (!["127.0.0.1", "localhost"].includes(url.hostname)) {
      throw new Error(`Unexpected external request: ${route.request().url()}`);
    }
    await route.continue();
  });
});

test("orbit watch is accessible and synchronizes keyboard selection and time", async ({
  page,
}) => {
  await page.goto("/environment");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "space around a mission",
  );
  await expect(
    page.getByRole("img", {
      name: /calculated orbital object ground positions/i,
    }),
  ).toBeVisible();

  const hubble = page.getByRole("button", { name: /Hubble Space Telescope/i });
  await hubble.focus();
  await hubble.press("Enter");
  await expect(
    page.getByRole("complementary", { name: "Selected orbital object" }),
  ).toContainText("HUBBLE SPACE TELESCOPE");

  const scrubber = page.getByRole("slider", { name: "Time offset" });
  await scrubber.focus();
  await scrubber.press("ArrowRight");
  await expect(page.locator('output[for="orbit-time"]')).toHaveText("+1 h");
  await page.getByRole("button", { name: "Reset time" }).click();
  await expect(page.locator('output[for="orbit-time"]')).toHaveText("0 h");

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("3D is lazy, operable with visible controls, and preserves a list equivalent", async ({
  page,
}) => {
  await page.goto("/environment");
  expect(await page.locator("canvas").count()).toBe(0);
  const scriptsBefore = await page.evaluate(
    () =>
      performance
        .getEntriesByType("resource")
        .filter((entry) => entry.name.endsWith(".js")).length,
  );
  await page.getByRole("button", { name: "3d" }).click();
  await expect(page.locator("canvas")).toBeVisible();
  const scriptsAfter = await page.evaluate(
    () =>
      performance
        .getEntriesByType("resource")
        .filter((entry) => entry.name.endsWith(".js")).length,
  );
  expect(scriptsAfter).toBeGreaterThan(scriptsBefore);
  await page.getByRole("button", { name: "Zoom in" }).click();
  await page.getByRole("button", { name: "Zoom out" }).click();
  await page.getByRole("button", { name: "Reset view" }).click();
  await page.getByRole("button", { name: "Pause" }).click();
  await expect(page.getByRole("button", { name: "Resume" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(
    page.getByRole("heading", { name: "Synchronized object list" }),
  ).toBeVisible();
});

test("the initial 2D route stays responsive under representative 4x CPU throttling", async ({
  page,
}) => {
  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.goto("/environment");
  await expect(
    page.getByRole("img", {
      name: /calculated orbital object ground positions/i,
    }),
  ).toBeVisible();
  const timing = await page.evaluate(async () => {
    const navigation = performance.getEntriesByType(
      "navigation",
    )[0] as PerformanceNavigationTiming;
    const started = performance.now();
    await new Promise((resolve) => setTimeout(resolve, 100));
    return {
      domInteractive: navigation.domInteractive,
      timerDelay: performance.now() - started - 100,
    };
  });
  expect(timing.domInteractive).toBeLessThan(5_000);
  expect(timing.timerDelay).toBeLessThan(500);
  await session.send("Emulation.setCPUThrottlingRate", { rate: 1 });
});

test("WebGL failure returns to the complete 2D experience", async ({
  page,
}) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => null;
  });
  await page.goto("/environment");
  await page.getByRole("button", { name: "3d" }).click();
  await expect(page.getByText(/3D rendering is unavailable/i)).toBeVisible();
  await expect(
    page.getByRole("img", {
      name: /calculated orbital object ground positions/i,
    }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "3d" })).toBeDisabled();
});

test("WebGL context loss is recoverable and touch input does not block the fallback", async ({
  page,
}) => {
  await page.goto("/environment");
  await page.getByRole("button", { name: "3d" }).click();
  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();
  await canvas.dispatchEvent("pointerdown", {
    pointerId: 7,
    pointerType: "touch",
    clientX: 120,
    clientY: 120,
    bubbles: true,
  });
  await canvas.dispatchEvent("pointerup", {
    pointerId: 7,
    pointerType: "touch",
    clientX: 140,
    clientY: 120,
    bubbles: true,
  });
  await canvas.dispatchEvent("webglcontextlost");
  await expect(page.getByText(/3D rendering is unavailable/i)).toBeVisible();
  await expect(
    page.getByRole("img", {
      name: /calculated orbital object ground positions/i,
    }),
  ).toBeVisible();
});

for (const width of reviewWidths) {
  test(`environment has no page overflow or undersized controls at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width < 768 ? 812 : 900 });
    await page.goto("/environment");
    const overflowingElements = await page
      .locator("body *")
      .evaluateAll((elements) =>
        elements.flatMap((element) => {
          const rectangle = element.getBoundingClientRect();
          return rectangle.right > document.documentElement.clientWidth + 1
            ? [
                {
                  element: element.tagName,
                  className: element.getAttribute("class"),
                  right: Math.round(rectangle.right),
                },
              ]
            : [];
        }),
      );
    expect(overflowingElements).toEqual([]);
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    const undersized = await page
      .locator("a:visible, button:visible, input:visible")
      .evaluateAll((elements) =>
        elements
          .map((element) => {
            const rectangle = element.getBoundingClientRect();
            return {
              label:
                element.getAttribute("aria-label") ??
                element.textContent?.trim(),
              width: rectangle.width,
              height: rectangle.height,
            };
          })
          .filter((target) => target.width < 44 || target.height < 44),
      );
    expect(undersized).toEqual([]);
  });
}

test("reduced motion keeps the 3D alternative available without auto-motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/environment");
  await page.getByRole("button", { name: "3d" }).click();
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
});

test("object filters and selected object restore from the URL", async ({
  page,
}) => {
  await page.goto("/objects?category=navigation&selected=41328");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Orbital object explorer",
  );
  await expect(
    page.locator('nav[aria-label="Primary"]:visible').getByRole("link", {
      name: "Environment",
    }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.getByLabel("Category")).toHaveValue("navigation");
  await expect(
    page.getByRole("complementary", { name: "Selected orbital object" }),
  ).toContainText("GPS BIIF-12");

  await page.getByRole("button", { name: /GPS BIIR-2/i }).click();
  await expect(page).toHaveURL(/selected=24876/);
  await page.goBack();
  await expect(
    page.getByRole("complementary", { name: "Selected orbital object" }),
  ).toContainText("GPS BIIF-12");
  await page.getByRole("button", { name: /GPS BIIR-2/i }).click();
  await page.reload();
  await expect(
    page.getByRole("complementary", { name: "Selected orbital object" }),
  ).toContainText("GPS BIIR-2");
  await expect(page.getByText("Velocity · calculated")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "CelesTrak OMM" }),
  ).toHaveAttribute("href", /celestrak\.org/);
});

test("object explorer explains an empty filter and offers recovery", async ({
  page,
}) => {
  await page.goto("/objects?query=definitely-not-an-orbital-object");
  await expect(
    page.getByRole("heading", { name: "No objects match these filters" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Clear filters" }).last(),
  ).toBeVisible();
  expect(await new AxeBuilder({ page }).analyze()).toMatchObject({
    violations: [],
  });
});

test("approach feed sorts and filters while preserving unknown scientific values", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto("/approaches?sort=distance&size=all&distance=10");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "without the alarmism",
  );
  await expect(page.getByRole("status")).toHaveText("Sorted by distance");
  const rows = page
    .getByRole("region", { name: "Near-Earth approach data table" })
    .locator("tbody tr");
  await expect(rows).toHaveCount(2);
  await expect(rows.first()).toContainText("AstraOps fixture object A");
  await expect(rows.last()).toContainText("Unknown—not supplied");
  await expect(
    page.getByText(
      /A close approach is a distance measurement, not an impact prediction/i,
    ),
  ).toBeVisible();

  await page.getByLabel("Size knowledge").selectOption("unknown");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page).toHaveURL(/size=unknown/);
  await expect(
    page
      .getByRole("region", { name: "Near-Earth approach data table" })
      .locator("tbody tr"),
  ).toHaveCount(1);
  await expect(
    page.getByRole("cell", { name: "Unknown—not supplied" }),
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("approach cards remain readable at mobile width and 200 percent text zoom", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/approaches");
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  const feed = page.getByRole("region", { name: "Approach feed" });
  await expect(feed.locator("ul")).toBeVisible();
  const overflowingContent = await page
    .locator("body *")
    .evaluateAll(
      (elements) =>
        elements.filter(
          (element) =>
            getComputedStyle(element).display !== "none" &&
            element.getBoundingClientRect().right >
              document.documentElement.clientWidth + 1,
        ).length,
    );
  expect(overflowingContent).toBe(0);
  await expect(
    feed.locator("ul").getByText("Unknown—not supplied"),
  ).toBeVisible();
});
