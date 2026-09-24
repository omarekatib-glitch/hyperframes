// Build step: synthesise the SFX stem, cue-locked to assets/beats.js.
//   node build/sfx.mjs
// Output: assets/sfx.wav — 15.000s, 48 kHz, 16-bit mono, peak -12 dBFS
// (deliberately low: VO sits on top in the edit). Fully procedural + seeded,
// so the stem is byte-identical on every build. No music.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { mulberry32 } = require("../../kit/lib/gbm.js");

const here = dirname(fileURLToPath(import.meta.url));
const assets = join(here, "..", "assets");
const ctx = {};
vm.runInNewContext(readFileSync(join(assets, "beats.js"), "utf8"), { globalThis: ctx });
const B = ctx.BEATS;

const SR = 48000;
const N = Math.round(B.duration * SR);
const out = new Float64Array(N);
const rand = mulberry32(7);
const noise = () => rand() * 2 - 1;

// RBJ biquad band-pass / low-pass / high-pass, per-sample coefficient updates allowed.
function biquad() {
  let x1 = 0,
    x2 = 0,
    y1 = 0,
    y2 = 0;
  return (x, type, f, q) => {
    const w = (2 * Math.PI * f) / SR;
    const a = Math.sin(w) / (2 * q);
    const c = Math.cos(w);
    let b0, b1, b2;
    if (type === "bp") [b0, b1, b2] = [a, 0, -a];
    else if (type === "lp") [b0, b1, b2] = [(1 - c) / 2, 1 - c, (1 - c) / 2];
    else [b0, b1, b2] = [(1 + c) / 2, -(1 + c), (1 + c) / 2];
    const a0 = 1 + a,
      a1 = -2 * c,
      a2 = 1 - a;
    const y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    return y;
  };
}

function add(t0, len, fn) {
  const s0 = Math.round(t0 * SR);
  const n = Math.round(len * SR);
  for (let i = 0; i < n && s0 + i < N; i++) if (s0 + i >= 0) out[s0 + i] += fn(i / SR, i);
}

// ---- voices -----------------------------------------------------------------
function swoosh(t0, len, gain, f0, f1) {
  const f = biquad();
  const g = biquad();
  add(t0, len, (t) => {
    const p = t / len;
    const env = Math.sin(Math.PI * Math.min(1, p * 1.25)) ** 2 * (1 - p * 0.4);
    const fc = f0 * (f1 / f0) ** p;
    return gain * env * g(f(noise(), "bp", fc, 1.2), "lp", 6000, 0.7);
  });
}

function tear(t0, len, gain) {
  // Paper tear = dense crackle grains (fibres snapping) over a filtered rasp.
  const bp = biquad();
  const rasp = biquad();
  let grain = 0;
  add(t0, len, (t) => {
    const p = t / len;
    const density = 0.02 + 0.2 * Math.sin(Math.PI * Math.min(1, p * 1.1));
    if (rand() < density * 0.06) grain = 0.6 + rand() * 0.8;
    grain *= 0.93;
    const crack = bp(noise() * grain, "bp", 2600 + 1400 * Math.sin(p * 9), 0.9);
    const body = rasp(noise(), "bp", 1400 + 900 * p, 0.6) * 0.18 * Math.sin(Math.PI * p);
    return gain * (crack * 1.6 + body);
  });
}

function click(t0, gain, freq, decay) {
  const hp = biquad();
  add(t0, decay * 6, (t) => {
    const env = Math.exp(-t / decay);
    return (
      gain *
      env *
      (Math.sin(2 * Math.PI * freq * t) * 0.7 +
        hp(noise(), "hp", 3000, 0.7) * 0.5 * Math.exp(-t / 0.0015))
    );
  });
}

function knock(t0, gain, freq) {
  // Soft wooden "stack" knock: two damped partials + a muffled contact.
  const lp = biquad();
  add(t0, 0.18, (t) => {
    const e1 = Math.exp(-t / 0.035);
    const e2 = Math.exp(-t / 0.018);
    return (
      gain *
      (Math.sin(2 * Math.PI * freq * t) * e1 +
        0.45 * Math.sin(2 * Math.PI * freq * 2.31 * t) * e2 +
        0.5 * lp(noise(), "lp", 1800, 0.7) * Math.exp(-t / 0.004))
    );
  });
}

function thud(t0, gain) {
  const lp = biquad();
  let ph = 0;
  add(t0, 0.7, (t) => {
    const f = 42 + 48 * Math.exp(-t / 0.05); // pitch drop 90 → 42 Hz
    ph += (2 * Math.PI * f) / SR;
    const body = Math.tanh(1.6 * Math.sin(ph)) * Math.exp(-t / 0.2);
    const hit = lp(noise(), "lp", 400, 0.8) * Math.exp(-t / 0.02);
    return gain * (body + hit * 0.9);
  });
}

function bell(t0, gain, f, decay) {
  const ratios = [1, 2.0, 2.76, 5.4];
  const amps = [1, 0.35, 0.45, 0.12];
  add(t0, decay * 5, (t) => {
    let s = 0;
    for (let k = 0; k < ratios.length; k++)
      s +=
        amps[k] *
        Math.sin(2 * Math.PI * f * ratios[k] * t) *
        Math.exp(-t / (decay / (1 + k * 0.6)));
    return gain * s * Math.min(1, t / 0.002);
  });
}

// ---- cue sheet --------------------------------------------------------------
// HOOK: soft swoosh as the card flies in, tear across the torn-edge reveal.
swoosh(B.swoosh, 0.45, 0.35, 350, 2200);
tear(B.tear, 0.44, 0.55);
// ONE STARTING POINT: single click on the dot pop.
click(B.dot, 0.5, 2100, 0.006);
// THE FAN: ticks locked to the counter. Counter uses power2.in, value = p^2,
// so the k-th of K equal steps lands at p = sqrt(k/K) — naturally accelerating.
for (let k = 1; k <= B.counterTicks; k++) {
  const p = Math.sqrt(k / B.counterTicks);
  const t = B.counterStart + p * (B.counterEnd - B.counterStart);
  click(t, 0.16 + 0.1 * p, 3300 + 400 * p, 0.0035);
}
// THE DISTRIBUTION: one knock per bar group, pitch stepping up as the stack grows.
B.barGroups.forEach((t, i) => knock(t, 0.4, 520 + i * 70));
// THE RISK: low thud as the VaR line lands.
thud(B.varLand, 0.8);
// THE TAKEAWAY: subtle register "cha-ching" — ratchet, then two bells.
for (let i = 0; i < 4; i++) click(B.chaChing - 0.12 + i * 0.025, 0.18, 2500, 0.003);
bell(B.chaChing, 0.2, 1568, 0.09);
bell(B.chaChing + 0.085, 0.24, 2093, 0.22);

// ---- master: normalise peak to -12 dBFS, 5ms fades at the edges -------------
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(out[i]));
const target = 10 ** (-12 / 20);
const k = target / peak;
const pcm = Buffer.alloc(44 + N * 2);
pcm.write("RIFF", 0);
pcm.writeUInt32LE(36 + N * 2, 4);
pcm.write("WAVEfmt ", 8);
pcm.writeUInt32LE(16, 16);
pcm.writeUInt16LE(1, 20);
pcm.writeUInt16LE(1, 22);
pcm.writeUInt32LE(SR, 24);
pcm.writeUInt32LE(SR * 2, 28);
pcm.writeUInt16LE(2, 32);
pcm.writeUInt16LE(16, 34);
pcm.write("data", 36);
pcm.writeUInt32LE(N * 2, 40);
for (let i = 0; i < N; i++) {
  const v = Math.max(-1, Math.min(1, out[i] * k));
  pcm.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
}
writeFileSync(join(assets, "sfx.wav"), pcm);
console.log(
  `sfx.wav: ${B.duration}s @ ${SR} Hz, peak normalised to -12 dBFS (gain ${k.toFixed(3)})`,
);
