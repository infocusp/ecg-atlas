import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { baseURL, launchOptions } from "./browser-config.mjs";
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
  for (const name of [
    "AFib",
    "PVC",
    "Atrial flutter",
    "Anterior STEMI",
    "ST depression",
    "1° AV block",
    "Mobitz I",
    "Mobitz II",
    "Complete block",
    "VT",
  ]) {
    await page.getByRole("button", { name, exact: true }).click();
    await page
      .locator(".public-actions")
      .getByRole("button", { name: "Follow heartbeat", exact: true })
      .click();
    await expect(page.locator(".teaching-panel")).toContainText(
      "Inside the heart",
    );
    await expect(page.locator(".teaching-panel")).toContainText(
      "What appears on the ECG",
    );
    await page
      .getByRole("button", { name: "Next moment · 0.1 s", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Play lesson", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Close heartbeat lesson" }).click();
  }
  await expect(page.locator("#rate")).toBeDisabled();
  assert.equal(await page.locator("#rate").inputValue(), "180");
  await page.getByRole("button", { name: "Mobitz I", exact: true }).click();
  await page.locator("#scrub").fill("2.65");
  await expect(page.locator(".renderer-mount")).toHaveAttribute(
    "data-cardiac-phase",
    "Blocked",
  );
  await expect(page.locator(".renderer-mount")).toHaveAttribute(
    "data-ejection",
    "0.000",
  );
  await page
    .getByRole("button", {
      name: "Why this ECG? · Follow heartbeat",
      exact: true,
    })
    .click();
  await page.waitForTimeout(150);
  await page.getByRole("button", { name: "Pause lesson", exact: true }).click();
  await page.locator(".signals-panel").evaluate((el) => {
    el.scrollTop = 0;
  });
  await page.screenshot({
    path: "test-results/ecg-teaching-desktop.png",
    fullPage: true,
  });
  await page.locator(".teaching-panel").scrollIntoViewIfNeeded();
  await page
    .locator(".teaching-panel")
    .screenshot({ path: "test-results/ecg-teaching-panel.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/ecg-teaching-mobile.png",
    fullPage: true,
  });
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: ten requested patterns, lesson content, stepping, fixed VT rate, blocked-beat mechanics, desktop/mobile, no runtime errors.",
  );
} finally {
  await browser.close();
}
