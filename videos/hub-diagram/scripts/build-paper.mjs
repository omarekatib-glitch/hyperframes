// One-off asset generator: bakes assets/paper.webp (wrinkled cream sheet + soft shadow on transparent).
// Deterministic (fixed seeds). Usage: node scripts/build-paper.mjs   (needs playwright-core + a Chromium)
// Colours: sheet is lit with lighting-color = Cream #F5F0E8 (never brighter than cream); shadow is charcoal-toned alpha.
import { chromium } from "playwright-core";
import { writeFileSync } from "node:fs";

const W = 1080, H = 1920, INSET = 42;
const CREAM = "#F5F0E8", CHARCOAL = "#2C2C2C";

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const r = rng(20260929);

// Slightly irregular sheet edge (hand-torn / handled paper), not a perfect rectangle.
const pts = [];
const step = 60, j = 3.2;
for (let x = INSET; x < W - INSET; x += step) pts.push([x, INSET + (r() - .5) * j * 2]);
for (let y = INSET; y < H - INSET; y += step) pts.push([W - INSET + (r() - .5) * j * 2, y]);
for (let x = W - INSET; x > INSET; x -= step) pts.push([x, H - INSET + (r() - .5) * j * 2]);
for (let y = H - INSET; y > INSET; y -= step) pts.push([INSET + (r() - .5) * j * 2, y]);
const sheet = "M" + pts.map((p) => p.map((v) => v.toFixed(1)).join(",")).join("L") + "Z";

// Crumple facets: jittered grid split into triangles, each a slightly different tone (charcoal alpha, or cream to lift it back).
// This is what crushed paper reads as: flat planes meeting at sharp folds.
let creases = "";
const CW = 100, CH = 100;
const cols = Math.ceil(W / CW) + 1, rows = Math.ceil(H / CH) + 1;
const grid = [];
for (let gy = 0; gy <= rows; gy++) { const row = []; for (let gx = 0; gx <= cols; gx++) row.push([gx * CW - 40 + (r() - .5) * CW * 0.7, gy * CH - 40 + (r() - .5) * CH * 0.7]); grid.push(row); }
const tri = (a, b, c) => {
  const dark = r() < 0.62;
  const op = dark ? (0.008 + r() * 0.04) : (0.12 + r() * 0.28);
  const col = dark ? CHARCOAL : CREAM;
  creases += `<path d="M${a.map((v)=>v.toFixed(0)).join(",")}L${b.map((v)=>v.toFixed(0)).join(",")}L${c.map((v)=>v.toFixed(0)).join(",")}Z" fill="${col}" fill-opacity="${op.toFixed(3)}" stroke="${col}" stroke-opacity="${op.toFixed(3)}" stroke-width="0.8"/>`;
};
for (let gy = 0; gy < rows; gy++) for (let gx = 0; gx < cols; gx++) {
  const a = grid[gy][gx], b = grid[gy][gx + 1], c = grid[gy + 1][gx + 1], d = grid[gy + 1][gx];
  if (r() < 0.5) { tri(a, b, c); tri(a, c, d); } else { tri(a, b, d); tri(b, c, d); }
}
// A few hard fold lines on top (thin dark edge + light lip).
for (let i = 0; i < 9; i++) {
  const x0 = INSET + r() * (W - 2 * INSET), y0 = INSET + r() * (H - 2 * INSET);
  const a = r() * Math.PI, len = 260 + r() * 520;
  const x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len;
  const d = `M${x0.toFixed(0)},${y0.toFixed(0)}L${((x0+x1)/2 + (r()-.5)*40).toFixed(0)},${((y0+y1)/2 + (r()-.5)*40).toFixed(0)}L${x1.toFixed(0)},${y1.toFixed(0)}`;
  creases += `<path d="${d}" stroke="${CHARCOAL}" stroke-opacity="0.12" stroke-width="1.8" fill="none"/>`;
  creases += `<path d="${d}" stroke="${CREAM}" stroke-opacity="0.7" stroke-width="1.4" fill="none" transform="translate(1.8,1.8)"/>`;
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <filter id="soft"><feGaussianBlur stdDeviation="1.1"/></filter>
  <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="16"/></filter>
  <filter id="crumple" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="0.007 0.010" numOctaves="5" seed="11" result="big"/>
    <feDiffuseLighting in="big" surfaceScale="5" diffuseConstant="1" lighting-color="${CREAM}" result="litBig"><feDistantLight azimuth="232" elevation="84"/></feDiffuseLighting>
    <feTurbulence type="turbulence" baseFrequency="0.0035 0.0055" numOctaves="3" seed="4" result="ridge"/>
    <feDiffuseLighting in="ridge" surfaceScale="2" diffuseConstant="1" lighting-color="${CREAM}" result="litRidge"><feDistantLight azimuth="215" elevation="86"/></feDiffuseLighting>
    <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="2" seed="2" result="grain"/>
    <feDiffuseLighting in="grain" surfaceScale="0.9" diffuseConstant="1" lighting-color="${CREAM}" result="litGrain"><feDistantLight azimuth="225" elevation="80"/></feDiffuseLighting>
    <feComposite in="litBig" in2="litRidge" operator="arithmetic" k1="1" k2="0" k3="0" k4="0" result="a"/>
    <feComposite in="a" in2="litGrain" operator="arithmetic" k1="1" k2="0" k3="0" k4="0"/>
  </filter>
  <clipPath id="sheetClip"><path d="${sheet}"/></clipPath>
</defs>
<path d="${sheet}" fill="#000" fill-opacity="0.42" filter="url(#shadow)" transform="translate(0,14)"/>
<g clip-path="url(#sheetClip)">
  <rect width="${W}" height="${H}" fill="${CREAM}" filter="url(#crumple)"/>
  <g filter="url(#soft)">${creases}</g>
</g>
</svg>`;

const exe = process.env.CHROMIUM_PATH || undefined;
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.setContent(`<body style="margin:0;background:transparent">${svg}</body>`);
const png = await page.screenshot({ omitBackground: true, type: "png" });
// Re-encode as WebP (keeps alpha for the shadow/edge) so the asset stays under the 2 MB inline limit.
const b64 = await page.evaluate(async (src) => {
  const img = new Image();
  img.src = src;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = img.width; c.height = img.height;
  c.getContext("2d").drawImage(img, 0, 0);
  return c.toDataURL("image/webp", 0.9).split(",")[1];
}, "data:image/png;base64," + png.toString("base64"));
const buf = Buffer.from(b64, "base64");
writeFileSync(new URL("../assets/paper.webp", import.meta.url), buf);
await browser.close();
console.log("paper.webp", buf.length, "bytes");
