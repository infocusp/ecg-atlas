import test from "node:test";
import assert from "node:assert/strict";
import { SampleCache, sampleWindow } from "../src/traceStream.ts";
test("scrolling preserves sample times and values for a sharp peak", () => {
  const hz = 500,
    peakTime = 5.731;
  let calls = 0;
  const cache = new SampleCache<number>((i) => {
    calls++;
    return Math.exp(-Math.pow((i / hz - peakTime) / 0.003, 2));
  });
  const a = sampleWindow(8, 6, hz),
    b = sampleWindow(8 + 1 / 60, 6, hz);
  const first = Array.from({ length: a.last - a.first + 1 }, (_, i) =>
    cache.get(a.first + i),
  );
  const before = calls;
  const second = Array.from({ length: b.last - b.first + 1 }, (_, i) =>
    cache.get(b.first + i),
  );
  assert.equal(Math.max(...first), Math.max(...second));
  assert.equal(
    cache.get(Math.round(peakTime * hz)),
    first[Math.round(peakTime * hz) - a.first],
  );
  assert(
    calls - before <= 10,
    "Only new incoming samples should be evaluated per frame",
  );
});
test("cache is bounded during playback and backward scrubbing", () => {
  const cache = new SampleCache((i) => i);
  for (const t of [8, 12, 50, 2]) {
    const w = sampleWindow(t, 6, 500);
    cache.retain(w.first, w.last);
    for (let i = w.first; i <= w.last; i++) assert.equal(cache.get(i), i);
    assert(cache.size <= 3004);
  }
});
