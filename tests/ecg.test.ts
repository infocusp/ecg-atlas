import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  preset,
  leadsFor,
  sample,
  sourceSample,
  spatialWeights,
  analyse,
  injuryVisibility,
} from "../src/ecg.ts";
import type { Signal, Point } from "../src/ecg.ts";
const normal: Signal = JSON.parse(
  fs.readFileSync("public/signals/normal.json", "utf8"),
);
test("ten electrodes produce twelve standard leads; RL creates no signal", () => {
  const e = preset("12-lead"),
    leads = leadsFor(e);
  assert.equal(e.length, 10);
  assert.equal(leads.length, 12);
  assert(!leads.some((l) => l.terms.some(([id]) => id === "RL")));
  assert.equal(leadsFor(preset("3-electrode")).length, 3);
});
test("custom electrodes and incomplete chest setups still provide explicitly named views", () => {
  const e = preset("2-electrode");
  e.push({ id: "E1", position: [0.1, 2.3, 0.2] });
  assert(leadsFor(e).some((l) => l.id === "E1 − RA"));
  const chest = preset("12-lead").filter((e) => e.id !== "RA");
  const leads = leadsFor(chest);
  assert(!leads.some((l) => l.id === "V1"));
  assert(leads.some((l) => l.id === "V1 − LA"));
});
test("coincident electrodes cancel exactly under every spatial condition", () => {
  for (const condition of ["normal", "anterior", "inferior"] as const) {
    const e = preset("2-electrode");
    e[1].position = [...e[0].position];
    for (let t = 0; t < 5; t += 0.013)
      assert.equal(sample(normal, e, leadsFor(e)[0], t, condition, 72), 0);
  }
});
test("swapping electrodes reverses polarity", () => {
  const e = preset("2-electrode"),
    swapped = [
      { ...e[0], position: e[1].position },
      { ...e[1], position: e[0].position },
    ],
    l = leadsFor(e)[0];
  for (let t = 0; t < 5; t += 0.013)
    assert(
      Math.abs(
        sample(normal, e, l, t, "normal", 72) +
          sample(normal, swapped, l, t, "normal", 72),
      ) < 1e-10,
    );
});
test("Einthoven identity holds at arbitrary placements and with injury changes", () => {
  const e = preset("3-electrode");
  e[0].position = [-0.1, 2.4, 0.3];
  e[1].position = [0.32, 2.62, 0.13];
  const [I, II, III] = leadsFor(e);
  for (const condition of ["normal", "anterior", "inferior"] as const)
    for (let t = 0; t < 5; t += 0.02)
      assert(
        Math.abs(
          sample(normal, e, I, t, condition, 72) +
            sample(normal, e, III, t, condition, 72) -
            sample(normal, e, II, t, condition, 72),
        ) < 1e-9,
      );
});
test("canonical Lead I reproduces baseline-centered source at matching time", () => {
  const e = preset("2-electrode"),
    l = leadsFor(e)[0];
  for (let t = 0; t < 3; t += 0.013)
    assert(
      Math.abs(
        sample(normal, e, l, t, "normal", 72) -
          sourceSample(normal, "I", t, 72),
      ) < 1e-10,
    );
});
test("spatial field is finite and weights sum to one", () => {
  for (const p of [
    [0, 3.5, 0.2],
    [0, 0, 0],
    [0.2, 2.6, 0.2],
    [-0.6, 1.8, 0.085],
  ] as Point[]) {
    const w = Object.values(spatialWeights(p));
    assert(w.every(Number.isFinite));
    assert(Math.abs(w.reduce((a, b) => a + b, 0) - 1) < 1e-12);
  }
});
test("records contain finite samples and retained provenance", () => {
  for (const id of ["normal", "afib", "vfib", "mi-recording"]) {
    const s: Signal = JSON.parse(
      fs.readFileSync(`public/signals/${id}.json`, "utf8"),
    );
    assert(s.url && s.license && s.record && s.sha256);
    for (const a of Object.values(s.signals)) {
      assert(a.length >= 2000);
      assert(a.every(Number.isFinite));
    }
    if (id === "normal") {
      const a = analyse(s);
      assert(a.peaks.length >= 7);
      assert(a.rate > 40 && a.rate < 130);
    }
  }
});
test("anterior/inferior teaching offsets change appropriately across views", () => {
  const e = preset("12-lead"),
    ls = leadsFor(e),
    get = (id: string) => ls.find((l) => l.id === id)!;
  assert(
    injuryVisibility(e, get("V3"), "anterior") >
      injuryVisibility(e, get("I"), "anterior"),
  );
  assert(injuryVisibility(e, get("III"), "inferior") > 0);
  assert(injuryVisibility(e, get("aVL"), "inferior") < 0);
  const same = preset("2-electrode");
  same[1].position = [...same[0].position];
  assert.equal(injuryVisibility(same, leadsFor(same)[0], "anterior"), 0);
});
test("VF extrapolation remains zero for coincident electrodes", () => {
  const s: Signal = JSON.parse(
    fs.readFileSync("public/signals/vfib.json", "utf8"),
  );
  const e = preset("2-electrode");
  e[1].position = [...e[0].position];
  for (let t = 0; t < 8; t += 0.017)
    assert.equal(sample(s, e, leadsFor(e)[0], t, "vfib", 72), 0);
});
