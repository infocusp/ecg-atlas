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
  await p.getByRole("button", { name: "Follow a heartbeat · 0.2×" }).click();
  assert.equal(await p.getByLabel("Playback speed").inputValue(), "0.2");
  await p.waitForTimeout(500);
  await p.screenshot({ path: "test-results/ecg-flow.png", fullPage: true });
  await p.getByRole("button", { name: "Pause simulation" }).click();
  await p.locator("#scrub").fill("0.18");
  await p.waitForTimeout(200);
  const first = await p
    .locator(".renderer-mount")
    .getAttribute("data-ejection");
  await p.waitForTimeout(150);
  assert.equal(
    await p.locator(".renderer-mount").getAttribute("data-ejection"),
    first,
  );
  await p.getByRole("button", { name: "VFib", exact: true }).click();
  await p.getByText("No effective forward pumping", { exact: true }).waitFor();
  await expect(p.locator(".renderer-mount")).toHaveAttribute(
    "data-ejection",
    "0.000",
  );
  await p.getByRole("button", { name: "Blood flow on", exact: true }).click();
  await expect(p.locator(".renderer-mount")).toHaveAttribute(
    "data-flow-enabled",
    "false",
  );
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
    "PASS: slow focused heartbeat, pause/scrub synchronization, VF no pumping, flow toggle, mobile layout.",
  );
} finally {
  await b.close();
}
