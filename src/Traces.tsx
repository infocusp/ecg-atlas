import { useEffect, useRef } from "react";
import { dot, leadWeights, potentials, interp } from "./ecg";
import { SampleCache, sampleWindow } from "./traceStream";
import type { Condition, Electrode, Lead, Signal } from "./ecg";
import type { CardiacCycle } from "./cardiacCycle";
import { cardiacCycle } from "./cardiacCycle";
import { patterns, patternEvents } from "./patterns";
export type Snapshot = {
  electrodes: Electrode[];
  condition: Condition;
  rate: number;
  signal: Signal;
};
type Props = {
  signal: Signal;
  electrodes: Electrode[];
  leads: Lead[];
  condition: Condition;
  rate: number;
  clock: React.RefObject<number>;
  compare: Snapshot | null;
  gain: number;
  span: number;
  raw?: boolean;
  cycle?: React.RefObject<CardiacCycle | null>;
  rowHeight?: number;
};
export default function Traces(props: Props) {
  const ref = useRef<HTMLCanvasElement>(null),
    latest = useRef(props);
  latest.current = props;
  useEffect(() => {
    const canvas = ref.current!,
      ctx = canvas.getContext("2d")!;
    let raf = 0,
      signature = "";
    let samples: SampleCache<{ values: number[]; before: (number | null)[] }>;
    const hz = 500;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      if (document.hidden) return;
      const p = latest.current;
      const rowHeight = p.rowHeight ?? 145,
        rowScale = rowHeight / 145;
      const w = canvas.clientWidth,
        h = p.leads.length * rowHeight;
      const dpr = Math.min(devicePixelRatio, 2);
      if (
        canvas.width !== Math.round(w * dpr) ||
        canvas.height !== Math.round(h * dpr)
      ) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr * rowScale, 0, 0);
      ctx.clearRect(0, 0, w, h / rowScale);
      const labelAt = (text: string, x: number, y: number) => {
        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillText(text, x, y * rowScale);
        ctx.restore();
      };
      const left = 46,
        right = w - 14,
        width = right - left;
      const nextSignature = JSON.stringify([
        p.signal.id,
        p.electrodes,
        p.leads,
        p.condition,
        p.rate,
        p.raw,
        p.compare && [
          p.compare.signal.id,
          p.compare.electrodes,
          p.compare.condition,
          p.compare.rate,
        ],
      ]);
      if (nextSignature !== signature) {
        signature = nextSignature;
        const weights = p.leads.map((l) => leadWeights(p.electrodes, l));
        const compareWeights = p.compare
          ? p.leads.map((l) =>
              l.terms.every(([id]) =>
                p.compare!.electrodes.some((e) => e.id === id),
              )
                ? leadWeights(p.compare!.electrodes, l)
                : null,
            )
          : [];
        samples = new SampleCache((index) => {
          const t = index / hz;
          const pots = potentials(p.signal, t, p.condition, p.rate),
            old = p.compare
              ? potentials(
                  p.compare.signal,
                  t,
                  p.compare.condition,
                  p.compare.rate,
                )
              : null;
          const values = p.leads.map((lead, k) => {
            if (p.raw) {
              const a =
                p.signal.signals[lead.id.toUpperCase()] ??
                Object.values(p.signal.signals)[0];
              return interp(
                a,
                (((t * p.signal.hz) % a.length) + a.length) % a.length,
              );
            } else return dot(weights[k], pots);
          });
          const before = p.leads.map((_, k) =>
            old && compareWeights[k] ? dot(compareWeights[k]!, old) : null,
          );
          return { values, before };
        });
      }
      const time = p.clock.current;
      const bands: { start: number; end: number; color: string }[] = [];
      if (!p.raw && p.cycle) {
        if (patterns[p.condition]) {
          const events = patternEvents(
            p.condition,
            time - p.span - 0.5,
            time + 0.2,
          );
          for (const a of events.atria) {
            bands.push({ start: a.at, end: a.at + 0.1, color: "#edb77a22" });
            if (a.ventricular === undefined && p.condition !== "flutter")
              bands.push({
                start: a.at + 0.15,
                end: a.at + 0.35,
                color: "#f08b8833",
              });
          }
          for (const b of events.beats)
            bands.push({
              start: b.at - (b.wide ? 0.096 : 0.04),
              end: b.at + (b.wide ? 0.168 : 0.07),
              color: b.wide ? "#ea94bd33" : "#83d5c722",
            });
        } else if (["anterior", "inferior", "ischemia"].includes(p.condition)) {
          // Coarse display-only bands; waveform samples stay on the stable grid.
          for (
            let at = Math.floor((time - p.span) * 25) / 25;
            at < time;
            at += 0.04
          )
            if (cardiacCycle(p.signal, at, p.rate, p.condition).phase === "ST")
              bands.push({ start: at, end: at + 0.04, color: "#ed976b33" });
        }
      }
      const { first, last } = sampleWindow(time, p.span, hz);
      samples!.retain(first, last);
      const history = Array.from({ length: last - first + 1 }, (_, i) =>
        samples!.get(first + i),
      );
      const xAt = (i: number) =>
        left + (((first + i) / hz - (time - p.span)) / p.span) * width;
      const bounds = canvas.getBoundingClientRect(),
        parent = canvas.parentElement!.getBoundingClientRect();
      const visibleTop = (Math.max(0, parent.top) - bounds.top) / rowScale,
        visibleBottom =
          (Math.min(innerHeight, parent.bottom) - bounds.top) / rowScale;
      p.leads.forEach((lead, k) => {
        if ((k + 1) * 145 < visibleTop || k * 145 > visibleBottom) return;
        const y = k * 145,
          baseline = y + 79,
          scale = (p.raw ? 19 : 33) * p.gain;
        ctx.save();
        ctx.beginPath();
        ctx.rect(left, y + 24, width, 106);
        ctx.clip();
        for (const band of bands) {
          ctx.fillStyle = band.color;
          ctx.fillRect(
            left + ((band.start - (time - p.span)) / p.span) * width,
            y + 24,
            ((band.end - band.start) / p.span) * width,
            106,
          );
        }
        for (let x = left; x <= right; x += (width / p.span) * 0.04) {
          const idx = Math.round((x - left) / ((width / p.span) * 0.04));
          ctx.strokeStyle = idx % 5 ? "#20292b" : "#2b3536";
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(x, y + 24);
          ctx.lineTo(x, y + 130);
          ctx.stroke();
        }
        for (let v = -3; v <= 3; v += 0.1) {
          ctx.strokeStyle =
            Math.abs((v * 10) % 5) < 0.01 ? "#2b3536" : "#20292b";
          ctx.beginPath();
          ctx.moveTo(left, baseline - v * scale);
          ctx.lineTo(right, baseline - v * scale);
          ctx.stroke();
        }
        const line = (color: string, dashed = false) => {
          ctx.strokeStyle = color;
          ctx.lineWidth = dashed ? 1.25 : 1.65;
          ctx.setLineDash(dashed ? [4, 4] : []);
          ctx.beginPath();
          history.forEach((point, i) => {
            const v = dashed ? point.before[k] : point.values[k];
            if (v === null) return;
            const x = xAt(i),
              yy = baseline - v * scale;
            i ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy);
          });
          ctx.stroke();
        };
        if (p.compare && history[0].before[k] !== null) line("#aeb0dc", true);
        line(lead.color);
        if (p.cycle) {
          const index = Math.floor(time * hz),
            fraction = time * hz - index;
          const a = samples!.get(index).values[k],
            b = samples!.get(index + 1).values[k];
          ctx.strokeStyle = "#edb77a88";
          ctx.lineWidth = 1;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(right, y + 24);
          ctx.lineTo(right, y + 130);
          ctx.stroke();
          ctx.fillStyle = "#edb77a";
          ctx.beginPath();
          ctx.arc(
            right,
            baseline - (a + (b - a) * fraction) * scale,
            3,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
        ctx.restore();
        ctx.fillStyle = lead.color;
        ctx.font = "600 14px system-ui";
        labelAt(lead.label, 12, y + 17);
        ctx.fillStyle = "#8c9a9d";
        ctx.font = "11px monospace";
        labelAt("mV", 12, y + 35);
        labelAt("0", 25, baseline + 4);
        labelAt("1", 25, baseline - scale + 4);
        const clipped = history.some(
          ({ values }) =>
            baseline - values[k] * scale < y + 24 ||
            baseline - values[k] * scale > y + 130,
        );
        if (clipped) {
          ctx.fillStyle = "#edb77a";
          labelAt("Clipped · reduce gain", left + 38, y + 143);
          ctx.fillStyle = "#8c9a9d";
        }
        ctx.textAlign = "right";
        labelAt(
          p.raw
            ? "RECORDED"
            : lead.terms
                .map(
                  ([id, v]) =>
                    `${v > 0 ? "+" : ""}${Math.abs(v) === 1 ? (v < 0 ? "−" : "") : v.toFixed(2) + "×"}${id}`,
                )
                .join(" "),
          right,
          y + 17,
        );
        ctx.textAlign = "left";
        labelAt(`−${p.span}s`, left, y + 143);
        ctx.textAlign = "right";
        labelAt(
          p.cycle?.current ? `now · ${p.cycle.current.phase}` : "now",
          right,
          y + 143,
        );
        ctx.textAlign = "left";
      });
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <canvas
      ref={ref}
      className="trace-canvas"
      style={{ height: props.leads.length * (props.rowHeight ?? 145) }}
      role="img"
      aria-label={`${props.leads.map((l) => l.label).join(", ")} ECG waveforms; amplitude in millivolts`}
    />
  );
}
