#!/usr/bin/env node
// Emit the SFX markers for a NUMBER_COUNTER render as a Premiere-importable
// FCP7 XML (clip markers on the overlay), plus CSV/JSON sidecars.
//
//   node scripts/export-markers.mjs --media renders/counter.mov \
//     [--variables '{"count_duration":2}' | --variables-file vars.json] [--out renders/counter]
//
// Timing mirrors index.html: IN 0.2 → COUNT → LAND 0.2 → HOLD → OUT 0.2.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const FPS = 30;
const IN = 0.2;
const LAND = 0.2;
const OUT = 0.2;

const projectDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = Object.fromEntries(
  process.argv
    .slice(2)
    .reduce(
      (pairs, token, i, all) =>
        token.startsWith("--") ? [...pairs, [token.slice(2), all[i + 1]]] : pairs,
      [],
    ),
);

const html = readFileSync(resolve(projectDir, "index.html"), "utf8");
const declMatch = html.match(/data-composition-variables='([\s\S]*?)'/);
if (!declMatch) throw new Error("index.html has no data-composition-variables");
const defaults = Object.fromEntries(JSON.parse(declMatch[1]).map((d) => [d.id, d.default]));
const overrides = args["variables-file"]
  ? JSON.parse(readFileSync(resolve(args["variables-file"]), "utf8"))
  : JSON.parse(args.variables ?? "{}");
const vars = { ...defaults, ...overrides };

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const countDur = clamp(Number(vars.count_duration), 0.8, 3);
const holdDur = Math.max(0, Number(vars.hold_duration));
const total = IN + countDur + LAND + holdDur + OUT;
const frames = (t) => Math.round(t * FPS);

const markers = [
  { name: "SFX_TICK", time: IN, comment: "count start" },
  { name: "SFX_CHING", time: IN + countDur, comment: "land" },
].map((m) => ({ ...m, frame: frames(m.time) }));

const media = resolve(args.media ?? resolve(projectDir, "renders/number-counter.mov"));
const outBase = resolve(args.out ?? media.replace(/\.[^.]+$/, ""));
mkdirSync(dirname(outBase), { recursive: true });

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const name = basename(media);
const dur = frames(total);
const rate = `<rate><timebase>${FPS}</timebase><ntsc>FALSE</ntsc></rate>`;
const markerXml = markers
  .map(
    (m) =>
      `<marker><name>${m.name}</name><comment>${esc(m.comment)}</comment><in>${m.frame}</in><out>-1</out></marker>`,
  )
  .join("\n            ");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="4">
  <sequence id="seq-number-counter">
    <name>${esc(basename(outBase))}</name>
    <duration>${dur}</duration>
    ${rate}
    <media>
      <video>
        <format><samplecharacteristics>${rate}<width>1080</width><height>1920</height></samplecharacteristics></format>
        <track>
          <clipitem id="clip-number-counter">
            <name>${esc(name)}</name>
            <duration>${dur}</duration>
            ${rate}
            <start>0</start><end>${dur}</end><in>0</in><out>${dur}</out>
            <alphatype>straight</alphatype>
            <file id="file-number-counter">
              <name>${esc(name)}</name>
              <pathurl>${pathToFileURL(media).href}</pathurl>
              ${rate}
              <duration>${dur}</duration>
              <media><video><samplecharacteristics><width>1080</width><height>1920</height></samplecharacteristics></video></media>
            </file>
            ${markerXml}
          </clipitem>
        </track>
      </video>
    </media>
    ${markerXml.replace(/\n {12}/g, "\n    ")}
  </sequence>
</xmeml>
`;

writeFileSync(`${outBase}.markers.xml`, xml);
writeFileSync(
  `${outBase}.markers.csv`,
  [
    "name,frame,seconds,timecode",
    ...markers.map(
      (m) =>
        `${m.name},${m.frame},${m.time.toFixed(3)},00:00:${String(Math.floor(m.frame / FPS)).padStart(2, "0")}:${String(m.frame % FPS).padStart(2, "0")}`,
    ),
  ].join("\n") + "\n",
);
writeFileSync(
  `${outBase}.markers.json`,
  JSON.stringify({ fps: FPS, totalSeconds: total, totalFrames: dur, markers }, null, 2) + "\n",
);
console.log(
  `total ${total.toFixed(2)}s (${dur}f) · ${markers.map((m) => `${m.name}@${m.frame}f`).join(" · ")}`,
);
console.log(`wrote ${outBase}.markers.{xml,csv,json}`);
