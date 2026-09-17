import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { baseURL, launchOptions } from "./browser-config.mjs";
const browser = await chromium.launch(launchOptions);
try {
  const page = await browser.newPage();
  await page.goto(baseURL);
  await page.locator(".loading").waitFor({ state: "hidden", timeout: 60000 });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(
      page.getByText(
        "Educational simulation · Not for diagnosis · Not clinically validated",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      page
        .locator(".public-actions")
        .getByRole("button", { name: "Follow heartbeat", exact: true }),
    ).toBeVisible();
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `${width}px overflow`,
    );
  }
  const ecg = await page.locator(".signals-panel").boundingBox();
  const anatomy = await page.locator(".main-surface").boundingBox();
  assert(ecg.width > anatomy.width, "ECG should have more space than anatomy");
  await expect(page.locator(".teaching-panel")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Place electrodes", exact: true }),
  ).toBeVisible();
  await page
    .locator(".public-actions")
    .getByRole("button", { name: "Follow heartbeat", exact: true })
    .click();
  await expect(page.getByLabel("Lesson speed")).toHaveValue("0.2");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page
      .locator(".public-actions")
      .getByRole("button", { name: "Follow heartbeat", exact: true }),
  ).toBeFocused();
  await expect(page.getByLabel("Playback speed")).toHaveValue("1");
  await page
    .getByRole("button", { name: "Credits & limitations", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Plethscape");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Mobitz I", exact: true }).click();
  await expect(page.locator(".signal-provenance")).toContainText(
    "Teaching reconstruction",
  );
  await page
    .getByRole("button", {
      name: "Why this ECG? · Follow heartbeat",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Close heartbeat lesson", exact: true })
    .click();
  await page.screenshot({
    path: "test-results/ecg-public-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/ecg-public-mobile.png",
    fullPage: true,
  });
  const reduced = await browser.newPage({ reducedMotion: "reduce" });
  await reduced.goto(baseURL);
  await expect(
    reduced.getByRole("button", { name: "Play simulation", exact: true }),
  ).toBeVisible();
  console.log(
    "PASS: notice and entry controls at 320/390/768/1440px, credits, provenance, lesson navigation, reduced-motion pause.",
  );
} finally {
  await browser.close();
}
