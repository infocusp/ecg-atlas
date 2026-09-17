import type { Condition } from "./ecg";
export type Beat = { at: number; wide?: boolean; ectopic?: boolean };
export type AtrialBeat = { at: number; ventricular?: number };
export type Pattern = {
  duration: number;
  atria: AtrialBeat[];
  beats: Beat[];
  rate: number;
  rhythm: string;
};
// Fixed illustrative timing in seconds, NOT clinical records. PR is P onset to
// QRS onset. A normal template has its R peak 40 ms after QRS onset.
const block = (prs: (number | null)[], rhythm: string): Pattern => ({
  duration: prs.length * 0.8,
  rate: (75 * prs.filter((p) => p !== null).length) / prs.length,
  rhythm,
  atria: prs.map((pr, i) => ({
    at: i * 0.8,
    ventricular: pr === null ? undefined : i * 0.8 + pr,
  })),
  beats: prs.flatMap((pr, i) =>
    pr === null ? [] : [{ at: i * 0.8 + pr + 0.04 }],
  ),
});
export const patterns: Partial<Record<Condition, Pattern>> = {
  firstdegree: block([0.28], "Atria 75/min · ventricles 75/min · PR 280 ms"),
  mobitz1: block(
    [0.16, 0.23, 0.3, null],
    "Atria 75/min · 4:3 conduction · PR 160 → 230 → 300 ms → blocked",
  ),
  mobitz2: block(
    [0.18, 0.18, null, 0.18],
    "Atria 75/min · 4:3 conduction · conducted PR 180 ms",
  ),
  complete: {
    duration: 12,
    rate: 40,
    rhythm: "Atria 75/min · ventricular escape 40/min · independent clocks",
    atria: Array.from({ length: 15 }, (_, i) => ({ at: i * 0.8 })),
    beats: Array.from({ length: 8 }, (_, i) => ({
      at: 0.37 + i * 1.5,
      wide: true,
      ectopic: true,
    })),
  },
  pvc: {
    duration: 3.2,
    rate: 75,
    rhythm: "Sinus 75/min · one early ventricular beat + compensatory pause",
    atria: [0, 0.8, 2.4].map((at) => ({ at, ventricular: at + 0.16 })),
    beats: [
      { at: 0.2 },
      { at: 1 },
      { at: 1.48, wide: true, ectopic: true },
      { at: 2.6 },
    ],
  },
  flutter: {
    duration: 0.4,
    rate: 150,
    rhythm: "Atria 300/min · 2:1 conduction · ventricles 150/min",
    atria: [{ at: 0, ventricular: 0.12 }, { at: 0.2 }],
    beats: [{ at: 0.16 }],
  },
  vt: {
    duration: 1 / 3,
    rate: 180,
    rhythm: "Monomorphic VT example · ventricular rate 180/min",
    atria: [],
    beats: [{ at: 0.1, wide: true, ectopic: true }],
  },
};
export function patternEvents(condition: Condition, from: number, to: number) {
  const p = patterns[condition];
  const atria: AtrialBeat[] = [],
    beats: Beat[] = [];
  if (!p) return { atria, beats };
  for (
    let lap = Math.floor(from / p.duration) - 1;
    lap <= Math.ceil(to / p.duration);
    lap++
  ) {
    const shift = lap * p.duration;
    for (const a of p.atria)
      if (a.at + shift >= from && a.at + shift <= to)
        atria.push({
          at: a.at + shift,
          ventricular:
            a.ventricular === undefined ? undefined : a.ventricular + shift,
        });
    for (const b of p.beats)
      if (b.at + shift >= from && b.at + shift <= to)
        beats.push({ ...b, at: b.at + shift });
  }
  return { atria, beats };
}
export function patternState(condition: Condition, t: number) {
  const events = patternEvents(condition, t - 2, t + 0.25);
  const atrium = events.atria.filter((a) => a.at <= t).at(-1);
  const beat = events.beats
    .filter((b) => b.at - (b.wide ? 0.096 : 0.04) <= t)
    .at(-1);
  const elapsed = beat ? t - beat.at : 10;
  const atrialAge = atrium ? t - atrium.at : 10;
  const blocked =
    !!atrium &&
    atrium.ventricular === undefined &&
    atrialAge >= 0.12 &&
    atrialAge < 0.45;
  let phase = "Rest";
  if (blocked) phase = "Blocked";
  if (atrialAge < 0.1) phase = condition === "flutter" ? "Flutter" : "P";
  else if (atrium?.ventricular !== undefined && t < atrium.ventricular)
    phase = "AV";
  if (
    elapsed >= (beat?.wide ? -0.096 : -0.04) &&
    elapsed < (beat?.wide ? 0.17 : 0.07)
  )
    phase = beat?.wide ? "Wide QRS" : "QRS";
  else if (elapsed >= 0.1 && elapsed < 0.43 && phase === "Rest") phase = "T";
  return { ...events, atrium, beat, elapsed, atrialAge, blocked, phase };
}
