#!/usr/bin/env node
// Export the PAPER_CARD SFX markers for Premiere.
//
// Reads the variable defaults from index.html and the beat math from
// paper-card-timing.js (the same module the composition runs), so the
// markers always match the rendered motion. Writes:
//   <out>/<name>.markers.csv  — human-readable list (name, seconds, timecode, frame)
//   <out>/<name>.xml          — FCP7 XML. Premiere: File > Import. It creates a
//                               sequence holding the rendered MOV with the SFX
//                               markers on the clip, so they travel with it into
//                               your edit.
//
// Usage:
//   node scripts/markers.mjs                                   # defaults (SLIDE, hold 5s)
//   node scripts/markers.mjs --variables '{"hold_duration":7}' --media renders/card.mov
//   node scripts/markers.mjs --variables-file beat-04.json --name beat-04

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT = resolve(HERE, "..");
const FPS = 30;
const require = createRequire(import.meta.url);
// The timing file is a plain browser script: it fills module.exports under
// CommonJS, or sets globalThis.PaperCardTiming when loaded as ESM.
const loaded = require(resolve(PROJECT, "paper-card-timing.js"));
const T = typeof loaded.plan === "function" ? loaded : globalThis.PaperCardTiming;

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}

function defaultsFromComposition() {
  const html = readFileSync(resolve(PROJECT, "index.html"), "utf8");
  const m = html.match(/data-composition-variables='([\s\S]*?)'/);
  if (!m) throw new Error("index.html: data-composition-variables not found");
  return Object.fromEntries(JSON.parse(m[1]).map((d) => [d.id, d.default]));
}

const overrides = arg("variables-file")
  ? JSON.parse(readFileSync(arg("variables-file"), "utf8"))
  : JSON.parse(arg("variables") ?? "{}");
const v = { ...defaultsFromComposition(), ...overrides };

// Mirror index.html: empty lines are dropped; highlight = first line containing the phrase.
const lines = [v.body_line_1, v.body_line_2, v.body_line_3]
  .map((s) => String(s ?? "").trim())
  .filter(Boolean);
const phrase = String(v.highlight_phrase ?? "").trim();
const highlightLine = phrase ? lines.findIndex((l) => l.includes(phrase)) : -1;

const plan = T.plan({ holdDuration: v.hold_duration, lineCount: lines.length, highlightLine });
const variant = v.enter_variant || "SLIDE";
const name = arg("name") ?? `PAPER_CARD_${variant}`;
const outDir = resolve(arg("out") ?? resolve(PROJECT, "renders"));
const media = resolve(arg("media") ?? resolve(outDir, `${name}_1080x1920.mov`));
const totalFrames = Math.round(plan.end * FPS);

const frame = (t) => Math.round(t * FPS);
const tc = (t) => {
  const f = frame(t);
  const s = Math.floor(f / FPS);
  const pad = (n) => String(n).padStart(2, "0");
  return `00:${pad(Math.floor(s / 60))}:${pad(s % 60)}:${pad(f % FPS)}`;
};
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

mkdirSync(outDir, { recursive: true });

const csv = [
  "Marker Name,Start (s),Timecode,Frame,Note",
  ...plan.markers.map(
    (m) => `${m.name},${m.time.toFixed(3)},${tc(m.time)},${frame(m.time)},${m.note ?? ""}`,
  ),
].join("\n");
writeFileSync(resolve(outDir, `${name}.markers.csv`), csv + "\n");

const rate = `<rate><timebase>${FPS}</timebase><ntsc>FALSE</ntsc></rate>`;
const markerXml = (indent) =>
  plan.markers
    .map(
      (m) =>
        `${indent}<marker><name>${m.name}</name><comment>${esc(m.note ?? "")}</comment><in>${frame(m.time)}</in><out>-1</out></marker>`,
    )
    .join("\n");
const sample = `<samplecharacteristics>${rate}<width>1080</width><height>1920</height><pixelaspectratio>square</pixelaspectratio></samplecharacteristics>`;

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="4">
  <sequence id="seq-${name}">
    <name>${esc(name)}</name>
    <duration>${totalFrames}</duration>
    ${rate}
    <media>
      <video>
        <format>${sample}</format>
        <track>
          <clipitem id="clip-${name}">
            <name>${esc(basename(media))}</name>
            <duration>${totalFrames}</duration>
            ${rate}
            <start>0</start><end>${totalFrames}</end><in>0</in><out>${totalFrames}</out>
            <alphatype>straight</alphatype>
            <file id="file-${name}">
              <name>${esc(basename(media))}</name>
              <pathurl>${esc(pathToFileURL(media).href.replace("file:///", "file://localhost/"))}</pathurl>
              ${rate}
              <duration>${totalFrames}</duration>
              <media><video>${sample}</video></media>
            </file>
${markerXml("            ")}
          </clipitem>
        </track>
      </video>
    </media>
${markerXml("    ")}
  </sequence>
</xmeml>
`;
writeFileSync(resolve(outDir, `${name}.xml`), xml);

console.log(
  `${name}: ${plan.end.toFixed(2)}s (${totalFrames} frames), OUT at ${plan.outAt.toFixed(2)}s`,
);
for (const m of plan.markers)
  console.log(`  ${tc(m.time)}  ${m.name}${m.note ? `  (${m.note})` : ""}`);
console.log(
  `wrote ${resolve(outDir, `${name}.markers.csv`)}\nwrote ${resolve(outDir, `${name}.xml`)}`,
);
