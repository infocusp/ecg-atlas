import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { cardiacCycle } from "../src/cardiacCycle.ts";
import { analyse } from "../src/ecg.ts";
import type { Signal } from "../src/ecg.ts";
const s: Signal = JSON.parse(
  fs.readFileSync("public/signals/normal.json", "utf8"),
);
test("ejection follows ventricular activation, then filling returns", () => {
  const rate = analyse(s).rate;
  const activation = cardiacCycle(s, 0.01, rate, "normal");
  assert.equal(activation.phase, "QRS");
  assert.equal(activation.ejection, 0);
  const pumping = cardiacCycle(s, 0.18, rate, "normal");
  assert(pumping.squeeze > 0.5);
  assert(pumping.ejection > 0.5);
  const filling = cardiacCycle(s, 0.5, rate, "normal");
  assert.equal(filling.ejection, 0);
  assert.equal(filling.filling, 1);
});
test("VF never displays effective pumping and AF has no coordinated atrial squeeze", () => {
  for (let t = 0; t < 20; t += 0.031) {
    const vf = cardiacCycle(s, t, 72, "vfib");
    assert.equal(vf.ejection, 0);
    assert.equal(vf.squeeze, 0);
    assert.equal(vf.travel, 0);
    assert.equal(cardiacCycle(s, t, 72, "afib").atrial, 0);
  }
});
test("blood travel is repeatable and progresses across recorded beat loops", () => {
  let previous = -Infinity;
  for (let t = 0; t < 30; t += 0.017) {
    const c = cardiacCycle(s, t, 72, "normal");
    assert(c.travel >= previous);
    assert.deepEqual(c, cardiacCycle(s, t, 72, "normal"));
    previous = c.travel;
  }
});
