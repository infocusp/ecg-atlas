import { chromium } from "@playwright/test";
import { baseURL, launchOptions } from "./browser-config.mjs";
import assert from "node:assert/strict";
const browser = await chromium.launch(launchOptions);
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(baseURL);
  await page.locator(".loading").waitFor({ state: "hidden", timeout: 45000 });
  await page.locator(".signal-loading").waitFor({ state: "hidden" });
  await page.screenshot({
    path: "test-results/ecg-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Save reference", exact: true })
    .click();
  await page
    .getByRole("button", { name: /Try both at the same location/ })
    .click();
  await page.getByText("Same potential. Almost no difference.").waitFor();
  await page.locator("#setup").selectOption("12-lead");
  await page.getByText("12 leads. Different perspectives.").waitFor();
  await page
    .getByRole("button", { name: "Anterior STEMI", exact: true })
    .click();
  await page.screenshot({
    path: "test-results/ecg-12lead.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "AFib", exact: true }).click();
  assert(
    await page.getByRole("button", { name: "AFib", exact: true }).isVisible(),
  );
  await page.getByRole("button", { name: "VFib", exact: true }).click();
  assert(await page.locator("#rate").isDisabled());
  await page.getByRole("button", { name: /Signal library/ }).click();
  await page
    .getByRole("button", { name: /Recorded ventricular fibrillation/ })
    .click();
  await page
    .getByText(
      "Single monitor channel, not a documented standard 12-lead configuration. Spatial views are illustrative extrapolations.",
    )
    .waitFor();
  await page.getByRole("button", { name: "Explorer", exact: true }).click();
  await page.getByRole("button", { name: "Reset explorer" }).click();
  await page.locator(".loading").waitFor({ state: "hidden", timeout: 45000 });
  const box = await page.locator(".anatomy-canvas canvas").boundingBox();
  await page
    .getByRole("button", { name: "Place LA on body", exact: true })
    .click();
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.4);
  await page
    .getByText("LA moved. All affected leads have been recalculated.")
    .waitFor();
  await page.getByRole("button", { name: "Reset explorer" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: "test-results/ecg-mobile.png",
    fullPage: true,
  });
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: loaded anatomy, reference, cancellation, 12 leads, condition changes, recorded library, free placement, mobile overflow; no runtime errors.",
  );
} finally {
  await browser.close();
}
