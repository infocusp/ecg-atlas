import type { Condition } from "./ecg";
import type { CardiacCycle } from "./cardiacCycle";
import { patterns, patternState } from "./patterns";

const av = "https://www.jacc.org/doi/10.1016/j.jacc.2018.10.043";
const arrhythmia =
  "https://www.merckmanuals.com/professional/cardiovascular-disorders/specific-cardiac-arrhythmias/";
type Lesson = {
  heart: string;
  ecg: string;
  pump: string;
  placement: string;
  source: string;
};
const shared =
  "Move the pads: timing stays the same, but the size and polarity of the recorded waves change. A small P wave can become difficult to see.";
export const lessons: Record<Condition, Lesson> = {
  normal: {
    heart:
      "The sinus node starts an impulse in the upper chambers. It passes through the AV junction, then spreads through the ventricles.",
    ecg: "P = atrial activation. PR = travel time to ventricular activation. QRS = ventricular activation. T = ventricular recovery.",
    pump: "Electrical activation triggers contraction after a short delay. The ECG is not a graph of blood flow.",
    placement: shared,
    source:
      "https://openstax.org/books/anatomy-and-physiology-2e/pages/19-3-cardiac-cycle",
  },
  afib: {
    heart:
      "Disorganised atrial activity replaces an orderly atrial wave. Impulses reach the ventricles at irregular intervals.",
    ecg: "No repeating sinus P waves; R–R spacing varies unpredictably. Follow the irregular ventricular flashes and QRS complexes together.",
    pump: "There is no coordinated atrial squeeze. Ventricular contractions continue irregularly; pumping effectiveness varies.",
    placement: shared,
    source: arrhythmia + "atrial-fibrillation",
  },
  vfib: {
    heart:
      "Ventricular electrical activity becomes chaotic rather than producing a coordinated activation wave.",
    ecg: "No organised QRS–T sequence. The fluctuating recording accompanies scattered ventricular flashes, not normal beats.",
    pump: "Effective ventricular pumping stops. This is an emergency; the model stops directional blood particles.",
    placement:
      "Moving electrodes changes the observed signal, not the underlying chaos. Near-zero signal from coincident pads is not evidence of asystole.",
    source:
      "https://www.merckmanuals.com/professional/cardiovascular-disorders/specific-cardiac-arrhythmias/ventricular-fibrillation-vf",
  },
  pvc: {
    heart:
      "An early impulse originates in ventricular tissue instead of following the usual atrial-to-ventricular sequence.",
    ecg: "Different, slower spread produces a wide early QRS. This example then pauses before the next sinus beat.",
    pump: "The premature activation triggers an early contraction; its volume is not inferred from ECG amplitude.",
    placement: shared,
    source: arrhythmia + "ventricular-premature-beats-vpb",
  },
  flutter: {
    heart:
      "A repeating electrical circuit activates the atria rapidly. Here the AV junction conducts every second activation.",
    ecg: "Flutter waves repeat at 300/min, with QRS complexes at 150/min. The authored sawtooth is easiest in II or V1; some waves overlap QRS/T.",
    pump: "The atria do not perform a normal sinus squeeze. Ventricular contractions follow the conducted impulses.",
    placement:
      "Try the 12-lead preset and compare II with V1. This illustrates 2:1 flutter only; conduction need not always be regular.",
    source: arrhythmia + "atrial-flutter",
  },
  anterior: {
    heart:
      "In this anterior injury example, affected ventricular muscle has different electrical properties from nearby tissue. Orange is a schematic region, not an identified blocked artery.",
    ecg: "The voltage difference shifts the ST level. The authored change is strongest in front-of-chest leads.",
    pump: "Injury can impair contraction, but neither its extent nor ejection fraction is determined here.",
    placement:
      "Use 12 leads and compare V2–V4 with limb leads. ST elevation has causes other than infarction; diagnosis needs clinical context.",
    source: "https://academic.oup.com/eurheartj/article/44/38/3720/7243210",
  },
  inferior: {
    heart:
      "This example places the altered ventricular electrical region toward the inferior wall.",
    ecg: "Its ST shift is seen more strongly in II, III and aVF than in differently oriented leads.",
    pump: "Regional injury may affect mechanics. This model does not predict a patient's wall motion.",
    placement:
      "Compare inferior leads with I/aVL. A lead looking away may show a reciprocal change. A simulated trace cannot confirm or exclude infarction.",
    source: "https://academic.oup.com/eurheartj/article/44/38/3720/7243210",
  },
  ischemia: {
    heart:
      "Insufficient oxygen can alter ventricular electrical activity. The shaded inner-wall illustration is conceptual, not a reconstructed lesion.",
    ecg: "This example adds a downward ST shift relative to the baseline. It is not simply a smaller QRS.",
    pump: "Ischemia may impair contraction, but ST displacement does not quantify pumping strength.",
    placement:
      "Compare lateral chest and limb leads. ST depression is not specific to ischemia and can also be reciprocal or have other causes.",
    source:
      "https://www.merckmanuals.com/professional/cardiovascular-disorders/coronary-artery-disease/overview-of-acute-coronary-syndromes-acs",
  },
  firstdegree: {
    heart:
      "Conduction is delayed but every atrial impulse still reaches the ventricles.",
    ecg: "P-to-QRS onset is 280 ms here: prolonged PR, without dropped beats.",
    pump: "Ventricular activation and contraction follow later.",
    placement: shared,
    source: av,
  },
  mobitz1: {
    heart:
      "Conduction progressively slows, then one impulse is blocked; commonly the delay is in the AV node.",
    ecg: "PR grows 160 → 230 → 300 ms, then P is not followed by QRS. The cycle restarts.",
    pump: "The blocked impulse triggers no ventricular contraction.",
    placement: shared,
    source: av,
  },
  mobitz2: {
    heart:
      "An impulse suddenly fails, usually in the conduction system below the AV node.",
    ecg: "Conducted PR stays 180 ms. A P wave unexpectedly lacks QRS, without prior PR lengthening.",
    pump: "The blocked impulse triggers no ventricular contraction.",
    placement: shared,
    source: av,
  },
  complete: {
    heart:
      "No atrial impulses conduct to the ventricles. An independent slower escape rhythm activates them.",
    ecg: "P waves and QRS complexes march independently: 75 versus 40/min here. A wide escape is one possible example.",
    pump: "Atrial and ventricular contractions are no longer linked beat-for-beat.",
    placement: shared,
    source: av,
  },
  vt: {
    heart:
      "A ventricular source or circuit drives repeated rapid activation, bypassing the usual activation sequence.",
    ecg: "This monomorphic example repeats wide QRS complexes at 180/min. No visible P waves are authored; atrial activity can still exist in real VT.",
    pump: "Fast activation shortens filling time. VT can retain a pulse or become pulseless; the animation does not predict blood pressure or output.",
    placement:
      "Lead direction changes morphology. Not every wide-complex tachycardia is VT; this is a labelled teaching example, not a diagnostic classifier.",
    source: arrhythmia + "ventricular-tachycardia-vt",
  },
};

export default function Teaching({
  condition,
  cycle,
  time,
  onSlow,
  onStep,
}: {
  condition: Condition;
  cycle: CardiacCycle | null;
  time: number;
  onSlow: () => void;
  onStep: () => void;
}) {
  const lesson = lessons[condition],
    state = patterns[condition] ? patternState(condition, time) : null;
  const phase = cycle?.phase ?? "Rest";
  const atrial =
    phase === "P" ||
    phase === "AF" ||
    condition === "flutter" ||
    (state && state.atrialAge < 0.1);
  const ventricular = phase.includes("QRS") || condition === "vfib";
  const blocked = state?.blocked || condition === "complete";
  const blockY = condition === "mobitz2" ? 123 : 89;
  const recovery = phase === "T" || phase === "ST";
  const injury = ["anterior", "inferior", "ischemia"].includes(condition);
  const reconstructed = !!patterns[condition];
  const pulse = (offset: number) =>
    0.35 + 0.65 * (0.5 + Math.sin(time * 22 + offset) * 0.5);
  return (
    <section className="teaching-panel" aria-label="Heart to ECG lesson">
      <span className="eyebrow">WHY THIS ECG LOOKS DIFFERENT</span>
      <h3>The heart is the story. ECG is the readout.</h3>
      <span className="teaching-provenance">
        {reconstructed
          ? "Authored timing · recorded-normal waveform components"
          : injury
            ? "Recorded normal + authored ST change"
            : "Recorded ECG · schematic heart timing"}
      </span>
      <svg
        viewBox="0 0 320 190"
        role="img"
        aria-label={`Schematic electrical pathway: ${phase}. ${blocked ? "Conduction blocked." : ""}`}
      >
        <rect
          x="24"
          y="16"
          width="105"
          height="56"
          rx="24"
          transform={`translate(76 44) scale(${1 - 0.08 * (cycle?.atrial ?? 0)}) translate(-76 -44)`}
          fill={atrial ? "#645338" : "#253336"}
        />
        <rect
          x="188"
          y="16"
          width="105"
          height="56"
          rx="24"
          transform={`translate(240 44) scale(${1 - 0.08 * (cycle?.atrial ?? 0)}) translate(-240 -44)`}
          fill={atrial ? "#645338" : "#253336"}
        />
        <path
          d="M40 119 Q25 177 126 180 L133 111Z M187 111 L194 180 Q295 180 280 119Z"
          fill={
            ventricular
              ? state?.beat?.ectopic
                ? "#965d80"
                : "#4a9284"
              : recovery
                ? "#365e57"
                : "#253336"
          }
          transform={`translate(160 145) scale(${condition === "vfib" ? 1 + 0.015 * Math.sin(time * 38) : 1 - 0.08 * (cycle?.squeeze ?? 0)}) translate(-160 -145)`}
        />
        {injury && (
          <ellipse
            cx={condition === "inferior" ? 230 : 251}
            cy={condition === "inferior" ? 169 : 141}
            rx="24"
            ry="13"
            fill="#ed976b"
            opacity={recovery ? 0.85 : 0.35}
          />
        )}
        <path
          d="M75 44 L158 89 L230 44 M158 89 L158 123 L96 152 M158 123 L225 152"
          stroke={blocked ? "#99625d" : "#857354"}
          strokeWidth="3"
          fill="none"
        />
        <circle
          cx="75"
          cy="44"
          r="7"
          fill="#edb77a"
          opacity={atrial ? 1 : 0.25}
        />
        <circle
          cx="158"
          cy="89"
          r="9"
          fill={blocked && blockY === 89 ? "#f08b88" : "#edb77a"}
          opacity={blocked || phase === "AV" ? 1 : 0.3}
        />
        {state?.atrium?.ventricular !== undefined &&
          time >= state.atrium.at &&
          time < state.atrium.ventricular && (
            <circle
              cx={
                75 +
                (83 * (time - state.atrium.at)) /
                  (state.atrium.ventricular - state.atrium.at)
              }
              cy={
                44 +
                (45 * (time - state.atrium.at)) /
                  (state.atrium.ventricular - state.atrium.at)
              }
              r="5"
              fill="#fff"
            />
          )}
        {blocked && (
          <g>
            <circle cx="158" cy={blockY} r="9" fill="#f08b88" />
            <path
              d={`M150 ${blockY - 8} L166 ${blockY + 8} M166 ${blockY - 8} L150 ${blockY + 8}`}
              stroke="#fff"
              strokeWidth="2"
            />
          </g>
        )}
        {[96, 225].map((x, i) => (
          <circle
            key={x}
            cx={x}
            cy="152"
            r={state?.beat?.ectopic ? 10 : 7}
            fill={state?.beat?.ectopic ? "#ea94bd" : "#edb77a"}
            opacity={
              condition === "vfib" ? pulse(i * 3) : ventricular ? 1 : 0.25
            }
          />
        ))}
        {condition === "afib" &&
          [45, 80, 110, 210, 245, 275].map((x, i) => (
            <circle
              key={x}
              cx={x}
              cy={32 + (i % 2) * 20}
              r="4"
              fill="#ffd899"
              opacity={pulse(i * 2)}
            />
          ))}
        {condition === "flutter" && (
          <>
            <ellipse
              cx="76"
              cy="43"
              rx="31"
              ry="18"
              fill="none"
              stroke="#edb77a"
            />
            <circle
              cx={76 + 31 * Math.cos(time * Math.PI * 10)}
              cy={43 + 18 * Math.sin(time * Math.PI * 10)}
              r="5"
              fill="#fff0b2"
            />
          </>
        )}
        <text x="24" y="12">
          ATRIA · upper chambers
        </text>
        <text x="170" y="99">
          AV junction
        </text>
        {condition === "mobitz2" && (
          <text x="170" y="128">
            Below AV node
          </text>
        )}
        <text x="24" y="188">
          VENTRICLES · lower chambers
        </text>
      </svg>
      <div className="teaching-now">
        <b>Now: {phase}</b>
        <span>{cycle?.electrical}</span>
      </div>
      <p className="teaching-caution">
        Flashes show electrical activity; changing chamber size illustrates the
        later muscle response. Gold: atrial timing · mint: ventricular timing ·
        pink: wide ventricular activation · red: blocked atrial impulse ·
        orange: ST teaching interval.
      </p>
      <div className="teaching-actions">
        <button
          onClick={() =>
            document
              .querySelector(".signal-heading")
              ?.scrollIntoView({ behavior: "smooth", block: "start" })
          }
        >
          Back to live ECG ↑
        </button>
        <button onClick={onSlow}>Slow & focus · 0.2×</button>
        <button onClick={onStep}>Step +0.1 s</button>
      </div>
      {patterns[condition] && (
        <p className="teaching-timing">
          {patterns[condition]!.rhythm}. Fixed teaching timing; playback speed
          does not change the intervals.
        </p>
      )}
      <ol>
        <li>
          <b>Inside the heart</b>
          <p>{lesson.heart}</p>
        </li>
        <li>
          <b>What appears on the ECG</b>
          <p>{lesson.ecg}</p>
        </li>
        <li>
          <b>What happens to pumping</b>
          <p>{lesson.pump}</p>
        </li>
      </ol>
      <details>
        <summary>Why electrode placement matters</summary>
        <p>{lesson.placement}</p>
      </details>
      <p className="teaching-caution">
        Schematic chambers and pathways, not measured patient anatomy or pumping
        function. Coloured ECG bands mark model timing—not automated clinical
        measurements.
      </p>
      <a href={lesson.source} target="_blank" rel="noreferrer">
        Medical explanation ↗
      </a>
    </section>
  );
}
