import { chromium } from "@playwright/test";
import { baseURL, launchOptions } from "./browser-config.mjs";
import assert from "node:assert/strict";
const browser = await chromium.launch(launchOptions);
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  await page.addInitScript(() => {
    window.traceFrames = [];
    const clear = CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect = function (...args) {
      if (this.canvas.classList.contains("trace-canvas"))
        window.traceFrames.push(performance.now());
      return clear.apply(this, args);
    };
  });
  await page.goto(baseURL);
  await page.locator(".loading").waitFor({ state: "hidden", timeout: 45000 });
  await page.waitForTimeout(1000);
  await page.evaluate(() => (window.traceFrames = []));
  await page.waitForTimeout(3000);
  const timings = await page.evaluate(() => {
    const a = window.traceFrames;
    const d = a
      .slice(1)
      .map((v, i) => v - a[i])
      .sort((a, b) => a - b);
    return {
      frames: a.length,
      median: d[Math.floor(d.length / 2)],
      p95: d[Math.floor(d.length * 0.95)],
    };
  });
  assert(timings.median < 40, JSON.stringify(timings));
  await page.getByRole("button", { name: "Pause simulation" }).click();
  await page.waitForTimeout(200);
  const c = page.locator(".trace-canvas");
  const one = await c.evaluate((c) => c.toDataURL());
  await page.waitForTimeout(250);
  const two = await c.evaluate((c) => c.toDataURL());
  assert.equal(one, two, "Paused plot must be pixel-stable");
  await page.locator("#setup").selectOption("12-lead");
  await page.getByRole("button", { name: "Play simulation" }).click();
  await page.waitForTimeout(700);
  await page.evaluate(() => (window.traceFrames = []));
  await page.waitForTimeout(3000);
  const multi = await page.evaluate(() => {
    const a = window.traceFrames,
      d = a
        .slice(1)
        .map((v, i) => v - a[i])
        .sort((a, b) => a - b);
    return {
      frames: a.length,
      median: d[Math.floor(d.length / 2)],
      p95: d[Math.floor(d.length * 0.95)],
    };
  });
  assert(multi.median < 40, JSON.stringify(multi));
  const teaching = {};
  for (const name of ["Mobitz I", "Atrial flutter", "VT", "ST depression"]) {
    await page.getByRole("button", { name, exact: true }).click();
    await page.waitForTimeout(500);
    await page.evaluate(() => (window.traceFrames = []));
    await page.waitForTimeout(2000);
    const median = await page.evaluate(() => {
      const a = window.traceFrames;
      const intervals = a
        .slice(1)
        .map((value, i) => value - a[i])
        .sort((a, b) => a - b);
      return intervals[Math.floor(intervals.length / 2)];
    });
    teaching[name] = median;
    assert(median < 40, `${name}: median frame ${median} ms`);
  }
  console.log(
    JSON.stringify({
      single: timings,
      twelveLeads: multi,
      teachingMedianMs: teaching,
      paused: "pixel-stable",
    }),
  );
} finally {
  await browser.close();
}
