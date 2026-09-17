// Reproducible, small PhysioNet import. No patient-identifying metadata is shipped.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
fs.mkdirSync(".data-cache", { recursive: true });
fs.mkdirSync("public/signals", { recursive: true });
function get(url) {
  const p =
    ".data-cache/" + crypto.createHash("sha256").update(url).digest("hex");
  if (!fs.existsSync(p))
    fs.writeFileSync(
      p,
      execFileSync("curl", ["-sSL", "--fail", "--retry", "2", url], {
        maxBuffer: 30e6,
      }),
    );
  return fs.readFileSync(p);
}
function header(base) {
  return get(base + ".hea").toString();
}
function record(base, start = 0, duration = 12) {
  const h = header(base),
    lines = h.trim().split("\n"),
    top = lines[0].split(/\s+/),
    n = +top[1],
    hz = +top[2];
  const rows = lines.slice(1, n + 1).map((l) => l.trim().split(/\s+/));
  const samples = Math.min(+top[3] - start * hz, duration * hz),
    step = Math.max(1, Math.round(hz / 250));
  const signals = {},
    hashes = {};
  for (let ch = 0; ch < n; ch++) {
    const row = rows[ch];
    const dat = get(base.substring(0, base.lastIndexOf("/") + 1) + row[0]);
    hashes[row[0]] = crypto.createHash("sha256").update(dat).digest("hex");
    const siblings = rows.filter((r) => r[0] === row[0]),
      local = siblings.indexOf(row);
    const read = (idx) => {
      if (row[1] === "16") return dat.readInt16LE(idx * 2);
      if (row[1] === "212") {
        const off = Math.floor(idx / 2) * 3,
          b = dat[off + 1];
        let v =
          idx % 2 ? dat[off + 2] + ((b >> 4) << 8) : dat[off] + ((b & 15) << 8);
        return v >= 2048 ? v - 4096 : v;
      }
      throw Error("Unsupported " + row[1]);
    };
    const gain = +row[2].split("/")[0].split("(")[0],
      baseline = row[2].includes("(")
        ? +row[2].split("(")[1].split(")")[0]
        : +row[4];
    signals[row.at(-1).toUpperCase()] = Array.from(
      { length: Math.floor(samples / step) },
      (_, j) => {
        let v = 0;
        for (let k = 0; k < step; k++)
          v +=
            (read((start * hz + j * step + k) * siblings.length + local) -
              baseline) /
            gain;
        return +(v / step).toFixed(5);
      },
    );
  }
  return {
    hz: hz / step,
    signals,
    header: h,
    source: base,
    sha256: JSON.stringify(hashes),
    startSeconds: start,
  };
}
const root = "https://physionet.org/files/ptbdb/1.0.0/";
const normal = record(root + "patient105/s0303lre", 4, 12);
const infarct = record(root + "patient001/s0010_re", 4, 12);
const library = [
  {
    id: "normal",
    name: "Healthy control",
    dataset: "PTB Diagnostic ECG Database",
    record: "patient105/s0303lre",
    license: "ODC-By 1.0",
    url: "https://physionet.org/content/ptbdb/1.0.0/",
    placement:
      "Standard 12-lead ECG and Frank X/Y/Z leads. Original subject coordinates are not provided.",
    ...normal,
  },
  {
    id: "mi-recording",
    name: "Recorded myocardial infarction",
    dataset: "PTB Diagnostic ECG Database",
    record: "patient001/s0010_re",
    license: "ODC-By 1.0",
    url: "https://physionet.org/content/ptbdb/1.0.0/",
    placement:
      "Standard 12-lead ECG and Frank X/Y/Z leads. This record is not assumed to represent acute STEMI.",
    ...infarct,
  },
];
// Parse quoted CSV without retaining demographics or reports in the output.
function csv(line) {
  return (line.match(/("(?:[^"]|"")*"|[^,]*)(,|$)/g) || [])
    .slice(0, -1)
    .map((v) => v.replace(/,$/, "").replace(/^"|"$/g, "").replace(/""/g, '"'));
}
const xl = "https://physionet.org/files/ptb-xl/1.0.3/";
const lines = get(xl + "ptbxl_database.csv")
  .toString()
  .trim()
  .split("\n");
const cols = csv(lines[0]);
const afrow = lines
  .slice(1)
  .map(csv)
  .find((r) => r[cols.indexOf("scp_codes")]?.includes("'AFIB': 100"));
if (!afrow) throw Error("No high-confidence AF example");
const afpath = afrow[cols.indexOf("filename_hr")],
  af = record(xl + afpath, 0, 10);
library.push({
  id: "afib",
  name: "Recorded atrial fibrillation",
  dataset: "PTB-XL",
  record: afpath,
  license: "CC BY 4.0",
  url: "https://physionet.org/content/ptb-xl/1.0.3/",
  placement:
    "Standard 12-lead ECG; AFIB annotation confidence 100. Individual electrode coordinates are unavailable.",
  ...af,
});
// Read WFDB rhythm annotations so VF is selected explicitly, not guessed.
const cu = "https://physionet.org/files/cudb/1.0.0/cu01";
const ann = get(cu + ".atr");
let sample = 0,
  lastType = 0;
const rhythms = [];
for (let i = 0; i + 1 < ann.length;) {
  const word = ann.readUInt16LE(i);
  i += 2;
  const type = word >> 10,
    delta = word & 1023;
  if (!word) break;
  if (type === 59) {
    sample += ann.readInt16LE(i) * 65536 + ann.readUInt16LE(i + 2);
    i += 4;
  } else if (type === 63) {
    const txt = ann
      .subarray(i, i + delta)
      .toString()
      .replace(/\0/g, "");
    i += delta + (delta % 2);
    rhythms.push({ sample, txt, type: lastType });
  } else if (type < 59) {
    sample += delta;
    lastType = type;
  }
}
console.log("VF rhythm annotations", rhythms);
const vfEvent = rhythms.find((r) => r.txt.includes("VF"));
if (!vfEvent) throw Error("VF annotation absent");
const vf = record(cu, Math.ceil(vfEvent.sample / 250) + 1, 8);
library.push({
  id: "vfib",
  name: "Recorded ventricular fibrillation",
  dataset: "CU Ventricular Tachyarrhythmia Database",
  record: "cu01",
  license: "ODC-By 1.0",
  url: "https://physionet.org/content/cudb/1.0.0/",
  placement:
    "Single monitor channel, not a documented standard 12-lead configuration. Spatial views are illustrative extrapolations.",
  annotation: vfEvent,
  ...vf,
});
for (const item of library) {
  delete item.header;
  fs.writeFileSync("public/signals/" + item.id + ".json", JSON.stringify(item));
}
fs.writeFileSync(
  "public/signals/manifest.json",
  JSON.stringify(
    library.map(({ signals, ...m }) => ({
      ...m,
      channels: Object.keys(signals),
      duration: Object.values(signals)[0].length / m.hz,
    })),
    null,
    2,
  ),
);
