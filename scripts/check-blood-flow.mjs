import { chromium, expect } from "@playwright/test";
import { baseURL, launchOptions } from "./browser-config.mjs";
import assert from "node:assert/strict";
const b = await chromium.launch(launchOptions);
try {
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(baseURL);
  await p.locator(".loading").waitFor({ state: "hidden", timeout: 45000 });
  await expect(p.locator(".teaching-panel")).toHaveCount(0);
  await expect(p.locator(".renderer-mount")).toHaveAttribute(
    "data-flow-enabled",
    "false",
  );
  const open = () =>
    p
      .locator(".public-actions")
      .getByRole("button", { name: "Follow heartbeat", exact: true })
      .click();
  await open();
  await expect(p.getByLabel("Lesson speed")).toHaveValue("0.2");
  await p
    .getByRole("button", { name: "Blood circulation", exact: true })
    .click();
  for (const text of [
    "Body → right heart",
    "Right heart → lungs",
    "Lungs → left heart",
    "Left heart → body",
  ]) {
    await expect(p.getByText(text, { exact: true })).toBeVisible();
  }
  await p.getByRole("button", { name: "Pause lesson", exact: true }).click();
  const particles = () => p.locator(".circulation-lesson svg").innerHTML();
  let previous = await particles();
  await expect
    .poll(async () => {
      await p.waitForTimeout(250);
      const current = await particles();
      const stable = current === previous;
      previous = current;
      return stable;
    })
    .toBe(true);
  const paused = await particles();
  await p.waitForTimeout(250);
  assert.equal(await particles(), paused);
  await p.screenshot({ path: "test-results/ecg-flow.png", fullPage: true });
  await p.keyboard.press("Escape");
  await expect(p.getByRole("dialog")).toHaveCount(0);
  await p.getByRole("button", { name: "VFib", exact: true }).click();
  await open();
  await p
    .getByRole("button", { name: "Blood circulation", exact: true })
    .click();
  await expect(
    p.getByText("VF: no effective forward pumping is shown.", { exact: true }),
  ).toBeVisible();
  await expect(p.locator(".circulation-lesson circle")).toHaveCount(0);
  await p.setViewportSize({ width: 390, height: 844 });
  await p.screenshot({
    path: "test-results/ecg-flow-mobile.png",
    fullPage: true,
  });
  assert(
    await p.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: quiet default, complete circulation, paused particles, VF no pumping, modal dismissal and mobile layout.",
  );
} finally {
  await b.close();
}
