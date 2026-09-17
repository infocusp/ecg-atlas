import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  ChevronDown,
  Expand,
  Layers,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Scan,
  SlidersHorizontal,
  Trash2,
  X,
  BookOpen,
  Move,
  Copy,
  HeartPulse,
} from "lucide-react";
import Anatomy from "./Anatomy";
import Traces from "./Traces";
import type { Snapshot } from "./Traces";
import {
  analyse,
  anchors,
  colors,
  conditions,
  distance,
  injuryVisibility,
  leadsFor,
  preset,
  sourceSample,
  stage,
} from "./ecg";
import type { Condition, Electrode, Point, Signal } from "./ecg";
import { cardiacCycle } from "./cardiacCycle";
import { patterns } from "./patterns";
import Teaching, { lessons } from "./Teaching";
import type { CardiacCycle } from "./cardiacCycle";
export default function App() {
  const [electrodes, setElectrodes] = useState<Electrode[]>(
      preset("2-electrode"),
    ),
    [selected, setSelected] = useState("LA"),
    [placing, setPlacing] = useState(false),
    [condition, setCondition] = useState<Condition>("normal"),
    [rate, setRate] = useState(72),
    [running, setRunning] = useState(
      () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
    [speed, setSpeed] = useState(1),
    [time, setTime] = useState(8),
    [xray, setXray] = useState(true),
    [focus, setFocus] = useState(false),
    [view, setView] = useState(0),
    [setup, setSetup] = useState("2-electrode"),
    [advanced, setAdvanced] = useState(false),
    [all, setAll] = useState(false),
    [gain, setGain] = useState(1),
    [span, setSpan] = useState(6),
    [compare, setCompare] = useState<Snapshot | null>(null),
    [library, setLibrary] = useState<Record<string, Signal>>({}),
    [error, setError] = useState(""),
    [tab, setTab] = useState("explore"),
    [rawId, setRawId] = useState("normal"),
    [activeLead, setActiveLead] = useState("all"),
    [message, setMessage] = useState(
      "Select an electrode, then place it anywhere on the body.",
    ),
    [sources, setSources] = useState(false),
    [flow, setFlow] = useState(true),
    [cycleView, setCycleView] = useState<CardiacCycle | null>(null);
  const clock = useRef(8),
    stageRef = useRef(""),
    vector = useRef<Point>([0, 0, 0]),
    cycle = useRef<CardiacCycle | null>(null);
  const live = useRef({ running, speed, rate, condition, library });
  live.current = { running, speed, rate, condition, library };
  useEffect(() => {
    let cancelled = false;
    Promise.all(
      ["normal", "afib", "vfib", "mi-recording"].map(async (id) => {
        const r = await fetch("/signals/" + id + ".json");
        if (!r.ok) throw Error("Signal library unavailable");
        return [id, await r.json()] as [string, Signal];
      }),
    )
      .then((pairs) => {
        if (!cancelled) setLibrary(Object.fromEntries(pairs));
      })
      .catch((e) => setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    let frame = 0,
      last = performance.now(),
      ui = 0;
    const tick = (now: number) => {
      const p = live.current;
      if (p.running && !document.hidden)
        clock.current += Math.min((now - last) / 1000, 0.1) * p.speed;
      last = now;
      const s =
        p.library[
          p.condition === "afib"
            ? "afib"
            : p.condition === "vfib"
              ? "vfib"
              : "normal"
        ];
      if (s) {
        cycle.current = cardiacCycle(s, clock.current, p.rate, p.condition);
        stageRef.current = stage(s, clock.current, p.rate, p.condition);
        vector.current = s.signals.VX
          ? [
              sourceSample(s, "VX", clock.current, p.rate),
              -sourceSample(s, "VY", clock.current, p.rate),
              -sourceSample(s, "VZ", clock.current, p.rate),
            ]
          : [
              sourceSample(s, "I", clock.current, p.rate),
              -sourceSample(s, "II", clock.current, p.rate),
              sourceSample(s, "V2", clock.current, p.rate),
            ];
        if (p.condition === "vfib") {
          const a = s.signals.ECG;
          const idx = Math.floor(clock.current * s.hz) % a.length;
          vector.current = [
            a[idx],
            a[(idx + 20) % a.length],
            a[(idx + 43) % a.length],
          ];
        }
      }
      if (now - ui > 100) {
        setTime(clock.current);
        setCycleView(cycle.current);
        ui = now;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);
  const signal =
    library[
      condition === "afib" ? "afib" : condition === "vfib" ? "vfib" : "normal"
    ];
  const leads = leadsFor(electrodes, all);
  const shown =
    activeLead === "all" ? leads : leads.filter((l) => l.id === activeLead);
  const moved = electrodes.some(
    (e) => !anchors[e.id] || distance(e.position, anchors[e.id]) > 0.02,
  );
  const overlap = electrodes.some(
    (a, i) =>
      a.id !== "RL" &&
      electrodes
        .slice(i + 1)
        .some((b) => b.id !== "RL" && distance(a.position, b.position) < 0.025),
  );
  const changePreset = (name: string) => {
    setSetup(name);
    setElectrodes(preset(name));
    setSelected("LA");
    setPlacing(false);
    setActiveLead("all");
    setMessage(
      name === "wearable"
        ? "Wrist and opposite-hand contact form one electrical view. Device algorithms are not simulated."
        : "Preset loaded. Every electrode can still be moved.",
    );
  };
  const move = (id: string, position: Point) => {
    setElectrodes((e) => e.map((v) => (v.id === id ? { ...v, position } : v)));
    setPlacing(false);
    setMessage(`${id} moved. All affected leads have been recalculated.`);
  };
  const add = () => {
    const id =
      Object.keys(anchors).find(
        (id) => id !== "RL" && !electrodes.some((e) => e.id === id),
      ) ?? `E${electrodes.length + 1}`;
    setElectrodes((e) => [
      ...e,
      { id, position: anchors[id] ? [...anchors[id]] : [0, 2.2, 0.2] },
    ]);
    setSelected(id);
    setPlacing(true);
    setMessage(`${id} added. Click the body to choose its position.`);
  };
  const save = () => {
    if (signal) {
      setCompare({
        electrodes: structuredClone(electrodes),
        condition,
        rate,
        signal,
      });
      setMessage("Reference saved. Change placement or condition to compare.");
    }
  };
  const reset = () => {
    changePreset("2-electrode");
    setCondition("normal");
    setCompare(null);
    setRate(72);
    setAll(false);
    setGain(1);
    setRunning(true);
    setFocus(false);
    setView((v) => v + 1);
    clock.current = 8;
  };
  const visibility = shown
    .map((l) => ({
      id: l.id,
      shift: injuryVisibility(electrodes, l, condition),
    }))
    .sort((a, b) => Math.abs(b.shift) - Math.abs(a.shift));
  useEffect(() => {
    if (!sources) return;
    const before = document.activeElement as HTMLElement;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSources(false);
      if (e.key === "Tab") {
        const items = Array.from(
          document.querySelectorAll<HTMLElement>(".modal button,.modal a"),
        );
        const first = items[0],
          last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      before?.focus();
    };
  }, [sources]);
  const raw = library[rawId];
  const rawLeads = raw
    ? Object.keys(raw.signals).map((id, i) => ({
        id,
        label: id,
        terms: [] as [string, number][],
        color: colors[i % colors.length],
      }))
    : [];
  return (
    <div className="app">
      <header className="topbar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setTab("explore");
          }}
        >
          <span className="brand-mark">
            <Activity size={24} />
          </span>
          ECG<span>ATLAS</span>
        </a>
        <nav aria-label="Workspace">
          <button
            className={tab === "explore" ? "active" : ""}
            onClick={() => setTab("explore")}
          >
            Explorer
          </button>
          <button
            className={tab === "library" ? "active" : ""}
            onClick={() => setTab("library")}
          >
            <BookOpen size={15} /> Signal library <small>04</small>
          </button>
        </nav>
        <div className="header-end">
          <span className="educational">An electrical heart, made visible</span>
          <button className="icon" aria-label="Reset explorer" onClick={reset}>
            <RotateCcw size={17} />
          </button>
        </div>
      </header>
      <div
        className="public-notice"
        aria-label="Educational use and getting started"
      >
        <div>
          <strong>Explore the heart. Understand the ECG.</strong>
          <span>
            Educational simulation · Not for diagnosis · Not clinically
            validated
          </span>
        </div>
        <div className="public-actions">
          <button
            className="start-lesson"
            onClick={() => {
              reset();
              setSpeed(0.2);
              setFocus(true);
              setXray(true);
              setTab("explore");
              document.querySelector(".signals-panel")?.scrollTo({ top: 0 });
            }}
          >
            Start guided lesson
          </button>
          <button onClick={() => setSources(true)}>
            Credits & limitations
          </button>
        </div>
      </div>
      <div className="workspace">
        <aside className="sidebar">
          <div className="eyebrow">YOUR EXPERIMENT</div>
          <h1>
            A different view.
            <br />
            The same heart.
          </h1>
          <p className="intro">
            Move the electrodes. Discover what each lead can see.
          </p>
          <section>
            <label className="section-title" htmlFor="setup">
              Electrode setup <span>01</span>
            </label>
            <div className="select-wrap">
              <select
                id="setup"
                value={setup}
                onChange={(e) => changePreset(e.target.value)}
              >
                <option value="2-electrode">Two electrodes · Lead I</option>
                <option value="3-electrode">
                  Three electrodes · limb views
                </option>
                <option value="12-lead">12-lead ECG · 10 electrodes</option>
                <option value="wearable">
                  Wearable · wrist + opposite finger
                </option>
              </select>
              <ChevronDown size={15} />
            </div>
            <div className="electrode-heading">
              <span>{electrodes.length} electrodes</span>
              <button
                className="text-button"
                onClick={add}
                disabled={electrodes.length >= 12}
              >
                <Plus size={14} /> Add
              </button>
            </div>
            <div className="electrode-list">
              {electrodes.map((e, i) => (
                <button
                  key={e.id}
                  className={
                    "electrode " + (selected === e.id ? "selected" : "")
                  }
                  onClick={() => {
                    setSelected(e.id);
                    setPlacing(false);
                  }}
                >
                  <i style={{ background: colors[i % colors.length] }} />
                  <b>{e.id}</b>
                  <span>
                    {e.id === "RL"
                      ? "Body reference"
                      : anchors[e.id] &&
                          distance(e.position, anchors[e.id]) < 0.02
                        ? "Preset position"
                        : "Custom position"}
                  </span>
                  {selected === e.id && <Move size={13} />}
                </button>
              ))}
            </div>
            <div className="electrode-actions">
              <button
                className={placing ? "primary active" : "primary"}
                onClick={() => {
                  setPlacing((v) => !v);
                  if (innerWidth < 621)
                    document
                      .querySelector(".scene-panel")
                      ?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <Move size={14} />
                {placing
                  ? "Click a point on the body"
                  : "Place " + selected + " on body"}
              </button>
              <button
                className="icon"
                aria-label={"Remove " + selected}
                disabled={electrodes.length <= 2}
                onClick={() => {
                  setElectrodes((e) => e.filter((v) => v.id !== selected));
                  setSelected(electrodes.find((e) => e.id !== selected)!.id);
                  setActiveLead("all");
                }}
              >
                <Trash2 size={15} />
              </button>
            </div>
            <button
              className="small-link"
              onClick={() => {
                const other = electrodes.find(
                  (e) => e.id !== selected && e.id !== "RL",
                );
                if (other) move(selected, [...other.position]);
              }}
            >
              Try both at the same location <ArrowUpRight size={12} />
            </button>
          </section>
          <section>
            <label className="section-title" htmlFor="condition">
              Heart condition <span>02</span>
            </label>
            <div className="condition-grid">
              {(Object.keys(conditions) as Condition[]).map((id) => (
                <button
                  key={id}
                  className={condition === id ? "selected" : ""}
                  onClick={() => {
                    setCondition(id);
                    if (patterns[id]) {
                      setRate(Math.round(patterns[id]!.rate));
                      clock.current = 0;
                      setTime(0);
                    }
                    if (library[id])
                      setRate(Math.round(analyse(library[id]).rate));
                    else if (!patterns[id]) setRate(72);
                    setMessage(conditions[id].description);
                  }}
                >
                  {conditions[id].short}
                </button>
              ))}
            </div>
            <button
              className="compare-normal"
              onClick={() =>
                document
                  .querySelector(".teaching-panel")
                  ?.scrollIntoView({ behavior: "smooth", block: "nearest" })
              }
            >
              Explain this pattern ↓
            </button>
            <div className="range-label">
              <label htmlFor="rate">
                {patterns[condition]
                  ? "Mean ventricular rate"
                  : condition === "afib"
                    ? "Ventricular rate"
                    : "Heart rate"}
              </label>
              <output>
                {condition === "vfib" ? "—" : rate}
                <small> bpm</small>
              </output>
            </div>
            <input
              id="rate"
              type="range"
              min="40"
              max={condition === "vt" ? "200" : "160"}
              value={rate}
              disabled={condition === "vfib" || !!patterns[condition]}
              onChange={(e) => setRate(+e.target.value)}
            />
            <div className="range-ends">
              <span>40</span>
              <span>{condition === "vt" ? "200" : "160"}</span>
            </div>
            {patterns[condition] && (
              <p className="teaching-caution">
                Fixed teaching sequence · {patterns[condition]!.rhythm}. Use
                playback speed to slow the lesson.
              </p>
            )}
          </section>
          <button
            className="advanced-toggle"
            onClick={() => setAdvanced((v) => !v)}
            aria-expanded={advanced}
          >
            <SlidersHorizontal size={15} /> Display & comparisons{" "}
            <ChevronDown size={14} />
          </button>
          {advanced && (
            <div className="advanced">
              <label>
                Gain
                <select value={gain} onChange={(e) => setGain(+e.target.value)}>
                  <option value={0.5}>½×</option>
                  <option value={1}>1×</option>
                  <option value={2}>2×</option>
                </select>
              </label>
              <label>
                Time window
                <select value={span} onChange={(e) => setSpan(+e.target.value)}>
                  <option value={3}>3 seconds</option>
                  <option value={6}>6 seconds</option>
                  <option value={10}>10 seconds</option>
                </select>
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={all}
                  onChange={(e) => {
                    setAll(e.target.checked);
                    setActiveLead("all");
                  }}
                />{" "}
                All pairwise / augmented views
              </label>
            </div>
          )}
          <div className="sidebar-bottom">
            <button className="text-button" onClick={() => setSources(true)}>
              About the model <ArrowUpRight size={14} />
            </button>
            <p>Educational simulation. Not for diagnosis.</p>
          </div>
        </aside>
        <main className="main-surface">
          {tab === "explore" ? (
            <>
              <div className="scene-panel">
                <div className="scene-top">
                  <div>
                    <span className="eyebrow">
                      BODYPARTS3D / REFERENCE ANATOMY
                    </span>
                    <div className="scene-title">
                      The electrical heart <span>3D</span>
                    </div>
                  </div>
                  <button
                    className={"view-chip " + (xray ? "active" : "")}
                    onClick={() => setXray((v) => !v)}
                  >
                    <Layers size={14} />
                    {xray ? "Inside the body" : "Skin surface"}
                  </button>
                </div>
                <Anatomy
                  electrodes={electrodes}
                  selected={selected}
                  placing={placing}
                  onSelect={setSelected}
                  onMove={move}
                  time={clock}
                  condition={condition}
                  stage={stageRef}
                  vector={vector}
                  xray={xray}
                  focus={focus}
                  view={view}
                  flow={flow}
                  cycle={cycle}
                />
                <div className="flow-key">
                  <span>
                    <i className="electric" /> Electrical activation
                  </span>
                  {flow && (
                    <>
                      <span>
                        <i className="oxygenated" /> Blood toward body
                      </span>
                      <span>
                        <i className="deoxygenated" /> Blood toward lungs
                      </span>
                    </>
                  )}
                  <small>Colour and speed are illustrative</small>
                  {["anterior", "inferior", "ischemia"].includes(condition) && (
                    <small>
                      Orange patch: schematic altered electrical region
                    </small>
                  )}
                </div>
                <div className="body-side-label">
                  PATIENT’S RIGHT <span>↔</span> PATIENT’S LEFT
                </div>
                <div className="scene-tools">
                  <button
                    className={flow ? "active" : ""}
                    aria-pressed={flow}
                    onClick={() => {
                      setFlow((v) => !v);
                      setXray(true);
                    }}
                  >
                    Blood flow {flow ? "on" : "off"}
                  </button>
                  <button
                    onClick={() => {
                      setFlow(true);
                      setXray(true);
                      setFocus(true);
                      setSpeed(0.2);
                      setRunning(true);
                    }}
                  >
                    Follow a heartbeat · 0.2×
                  </button>
                  <button
                    className={focus ? "active" : ""}
                    onClick={() => setFocus((v) => !v)}
                  >
                    <Scan size={16} />
                    {focus ? "Whole body" : "Heart detail"}
                  </button>
                  <button
                    className="icon"
                    aria-label="Reset camera"
                    onClick={() => setView((v) => v + 1)}
                  >
                    <Expand size={16} />
                  </button>
                </div>
                <div className="scene-bottom">
                  <span>
                    <i className={running ? "live-dot" : "paused-dot"} />
                    {running ? "LIVE SIMULATION" : "PAUSED"}
                  </span>
                  <span>Drag to rotate · scroll to zoom</span>
                </div>
              </div>
              <div
                className="cycle-story"
                aria-label="Electrical activity and blood flow"
              >
                <div className="cycle-story-heading">
                  <strong>Electricity first. Blood movement follows.</strong>
                  <span>{cycleView?.phase ?? "…"}</span>
                </div>
                <div className="cycle-steps">
                  <div>
                    <b>1 · Electrical signal</b>
                    <span>{cycleView?.electrical ?? "Loading…"}</span>
                  </div>
                  <div
                    className={(cycleView?.squeeze ?? 0) > 0.1 ? "active" : ""}
                  >
                    <b>2 · Muscle response</b>
                    <span>{cycleView?.mechanical ?? "Loading…"}</span>
                  </div>
                  <div
                    className={
                      (cycleView?.ejection ?? 0) > 0.05 ? "active blood" : ""
                    }
                  >
                    <b>3 · Blood movement</b>
                    <span>{cycleView?.blood ?? "Loading…"}</span>
                  </div>
                </div>
                <p>
                  The ECG records electrical activation and recovery—not blood
                  moving through the electrodes.
                </p>
              </div>
              <div className="conduction-bar">
                <span className="conduction-icon">
                  <HeartPulse size={22} />
                </span>
                <div>
                  <span className="eyebrow">INSIDE THIS MOMENT</span>
                  <strong>
                    {stageRef.current || "Loading the recorded heartbeat…"}
                  </strong>
                </div>
                <div className="phase-chips">
                  {["P", "QRS", "T"].map((p) => (
                    <span
                      key={p}
                      className={
                        stageRef.current.startsWith(p + " ·") ? "active" : ""
                      }
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
              <div className="playback">
                <button
                  className="play"
                  aria-label={running ? "Pause simulation" : "Play simulation"}
                  onClick={() => setRunning((v) => !v)}
                >
                  {running ? <Pause size={17} /> : <Play size={17} />}
                </button>
                <div className="scrub">
                  <label htmlFor="scrub">
                    Explore a moment <span>{(time % 12).toFixed(1)} s</span>
                  </label>
                  <input
                    id="scrub"
                    type="range"
                    min="0"
                    max="12"
                    step=".01"
                    value={time % 12}
                    onChange={(e) => {
                      clock.current = +e.target.value;
                      setTime(clock.current);
                      setRunning(false);
                    }}
                  />
                </div>
                <select
                  aria-label="Playback speed"
                  value={speed}
                  onChange={(e) => setSpeed(+e.target.value)}
                >
                  <option value={0.2}>0.2×</option>
                  <option value={0.5}>0.5×</option>
                  <option value={1}>1×</option>
                </select>
              </div>
            </>
          ) : (
            <div className="library-panel">
              <span className="eyebrow">RECORDED SIGNALS / OPEN DATA</span>
              <h1>The recordings behind the model.</h1>
              <p>
                Inspect the original channels. Electrode movement affects the
                Explorer; these reference recordings retain their original
                placement.
              </p>
              <div className="library-cards">
                {Object.values(library).map((s) => (
                  <button
                    className={s.id === rawId ? "selected" : ""}
                    key={s.id}
                    onClick={() => setRawId(s.id)}
                  >
                    <Activity size={20} />
                    <b>{s.name}</b>
                    <span>{s.dataset}</span>
                    <small>
                      {Object.keys(s.signals).length} channels · {s.hz} Hz
                    </small>
                  </button>
                ))}
              </div>
              {raw && (
                <>
                  <div className="source-description">
                    <b>{raw.name}</b>
                    <p>{raw.placement}</p>
                    <a href={raw.url} target="_blank" rel="noreferrer">
                      Dataset & licence <ArrowUpRight size={13} />
                    </a>
                    <code>{raw.record}</code>
                  </div>
                  <div className="library-traces">
                    <Traces
                      signal={raw}
                      electrodes={[]}
                      leads={rawLeads}
                      condition={condition}
                      rate={rate}
                      clock={clock}
                      compare={null}
                      gain={gain}
                      span={span}
                      raw
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </main>
        <aside className="signals-panel">
          <div className="signal-heading">
            <span className="eyebrow">YOUR ELECTRICAL VIEWS</span>
            <div>
              <h2>
                {leads.length === 1
                  ? "One lead. One perspective."
                  : `${leads.length} leads. Different perspectives.`}
              </h2>
              <Activity size={20} />
            </div>
            <p>
              {moved
                ? "Custom electrode placement"
                : "Preset electrode placement"}{" "}
              ·{" "}
              {condition === "normal"
                ? "recording-derived"
                : conditions[condition].short}
            </p>
            <div className="signal-provenance">
              {patterns[condition]
                ? "Teaching reconstruction · recorded-normal components + authored timing"
                : ["anterior", "inferior", "ischemia"].includes(condition)
                  ? "Recorded normal + authored ST changes"
                  : "Recorded ECG · illustrative placement model"}
            </div>
            <p className="lesson-preview">{lessons[condition].ecg}</p>
            <button
              className="start-lesson explain-cta"
              onClick={() => {
                setSpeed(0.2);
                setFocus(true);
                setXray(true);
                document
                  .querySelector(".teaching-panel")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              Explain this ECG →
            </button>
          </div>
          <div className="trace-controls">
            <button onClick={save}>
              <Copy size={14} />
              {compare ? "Replace reference" : "Save reference"}
            </button>
            <select
              aria-label="Visible lead"
              value={activeLead}
              onChange={(e) => setActiveLead(e.target.value)}
            >
              <option value="all">All leads</option>
              {leads.map((l) => (
                <option key={l.id}>{l.id}</option>
              ))}
            </select>
          </div>
          {compare && (
            <div className="comparison-note">
              <span>╍ Reference: {conditions[compare.condition].short}</span>
              <button
                className="icon"
                aria-label="Clear reference"
                onClick={() => setCompare(null)}
              >
                <X size={13} />
              </button>
            </div>
          )}
          <div className="traces">
            {error ? (
              <p role="alert">{error}. Please reload.</p>
            ) : signal ? (
              <Traces
                signal={signal}
                electrodes={electrodes}
                leads={shown}
                condition={condition}
                rate={rate}
                clock={clock}
                compare={compare}
                cycle={cycle}
                gain={gain}
                span={span}
              />
            ) : (
              <div className="signal-loading">Loading recorded ECGs…</div>
            )}
          </div>
          <div className="scale-note">
            <span>Shared amplitude scale · {gain}×</span>
            <span>{span} s window</span>
          </div>
          <div className={"insight " + (overlap ? "warning" : "")}>
            <span className="eyebrow">
              {overlap ? "TRY THIS / SAME LOCATION" : "WHY THE SIGNAL CHANGES"}
            </span>
            <h3>
              {overlap
                ? "Same potential. Almost no difference."
                : moved
                  ? "A new position changes the view."
                  : "Each lead measures a difference."}
            </h3>
            <p>
              {overlap
                ? "When two electrodes occupy the same point, their ideal voltage difference is zero. A flat lead here describes placement, not a stopped heart."
                : "The trace compares electrical potential at the electrodes. Moving a pad can change the shape, size and direction of the waveform."}
            </p>
          </div>
          <Teaching
            condition={condition}
            cycle={cycleView}
            time={time}
            onSlow={() => {
              setSpeed(0.2);
              setRunning(true);
              setFocus(true);
              setXray(true);
            }}
            onStep={() => {
              setRunning(false);
              clock.current += 0.1;
              setTime(clock.current);
            }}
          />
          <div className="condition-note">
            <span className="eyebrow">{conditions[condition].name}</span>
            <p>{conditions[condition].description}</p>
            {(condition === "anterior" ||
              condition === "inferior" ||
              condition === "ischemia") &&
              visibility[0] && (
                <div className="visibility">
                  <b>
                    {visibility[0].id}: {visibility[0].shift >= 0 ? "+" : ""}
                    {visibility[0].shift.toFixed(2)} mV
                  </b>
                  <span>
                    Largest modeled ST change among the displayed leads. This
                    changes as you move the electrodes.
                  </span>
                </div>
              )}
            {condition !== "normal" && (
              <>
                <button
                  className="compare-normal"
                  disabled={!library.normal}
                  onClick={() => {
                    setCompare({
                      electrodes: structuredClone(electrodes),
                      condition: "normal",
                      rate,
                      signal: library.normal,
                    });
                    setMessage(
                      "Normal reference at the same electrode positions. Dashed trace shows normal.",
                    );
                  }}
                >
                  <Copy size={13} /> Compare with normal here
                </button>
                <small>
                  A feature that is not visible in this view does not rule out
                  disease.
                </small>
              </>
            )}
          </div>
          <p className="status-note" aria-live="polite">
            {message}
          </p>
          <button className="source-button" onClick={() => setSources(true)}>
            How this signal is made <ArrowUpRight size={14} />
          </button>
        </aside>
      </div>
      {sources && (
        <div className="modal-backdrop" onClick={() => setSources(false)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="About the model"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              autoFocus
              className="icon close"
              aria-label="Close"
              onClick={() => setSources(false)}
            >
              <X />
            </button>
            <span className="eyebrow">THE MODEL & ITS LIMITS</span>
            <h2>Real recordings. Illustrated viewpoints.</h2>
            <p>
              New rhythm lessons use authored event schedules and waveform
              components extracted from the normal PTB recording, not additional
              patient recordings. Flutter waves are authored. Fixed schedules
              preserve PR intervals, dropped beats and independent
              atrial/ventricular clocks; the rate slider is disabled for these
              lessons. The animated block location, ectopic focus and mechanics
              are illustrative, not patient-specific findings.
            </p>
            <p>
              Inspired by{" "}
              <a
                href="https://github.com/sontakey/plethscape"
                target="_blank"
                rel="noreferrer"
              >
                Plethscape
              </a>{" "}
              by Sameer Sontakey, reusing its processed anatomical models and
              vessel metadata. Original anatomy: BodyParts3D and Human Reference
              Atlas. ECG Atlas is an independent educational project.{" "}
              <a href="/ATTRIBUTION.md" target="_blank" rel="noreferrer">
                Credits, dataset sources, and licenses ↗
              </a>
            </p>
            <p>
              Blood particles follow selected artery centre-lines from the
              anatomical source. Red marks outflow toward the body; blue marks
              outflow toward the lungs. Not all connecting vessels are shown,
              and the particles do not represent a complete circuit or
              calibrated flow speed. Heart squeezing and ejection timing are
              illustrative and follow the recorded R peaks. In VF, directional
              pumping stops; AFib preserves irregular ventricular timing without
              a coordinated atrial squeeze. STEMI examples do not predict
              pumping efficiency.{" "}
              <a
                href="https://openstax.org/books/anatomy-and-physiology-2e/pages/19-3-cardiac-cycle"
                target="_blank"
                rel="noreferrer"
              >
                Read about the cardiac cycle ↗
              </a>
            </p>
            <p>
              Normal and AFib traces use short PTB and PTB-XL recordings. The
              simulator removes a constant baseline offset, changes playback
              timing with the rate control, and interpolates electrode
              potentials between conventional positions. Free-placement traces
              are estimates; the body is not the recorded patient.
            </p>
            <p>
              Anterior and inferior STEMI examples add a clearly authored
              regional ST-change pattern to a recorded normal heartbeat. They
              are teaching transformations, not relabelled patient recordings.
              VF uses an annotated CU recording, with illustrative spatial
              extrapolation from one channel.
            </p>
            <p>
              The heart vector uses recorded Frank X/Y/Z channels where
              available. Conduction paths and P/QRS/T timing are schematic. P is
              atrial activation; QRS is ventricular activation; T is ventricular
              recovery. The underlying anatomy has no measured electrical
              conduction network.
            </p>
            <p>
              Three measurement electrodes provide three bipolar leads, with
              only two independent differences; augmented views are also
              derivable. A conventional 12-lead ECG uses ten electrodes. RL is a
              body reference, not another diagnostic lead. The wearable preset
              illustrates contact geometry, not a particular product’s
              performance.
            </p>
            <p>
              Arbitrary placement is interpolated from standard views and has
              not been clinically validated. ST elevation has causes other than
              heart attack, and a normal-looking ECG does not exclude a heart
              attack.
            </p>
            <div className="source-links">
              {Object.values(library).map((s) => (
                <a key={s.id} href={s.url} target="_blank" rel="noreferrer">
                  {s.dataset} · {s.license} <ArrowUpRight size={14} />
                </a>
              ))}
              <a href="/ATTRIBUTION.md" target="_blank">
                BodyParts3D / HRA anatomy attribution ↗
              </a>
            </div>
            <small>
              Derived from Plethscape’s CC BY anatomy assets. Restricted scanned
              heads and brand assets are not included.
            </small>
          </div>
        </div>
      )}
    </div>
  );
}
