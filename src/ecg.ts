import { patterns, patternEvents, patternState } from "./patterns";
export type Point = [number, number, number];
export type Condition =
  | "normal"
  | "afib"
  | "vfib"
  | "anterior"
  | "inferior"
  | "ischemia"
  | "pvc"
  | "flutter"
  | "firstdegree"
  | "mobitz1"
  | "mobitz2"
  | "complete"
  | "vt";
export type Signal = {
  id: string;
  name: string;
  hz: number;
  signals: Record<string, number[]>;
  dataset: string;
  record: string;
  url: string;
  license: string;
  placement: string;
  sha256: string;
};
export type Electrode = { id: string; position: Point };
export type Lead = {
  id: string;
  label: string;
  terms: [string, number][];
  color: string;
};
export const colors = [
  "#edb77a",
  "#83d5c7",
  "#a8b8ff",
  "#e791ae",
  "#b4cf83",
  "#d6aff1",
];
export const anchors: Record<string, Point> = {
  RA: [-0.6, 1.8, 0.085],
  LA: [0.6, 1.8, 0.085],
  LL: [0.15, 0.22, 0.08],
  RL: [-0.15, 0.22, 0.08],
  V1: [-0.07, 2.65, 0.24],
  V2: [0.07, 2.65, 0.24],
  V3: [0.17, 2.57, 0.25],
  V4: [0.24, 2.49, 0.24],
  V5: [0.34, 2.49, 0.16],
  V6: [0.4, 2.49, 0.025],
};
export const conditions: Record<
  Condition,
  { name: string; short: string; description: string }
> = {
  normal: {
    name: "Normal sinus rhythm",
    short: "Normal",
    description:
      "Follow an organised electrical cycle: atria activate, ventricles activate, then ventricles recover.",
  },
  pvc: {
    name: "Premature ventricular contraction",
    short: "PVC",
    description:
      "An early ventricular impulse takes a different activation route: a wider beat, then a pause. This example illustrates a compensatory pause; not every PVC has one.",
  },
  flutter: {
    name: "Atrial flutter · 2:1 example",
    short: "Atrial flutter",
    description:
      "A repeating atrial circuit produces flutter waves. Here only every second atrial activation reaches the ventricles; other conduction ratios are possible.",
  },
  ischemia: {
    name: "ST depression · ischemia teaching pattern",
    short: "ST depression",
    description:
      "Altered ventricular electrical recovery can depress the ST segment. Ischemia is one possible cause; ST depression alone does not establish a diagnosis.",
  },
  firstdegree: {
    name: "First-degree AV block",
    short: "1° AV block",
    description:
      "Every atrial beat conducts, but slowly. The PR interval is prolonged; no QRS is dropped.",
  },
  mobitz1: {
    name: "Second-degree AV block · Mobitz I",
    short: "Mobitz I",
    description:
      "Conduction takes progressively longer, then one atrial impulse fails to reach the ventricles. The sequence repeats.",
  },
  mobitz2: {
    name: "Second-degree AV block · Mobitz II",
    short: "Mobitz II",
    description:
      "Conducted beats retain the same PR interval, but an impulse suddenly fails. The defect is usually below the AV node.",
  },
  complete: {
    name: "Complete AV block",
    short: "Complete block",
    description:
      "Atrial impulses do not conduct to the ventricles. A separate slower escape rhythm drives the ventricles; P waves and QRS complexes have no fixed relationship.",
  },
  vt: {
    name: "Ventricular tachycardia",
    short: "VT",
    description:
      "A ventricular rhythm repeatedly activates the lower chambers rapidly. This wide-complex monomorphic example is illustrative; VT may have a pulse or be pulseless and is potentially life-threatening.",
  },
  afib: {
    name: "Atrial fibrillation",
    short: "AFib",
    description:
      "Look for irregular beat spacing and the absence of consistent P waves. A small trace can make atrial activity hard to see.",
  },
  vfib: {
    name: "Ventricular fibrillation",
    short: "VFib",
    description:
      "Chaotic ventricular activity replaces organised beats. There is no meaningful P–QRS–T cycle or normal pumping. VF is a medical emergency.",
  },
  anterior: {
    name: "Anterior STEMI example",
    short: "Anterior STEMI",
    description:
      "An illustrative anterior injury pattern changes the ST segment, especially in front-of-chest views. A different lead may show much less of it.",
  },
  inferior: {
    name: "Inferior STEMI example",
    short: "Inferior STEMI",
    description:
      "An illustrative inferior injury pattern changes the ST segment in inferior views. Compare II, III and aVF with other directions.",
  },
};
export function preset(name: string): Electrode[] {
  const ids =
    name === "12-lead"
      ? Object.keys(anchors)
      : name === "3-electrode"
        ? ["RA", "LA", "LL"]
        : ["RA", "LA"];
  return ids.map((id) => ({
    id,
    position:
      name === "wearable" && id === "RA"
        ? [-0.65, 1.61, 0.1]
        : ([...anchors[id]] as Point),
  }));
}
export const distance = (a: Point, b: Point) =>
  Math.hypot(...a.map((v, i) => v - b[i]));
export function leadsFor(e: Electrode[], all = false): Lead[] {
  const has = (id: string) => e.some((v) => v.id === id),
    out: Lead[] = [];
  const add = (id: string, terms: [string, number][]) =>
    out.push({
      id,
      label: id,
      terms,
      color: colors[out.length % colors.length],
    });
  if (has("RA") && has("LA"))
    add("I", [
      ["LA", 1],
      ["RA", -1],
    ]);
  if (has("RA") && has("LL"))
    add("II", [
      ["LL", 1],
      ["RA", -1],
    ]);
  if (has("LA") && has("LL"))
    add("III", [
      ["LL", 1],
      ["LA", -1],
    ]);
  if (has("RA") && has("LA") && has("LL")) {
    if (all || e.some((v) => v.id.startsWith("V"))) {
      add("aVR", [
        ["RA", 1],
        ["LA", -0.5],
        ["LL", -0.5],
      ]);
      add("aVL", [
        ["LA", 1],
        ["RA", -0.5],
        ["LL", -0.5],
      ]);
      add("aVF", [
        ["LL", 1],
        ["RA", -0.5],
        ["LA", -0.5],
      ]);
    }
    for (const v of e.filter((v) => v.id.startsWith("V")))
      add(v.id, [
        [v.id, 1],
        ["RA", -1 / 3],
        ["LA", -1 / 3],
        ["LL", -1 / 3],
      ]);
  }
  const custom = e.filter((v) => v.id !== "RL");
  // An electrode without enough reference inputs still gets a clearly named
  // bipolar view; never label a chest difference as a conventional V lead.
  for (const pad of custom.slice(1)) {
    if (!out.some((l) => l.terms.some(([id]) => id === pad.id))) {
      add(`${pad.id} − ${custom[0].id}`, [
        [pad.id, 1],
        [custom[0].id, -1],
      ]);
    }
  }
  if (all)
    for (let i = 0; i < custom.length; i++)
      for (let j = i + 1; j < custom.length; j++) {
        const a = custom[i].id,
          b = custom[j].id;
        if (
          out.some(
            (l) =>
              l.terms.length === 2 &&
              l.terms.some((t) => t[0] === a) &&
              l.terms.some((t) => t[0] === b),
          )
        )
          continue;
        add(`${b} − ${a}`, [
          [b, 1],
          [a, -1],
        ]);
      }
  if (!out.length && custom.length >= 2)
    add(`${custom[1].id} − ${custom[0].id}`, [
      [custom[1].id, 1],
      [custom[0].id, -1],
    ]);
  return out;
}
export function interp(values: number[], position: number) {
  const n = values.length;
  const x = Math.max(0, Math.min(n - 1, position));
  const i = Math.floor(x);
  return values[i] + (values[Math.min(i + 1, n - 1)] - values[i]) * (x - i);
}
const caches = new WeakMap<
  Signal,
  { peaks: number[]; rate: number; period: number }
>();
const centered = new WeakMap<Signal, Record<string, number[]>>();
export function centeredSignals(s: Signal) {
  let c = centered.get(s);
  if (c) return c;
  c = {};
  for (const [id, v] of Object.entries(s.signals)) {
    const sorted = [...v].sort((a, b) => a - b),
      median = sorted[Math.floor(sorted.length / 2)];
    c[id] = v.map((x) => x - median);
  }
  centered.set(s, c);
  return c;
}
export function analyse(s: Signal) {
  const old = caches.get(s);
  if (old) return old;
  const channels = centeredSignals(s);
  const a = channels.II ?? channels.I ?? Object.values(channels)[0];
  let max = 0;
  for (const v of a) max = Math.max(max, Math.abs(v));
  const peaks: number[] = [];
  for (let i = Math.round(s.hz * 0.3); i < a.length - s.hz * 0.3; i++) {
    if (a[i] > 0.45 * max && a[i] >= a[i - 1] && a[i] > a[i + 1]) {
      if (peaks.length && i - peaks.at(-1)! < s.hz * 0.3) {
        if (a[i] > a[peaks.at(-1)!]) peaks[peaks.length - 1] = i;
      } else peaks.push(i);
    }
  }
  const diffs = peaks
    .slice(1)
    .map((p, i) => (p - peaks[i]) / s.hz)
    .sort((a, b) => a - b);
  const period = diffs[Math.floor(diffs.length / 2)] ?? 0.83;
  const meanPeriod =
    peaks.length > 1
      ? (peaks.at(-1)! - peaks[0]) / s.hz / (peaks.length - 1)
      : period;
  const result = { peaks, period, rate: 60 / meanPeriod };
  caches.set(s, result);
  return result;
}
export function sourceSample(
  s: Signal,
  channel: string,
  t: number,
  rate: number,
) {
  const values = centeredSignals(s)[channel.toUpperCase()];
  if (!values) return 0;
  const a = analyse(s);
  const start = a.peaks[0] ?? 0,
    end = a.peaks.at(-1) ?? values.length - 1;
  const span = Math.max(1, end - start);
  const pos = start + (((((t * s.hz * rate) / a.rate) % span) + span) % span);
  return interp(values, pos);
}
// Electrode potentials are anchored to measured lead relationships. Inverse-distance
// interpolation is an illustrative body-surface field, not a torso conductivity solver.
export function spatialWeights(p: Point): Record<string, number> {
  const names = Object.keys(anchors).filter((id) => id !== "RL");
  const ds = names.map((id) => distance(p, anchors[id]));
  const exact = ds.findIndex((d) => d < 1e-6);
  if (exact >= 0) return { [names[exact]]: 1 };
  const raw = ds.map((d) => 1 / Math.pow(d, 3));
  const sum = raw.reduce((a, b) => a + b, 0);
  return Object.fromEntries(names.map((id, i) => [id, raw[i] / sum]));
}
export function leadWeights(e: Electrode[], lead: Lead) {
  const w: Record<string, number> = {};
  for (const [id, k] of lead.terms) {
    const p = e.find((v) => v.id === id)?.position;
    if (!p) continue;
    for (const [a, v] of Object.entries(spatialWeights(p)))
      w[a] = (w[a] ?? 0) + k * v;
  }
  return w;
}
const injury: Record<string, number[]> = {
  ischemia: [0, -0.08, -0.15, 0.01, -0.04, -0.1, -0.2, -0.24, -0.2],
  anterior: [0, -0.03, -0.08, 0.18, 0.34, 0.4, 0.32, 0.16, 0.08],
  inferior: [0, -0.08, 0.27, -0.06, -0.05, -0.03, 0, 0.02, 0.04],
};
const nodes = ["RA", "LA", "LL", "V1", "V2", "V3", "V4", "V5", "V6"];
export function injuryVisibility(
  e: Electrode[],
  lead: Lead,
  condition: Condition,
) {
  if (!injury[condition]) return 0;
  return dot(
    leadWeights(e, lead),
    Object.fromEntries(nodes.map((id, i) => [id, injury[condition][i]])),
  );
}
function stWindow(s: Signal, t: number, rate: number) {
  const { peaks, rate: base } = analyse(s);
  if (peaks.length < 2) return 0;
  const begin = peaks[0] / s.hz,
    end = peaks.at(-1)! / s.hz;
  const pos =
    begin +
    (((((t * rate) / base) % (end - begin)) + (end - begin)) % (end - begin));
  let previous = begin;
  for (const p of peaks) {
    if (p / s.hz > pos) break;
    previous = p / s.hz;
  }
  const elapsed = pos - previous;
  const smooth = (v: number) => {
    const x = Math.max(0, Math.min(1, v));
    return x * x * (3 - 2 * x);
  };
  return (
    smooth((elapsed - 0.06) / 0.025) * (1 - smooth((elapsed - 0.26) / 0.07))
  );
}
export function potentials(
  s: Signal,
  t: number,
  condition: Condition,
  rate: number,
): Record<string, number> {
  if (condition === "vfib") {
    const a = centeredSignals(s).ECG ?? Object.values(centeredSignals(s))[0],
      at = (offset: number) =>
        interp(a, ((((t + offset) * s.hz) % a.length) + a.length) % a.length);
    const x = at(0),
      y = at(0.08),
      z = at(0.17);
    return Object.fromEntries(
      nodes.map((id) => {
        const p = anchors[id];
        return [id, x * p[0] + y * (p[1] - 2.2) * 0.35 + z * p[2]];
      }),
    );
  }
  const read = (channel: string) =>
    patterns[condition]
      ? teachingSample(s, channel, t, condition)
      : sourceSample(s, channel, t, rate);
  const I = read("I"),
    II = read("II");
  const out: Record<string, number> = { RA: -I / 2, LA: I / 2, LL: II - I / 2 };
  const wct = (out.RA + out.LA + out.LL) / 3;
  for (let i = 1; i <= 6; i++) out["V" + i] = read("V" + i) + wct;
  if (injury[condition]) {
    const gain = stWindow(s, t, rate);
    nodes.forEach((id, i) => (out[id] += injury[condition][i] * gain));
  }
  return out;
}
export const dot = (
  weights: Record<string, number>,
  values: Record<string, number>,
) =>
  Object.entries(weights).reduce(
    (sum, [k, v]) => sum + v * (values[k] ?? 0),
    0,
  );
export function sample(
  s: Signal,
  e: Electrode[],
  lead: Lead,
  t: number,
  condition: Condition,
  rate: number,
) {
  return dot(leadWeights(e, lead), potentials(s, t, condition, rate));
}
export function stage(
  s: Signal,
  t: number,
  rate: number,
  condition: Condition,
) {
  if (patterns[condition])
    return (
      patternState(condition, t).phase + " · " + conditions[condition].short
    );
  if (condition === "vfib") return "Chaotic ventricular activity";
  if (condition === "afib")
    return "Disorganised atria · irregular ventricular response";
  const a = analyse(s);
  const span = (a.peaks.at(-1)! - a.peaks[0]) / s.hz;
  const pos =
    a.peaks[0] / s.hz + (((((t * rate) / a.rate) % span) + span) % span);
  let prev = a.peaks[0] / s.hz,
    next = prev + a.period;
  for (const p of a.peaks) {
    if (p / s.hz > pos) {
      next = p / s.hz;
      break;
    }
    prev = p / s.hz;
  }
  const elapsed = pos - prev;
  if (elapsed < 0.07) return "QRS · ventricles activate";
  if (elapsed < 0.2) return "ST · ventricles are activated";
  if (elapsed < 0.43) return "T · ventricles recover";
  if (next - pos < 0.23 && next - pos > 0.08) return "P · atria activate";
  if (next - pos <= 0.08) return "AV node · brief conduction delay";
  return "Rest · between electrical cycles";
}

const templates = new WeakMap<Signal, Record<string, number[]>>();
// Reconstruct illustrative rhythms from isolated components of the recorded
// normal beat. End-point detrending avoids splice jumps; no patient label is implied.
function component(
  s: Signal,
  channel: string,
  start: number,
  end: number,
  at: number,
) {
  if (at < start || at > end) return 0;
  let cache = templates.get(s);
  if (!cache) {
    cache = {};
    templates.set(s, cache);
  }
  const key = `${channel}:${start}:${end}`;
  if (!cache[key]) {
    const base = analyse(s).rate,
      first = sourceSample(s, channel, start, base),
      last = sourceSample(s, channel, end, base);
    const n = Math.round((end - start) * 500);
    cache[key] = Array.from(
      { length: n + 1 },
      (_, i) =>
        sourceSample(s, channel, start + ((end - start) * i) / n, base) -
        first -
        ((last - first) * i) / n,
    );
  }
  const a = cache[key],
    pos = ((at - start) / (end - start)) * (a.length - 1),
    i = Math.floor(pos);
  return a[i] + ((a[Math.min(i + 1, a.length - 1)] ?? 0) - a[i]) * (pos - i);
}
export function teachingSample(
  s: Signal,
  channel: string,
  t: number,
  condition: Condition,
) {
  const { atria, beats } = patternEvents(condition, t - 0.9, t + 0.2);
  let value = 0;
  if (condition === "flutter") {
    const u = (((t % 0.2) + 0.2) % 0.2) / 0.2;
    const saw = u < 0.8 ? u / 0.8 : (1 - u) / 0.2;
    const strength = channel === "II" ? -0.22 : channel === "V1" ? 0.22 : -0.1;
    value += strength * (saw - 0.5);
  } else
    for (const a of atria)
      value += component(s, channel, -0.24, -0.08, t - a.at - 0.24);
  for (const b of beats) {
    const d = t - b.at,
      width = b.wide ? 2.4 : 1,
      polarity = b.ectopic ? -1 : 1;
    value += polarity * component(s, channel, -0.04, 0.07, d / width);
    // Recovery is inverted relative to the ectopic QRS in this teaching example.
    const recovery = condition === "vt" ? d * 1.6 : d;
    value +=
      (b.ectopic ? 0.65 : 1) * component(s, channel, 0.1, 0.43, recovery);
  }
  return value;
}
