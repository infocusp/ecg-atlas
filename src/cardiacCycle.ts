import { analyse } from "./ecg";
import type { Signal, Condition } from "./ecg";
import { patterns, patternState } from "./patterns";
export type CardiacCycle = {
  phase: string;
  electrical: string;
  mechanical: string;
  blood: string;
  squeeze: number;
  ejection: number;
  filling: number;
  atrial: number;
  travel: number;
};
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const bump = (elapsed: number, start: number, end: number) =>
  elapsed < start || elapsed > end
    ? 0
    : Math.sin((Math.PI * (elapsed - start)) / (end - start));
/** Illustrative mechanics, timed from the same recorded R peaks as the ECG. */
export function cardiacCycle(
  s: Signal,
  t: number,
  rate: number,
  condition: Condition,
): CardiacCycle {
  if (patterns[condition]) {
    const state = patternState(condition, t),
      d = state.elapsed;
    const duration =
      condition === "vt" ? 0.65 : condition === "flutter" ? 0.8 : 1;
    const squeeze = bump(d, 0.02 * duration, 0.42 * duration);
    const ejection = bump(d, 0.08 * duration, 0.34 * duration);
    const independent = condition === "complete";
    const pattern = patterns[condition]!,
      lap = Math.floor(t / pattern.duration),
      local = t - lap * pattern.duration;
    const travelled = pattern.beats.reduce(
      (sum, beat) =>
        sum +
        clamp((local - beat.at - 0.08 * duration) / (0.26 * duration)) +
        clamp(
          (local + pattern.duration - beat.at - 0.08 * duration) /
            (0.26 * duration),
        ) -
        1,
      lap * pattern.beats.length,
    );
    return {
      phase: state.phase,
      electrical: state.blocked
        ? independent
          ? "Atrial impulse blocked; escape rhythm is independent"
          : "This atrial impulse does not reach the ventricles"
        : state.phase.includes("QRS")
          ? state.beat?.ectopic
            ? "Ventricular-origin activation spreads by a different route"
            : "Impulse reaches the ventricles"
          : state.phase === "AV"
            ? "Waiting for conduction to the ventricles"
            : state.phase === "T"
              ? "Ventricles recover electrically"
              : condition === "flutter"
                ? "Atrial circuit continues: only alternate impulses conduct"
                : "Atrial and ventricular timing shown separately",
      mechanical:
        squeeze > 0.1
          ? "Ventricular contraction follows this ventricular activation"
          : "No new ventricular contraction without ventricular activation",
      blood:
        ejection > 0.1
          ? "Illustrative ejection; actual stroke volume is not predicted"
          : "Filling between ventricular contractions",
      squeeze,
      ejection,
      filling: ejection === 0 ? 1 : 0,
      atrial:
        condition === "flutter" || condition === "vt"
          ? 0
          : bump(state.atrialAge, 0.04, 0.2),
      travel: travelled * 0.055 + t * 0.01,
    };
  }
  if (condition === "vfib")
    return {
      phase: "VF",
      electrical: "Chaotic ventricular activation",
      mechanical: "Ventricles quiver instead of squeezing together",
      blood: "No effective forward pumping",
      squeeze: 0,
      ejection: 0,
      filling: 0,
      atrial: 0,
      travel: 0,
    };
  const a = analyse(s);
  const first = a.peaks[0] / s.hz,
    last = a.peaks.at(-1)! / s.hz,
    span = last - first;
  const sourceTime = (t * rate) / a.rate,
    lap = Math.floor(sourceTime / span),
    local = (((sourceTime % span) + span) % span) + first;
  let index = 0;
  while (index < a.peaks.length - 2 && a.peaks[index + 1] / s.hz <= local)
    index++;
  const prev = a.peaks[index] / s.hz,
    next = a.peaks[index + 1] / s.hz,
    elapsed = local - prev,
    toNext = next - local,
    interval = next - prev;
  // Compress schematic mechanics when the recorded RR interval is very short.
  const duration = Math.min(1, interval / 0.62),
    ejection = bump(elapsed, 0.08 * duration, 0.34 * duration),
    squeeze = bump(elapsed, 0.02 * duration, 0.42 * duration);
  const atrial =
    condition === "afib"
      ? 0
      : bump(toNext, 0.015, 0.15 * Math.min(1, interval / 0.6));
  const filling = elapsed > 0.4 * duration ? 1 : 0;
  let phase = "Rest",
    electrical = "Between electrical waves",
    mechanical = "Ventricles relax",
    blood = "Blood returns and fills the heart";
  if (elapsed < 0.07 * duration) {
    phase = "QRS";
    electrical = "Ventricles activate";
    mechanical = "Contraction starts; pressure builds";
    blood = "Ejection follows after a brief delay";
  } else if (elapsed < 0.2 * duration) {
    phase = "ST";
    electrical = "Ventricles remain activated";
    mechanical = "Ventricles squeeze";
    blood = "Blood is ejected toward the lungs and body";
  } else if (elapsed < 0.43 * duration) {
    phase = "T";
    electrical = "Ventricles electrically recover";
    mechanical = "Ejection finishes, then relaxation begins";
    blood =
      ejection > 0.05
        ? "Late ejection continues"
        : "The heart begins to refill";
  } else if (toNext < 0.23 && toNext > 0.08) {
    phase = "P";
    electrical = "Atria activate";
    mechanical = "Atrial contraction follows";
    blood = "Atria top up the ventricles";
  } else if (toNext <= 0.08) {
    phase = "AV";
    electrical = "AV node delays the signal";
    mechanical = "Atria finish their squeeze";
    blood = "Ventricles are filled for the next beat";
  }
  if (
    condition === "afib" &&
    (phase === "P" || phase === "AV" || phase === "Rest")
  ) {
    phase = "AF";
    electrical = "Atrial activation is disorganised";
    mechanical = "No coordinated atrial squeeze";
    blood = "Passive filling continues between irregular beats";
  }
  const beat = lap * (a.peaks.length - 1) + index;
  if (
    ["anterior", "inferior", "ischemia"].includes(condition) &&
    (phase === "ST" || phase === "T")
  ) {
    electrical =
      condition === "ischemia"
        ? "Altered ventricular electrical activity shifts the ST level downward in selected views"
        : "Affected and nearby ventricular tissue have different electrical potentials";
    mechanical = "Regional pumping effects are not predicted by this ECG model";
  }
  const stroke = clamp((elapsed - 0.08 * duration) / (0.26 * duration));
  return {
    phase,
    electrical,
    mechanical,
    blood,
    squeeze,
    ejection,
    filling,
    atrial,
    travel: sourceTime * 0.045 + (beat + stroke) * 0.055,
  };
}
