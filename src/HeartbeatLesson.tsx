import { useEffect, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import Teaching from "./Teaching";
import Traces from "./Traces";
import type { CardiacCycle } from "./cardiacCycle";
import type { Condition, Electrode, Lead, Signal } from "./ecg";
import { conditions } from "./ecg";

const routes = [
  {
    label: "Body → right heart",
    vessel: "Systemic veins",
    color: "#76bcf0",
    from: [280, 330],
    via: [100, 330],
    to: [100, 220],
  },
  {
    label: "Right heart → lungs",
    vessel: "Pulmonary arteries",
    color: "#76bcf0",
    from: [100, 170],
    via: [100, 65],
    to: [280, 65],
  },
  {
    label: "Lungs → left heart",
    vessel: "Pulmonary veins",
    color: "#f39380",
    from: [280, 65],
    via: [460, 65],
    to: [460, 170],
  },
  {
    label: "Left heart → body",
    vessel: "Systemic arteries",
    color: "#f39380",
    from: [460, 220],
    via: [460, 330],
    to: [280, 330],
  },
];
export function Circulation({ cycle }: { cycle: CardiacCycle | null }) {
  const travel = (cycle?.travel ?? 0) * 4;
  const halted = cycle?.phase === "VF";
  return (
    <section
      className="circulation-lesson"
      aria-label="Complete circulation schematic"
    >
      <h3>Blood returns to the heart, too.</h3>
      <p>
        Body → right heart → lungs → left heart → body. Both return routes are
        shown below.
      </p>
      <p>
        Electrical activation comes first: QRS marks ventricular activation,
        followed by contraction and ejection. The ECG measures electrical
        differences—not blood moving. The right and left sides pump together;
        the circuit below shows connections, not a one-beat travel time.
      </p>
      <svg
        viewBox="0 0 560 390"
        role="img"
        aria-label="Body to right heart through systemic veins; right heart to lungs through pulmonary arteries; lungs to left heart through pulmonary veins; left heart to body through systemic arteries."
      >
        <defs>
          {["blue", "red"].map((id, i) => (
            <marker
              key={id}
              id={`flow-${id}`}
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto"
            >
              <path d="M0 0 L10 5 L0 10Z" fill={i ? "#f39380" : "#76bcf0"} />
            </marker>
          ))}
        </defs>
        {routes.map((route, index) => (
          <g key={route.label}>
            <path
              d={`M${route.from} Q${route.via} ${route.to}`}
              fill="none"
              stroke={route.color}
              strokeWidth="3"
              opacity={halted ? 0.25 : 0.65}
              markerEnd={`url(#flow-${index < 2 ? "blue" : "red"})`}
            />
            {!halted &&
              [0, 1, 2].map((i) => {
                const u = (((travel + i / 3) % 1) + 1) % 1;
                const at = (axis: number) =>
                  (1 - u) ** 2 * route.from[axis] +
                  2 * (1 - u) * u * route.via[axis] +
                  u * u * route.to[axis];
                return (
                  <circle
                    key={i}
                    cx={at(0)}
                    cy={at(1)}
                    r="5"
                    fill={route.color}
                  />
                );
              })}
          </g>
        ))}
        <rect x="218" y="40" width="124" height="50" rx="20" fill="#344746" />
        <text x="280" y="69" textAnchor="middle">
          Lungs
        </text>
        <rect x="218" y="305" width="124" height="50" rx="20" fill="#344746" />
        <text x="280" y="335" textAnchor="middle">
          Body tissues
        </text>
        <rect x="44" y="170" width="140" height="50" rx="16" fill="#244961" />
        <text x="114" y="200" textAnchor="middle">
          Right heart
        </text>
        <rect x="376" y="170" width="140" height="50" rx="16" fill="#60403b" />
        <text x="446" y="200" textAnchor="middle">
          Left heart
        </text>
        <text x="16" y="120">
          To lungs ↑
        </text>
        <text x="16" y="283">
          Return to heart ↑
        </text>
        <text x="360" y="120">
          Return to heart ↓
        </text>
        <text x="405" y="283">
          To body ↓
        </text>
      </svg>
      <div className="circulation-routes">
        {routes.map((r) => (
          <div key={r.label}>
            <b style={{ color: r.color }}>{r.label}</b>
            <span>{r.vessel}</span>
          </div>
        ))}
      </div>
      <p>
        {halted
          ? "VF: no effective forward pumping is shown."
          : "Blue means relatively oxygen-poor; red means relatively oxygen-rich. Both arteries and veins can carry either kind."}
      </p>
      <p className="teaching-caution">
        Conceptual routes, not extracted vessel geometry. Particle transit time
        and pumping volume are not measured. This replaces the incomplete
        arterial-only overlay; it does not invent venous paths inside the 3D
        atlas.
      </p>
      <details>
        <summary>What about blood supplying the heart muscle?</summary>
        <p>
          The heart muscle has its own coronary circulation: coronary arteries
          supply it, and most venous blood returns through the coronary sinus to
          the right atrium. This is distinct from blood passing through the
          heart chambers.
        </p>
      </details>
      <a
        href="https://openstax.org/books/anatomy-and-physiology-2e/pages/20-5-circulatory-pathways"
        target="_blank"
        rel="noreferrer"
      >
        Circulation reference ↗
      </a>
    </section>
  );
}

export function LessonDialog({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const dialog = ref.current!;
    dialog.showModal();
    return () => {
      dialog.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="heartbeat-dialog"
      aria-label="Follow heartbeat"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const box = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < box.left ||
            e.clientX > box.right ||
            e.clientY < box.top ||
            e.clientY > box.bottom
          )
            onClose();
        }
      }}
    >
      <button
        className="lesson-close"
        onClick={onClose}
        aria-label="Close heartbeat lesson"
      >
        Close ×
      </button>
      {children}
    </dialog>
  );
}
type Props = {
  condition: Condition;
  cycle: CardiacCycle | null;
  time: number;
  running: boolean;
  speed: number;
  onClose: () => void;
  onToggle: () => void;
  onStep: () => void;
  onSpeed: (n: number) => void;
  signal: Signal;
  electrodes: Electrode[];
  leads: Lead[];
  rate: number;
  clock: RefObject<number>;
  cycleRef: RefObject<CardiacCycle | null>;
};
export default function HeartbeatLesson(p: Props) {
  const [topic, setTopic] = useState("electrical");
  return (
    <LessonDialog onClose={p.onClose}>
      <header>
        <span className="eyebrow">FOLLOW HEARTBEAT · OPTIONAL DEEP DIVE</span>
        <h2>{conditions[p.condition].name}</h2>
        <p>One shared clock connects the heart lesson and the ECG.</p>
      </header>
      <div className="lesson-topic" role="group" aria-label="Lesson topic">
        <button
          aria-pressed={topic === "electrical"}
          onClick={() => setTopic("electrical")}
        >
          Electrical activity
        </button>
        <button
          aria-pressed={topic === "circulation"}
          onClick={() => setTopic("circulation")}
        >
          Blood circulation
        </button>
      </div>
      <div className="lesson-transport">
        <button onClick={p.onToggle}>
          {p.running ? "Pause lesson" : "Play lesson"}
        </button>
        <button onClick={p.onStep}>Next moment · 0.1 s</button>
        <label>
          Lesson speed{" "}
          <select
            aria-label="Lesson speed"
            value={p.speed}
            onChange={(e) => p.onSpeed(+e.target.value)}
          >
            <option value={0.2}>0.2×</option>
            <option value={0.5}>0.5×</option>
            <option value={1}>1×</option>
          </select>
        </label>
        <span>
          {p.cycle?.phase} · {(p.time % 12).toFixed(1)} s
        </span>
      </div>
      <div className="lesson-layout">
        <div>
          {topic === "circulation" ? (
            <Circulation cycle={p.cycle} />
          ) : (
            <Teaching
              condition={p.condition}
              cycle={p.cycle}
              time={p.time}
              onSlow={() => p.onSpeed(0.2)}
              onStep={p.onStep}
              compactControls
            />
          )}
        </div>
        <section className="lesson-ecg">
          <h3>The same ECG, at the same moment</h3>
          <p>
            Up to three of your selected leads. Timing colours are teaching
            annotations.
          </p>
          <Traces
            signal={p.signal}
            electrodes={p.electrodes}
            leads={p.leads}
            condition={p.condition}
            rate={p.rate}
            clock={p.clock}
            compare={null}
            gain={1}
            span={6}
            cycle={p.cycleRef}
            rowHeight={200}
          />
          <p className="lesson-mechanics">{p.cycle?.mechanical}</p>
          <p className="teaching-caution">
            Illustrative mechanics, not measured blood pressure or cardiac
            output. Educational only—not for diagnosis.
          </p>
        </section>
      </div>
    </LessonDialog>
  );
}
