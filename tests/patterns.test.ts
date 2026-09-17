import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { patterns, patternEvents, patternState } from "../src/patterns.ts";
import { conditions, preset, leadsFor, sample } from "../src/ecg.ts";
import type { Signal, Condition } from "../src/ecg.ts";
import { cardiacCycle } from "../src/cardiacCycle.ts";
import { lessons } from "../src/Teaching.tsx";
const s: Signal = JSON.parse(
  fs.readFileSync("public/signals/normal.json", "utf8"),
);
test("every condition has a causal lesson and medical source", () => {
  for (const id of Object.keys(conditions) as Condition[]) {
    assert(
      lessons[id].heart &&
        lessons[id].ecg &&
        lessons[id].pump &&
        lessons[id].source.startsWith("https://"),
    );
  }
});
test("block schedules preserve prolonged, progressive, and fixed PR intervals", () => {
  const pr = (id: Condition) =>
    patterns[id]!.atria.map((a) =>
      a.ventricular === undefined
        ? null
        : Math.round((a.ventricular - a.at) * 1000),
    );
  assert.deepEqual(pr("firstdegree"), [280]);
  assert.deepEqual(pr("mobitz1"), [160, 230, 300, null]);
  assert.deepEqual(pr("mobitz2"), [180, 180, null, 180]);
  assert.equal(patterns.mobitz1!.beats.length, 3);
  assert.equal(patterns.mobitz2!.beats.length, 3);
});
test("blocked impulses produce no ventricular squeeze or ejection", () => {
  for (const [id, t] of [
    ["mobitz1", 2.65],
    ["mobitz2", 1.85],
  ] as [Condition, number][]) {
    assert(patternState(id, t).blocked);
    const c = cardiacCycle(s, t, 75, id);
    assert.equal(c.squeeze, 0);
    assert.equal(c.ejection, 0);
    assert.equal(c.phase, "Blocked");
  }
});
test("complete block uses independent clocks; flutter conducts 2:1; PVC is early then pauses", () => {
  assert.equal(patterns.complete!.atria.length, 15);
  assert.equal(patterns.complete!.beats.length, 8);
  assert(patterns.complete!.atria.every((a) => a.ventricular === undefined));
  assert.equal(
    patterns.flutter!.atria.length / patterns.flutter!.beats.length,
    2,
  );
  const beats = patterns.pvc!.beats;
  assert(beats[2].at - beats[1].at < 0.8);
  assert(beats[3].at - beats[2].at > 0.8);
  assert(Math.abs(beats[3].at - beats[1].at - 1.6) < 1e-9);
  assert.equal(patterns.vt!.rate, 180);
});
test("new waveforms are finite, repeatable and preserve lead algebra and cancellation", () => {
  const e = preset("12-lead"),
    leads = leadsFor(e, true);
  const coincident = [
    { id: "RA", position: e[0].position },
    { id: "LA", position: e[0].position },
  ];
  for (const id of [...Object.keys(patterns), "ischemia"] as Condition[]) {
    for (let t = -0.1; t < 5; t += 0.071) {
      const [I, II, III] = leads
        .slice(0, 3)
        .map((l) => sample(s, e, l, t, id, 72));
      assert(Number.isFinite(I + II + III), id);
      assert(Math.abs(II - I - III) < 1e-10, id);
      assert.equal(sample(s, coincident, leads[0], t, id, 72), 0);
      if (patterns[id])
        assert(
          Math.abs(
            I - sample(s, e, leads[0], t + patterns[id]!.duration, id, 72),
          ) < 1e-9,
          id,
        );
    }
  }
});
test("event schedules work across playback and loop boundaries", () => {
  const events = patternEvents("firstdegree", -0.5, 1.5);
  assert(events.beats.some((b) => b.at < 0));
  assert(events.beats.some((b) => b.at > 1));
  assert.equal(cardiacCycle(s, 0.33, 75, "firstdegree").ejection, 0);
  assert(cardiacCycle(s, 0.5, 75, "firstdegree").ejection > 0);
});
test("new flow timing stays continuous and monotonic across event-loop boundaries", () => {
  for (const id of Object.keys(patterns) as Condition[]) {
    let previous = cardiacCycle(s, 0, 72, id).travel;
    for (let t = 0.01; t < 15; t += 0.01) {
      const current = cardiacCycle(s, t, 72, id).travel;
      assert(current >= previous - 1e-12, id);
      assert(current - previous < 0.01, id);
      previous = current;
    }
  }
});
