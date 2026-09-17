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
      page.getByRole("button", { name: "Start guided lesson", exact: true }),
    ).toBeVisible();
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `${width}px overflow`,
    );
  }
  await page
    .getByRole("button", { name: "Start guided lesson", exact: true })
    .click();
  await expect(page.getByLabel("Playback speed")).toHaveValue("0.2");
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
    .getByRole("button", { name: "Explain this ECG →", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Back to live ECG ↑", exact: true })
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
