// Crumpled-paper generator for بيزنس مفهوم paper overlays.
// Draws a heavily crumpled, torn-edge cream scrap into two stacked SVGs:
//   base  (under the ink):  cream fill, lit/shaded fold facets, fibre rim, crease ridges
//   shade (over the ink, mix-blend-mode: multiply): micro-wrinkle grain, edge curl, crease hairlines
// Deterministic: the same seedText always yields the same scrap.
(function () {
  function render(opts) {
    const base = opts.base;
    const shade = opts.shade;
    const W = opts.width;
    const H = opts.height;
    const idp = opts.idPrefix || "paper-";
    const seedText = String(opts.seedText || "");

    // ---- Seeded PRNG: each value gets its own (deterministic) crumple ----
    function hashStr(s) {
      let h = 2166136261;
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return h >>> 0;
    }
    function mulberry32(a) {
      return function () {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    const seed = hashStr(seedText);
    const rnd = mulberry32(seed);
    const r = (a, b) => a + (b - a) * rnd();

    // ---- Torn outline: inset perimeter + low-freq waviness + fine fibre jitter ----
    function tornPath() {
      const pts = [];
      const phases = [r(0, 6.28), r(0, 6.28), r(0, 6.28)];
      const wav = (t) =>
        2.6 * Math.sin(t * 9 + phases[0]) +
        1.6 * Math.sin(t * 23 + phases[1]) +
        0.9 * Math.sin(t * 51 + phases[2]);
      const P = 2 * (W + H);
      const step = 5;
      for (let d = 0; d < P; d += step) {
        let x, y, nx, ny;
        if (d < W) {
          x = d;
          y = 0;
          nx = 0;
          ny = 1;
        } else if (d < W + H) {
          x = W;
          y = d - W;
          nx = -1;
          ny = 0;
        } else if (d < 2 * W + H) {
          x = W - (d - W - H);
          y = H;
          nx = 0;
          ny = -1;
        } else {
          x = 0;
          y = H - (d - 2 * W - H);
          nx = 1;
          ny = 0;
        }
        // occasional deeper bite where the scrap was torn from the pad
        const bite = rnd() < 0.035 ? r(3, 7) : 0;
        const inset = 7 + wav(d / P) + r(-1.3, 1.3) + bite;
        pts.push([x + nx * inset, y + ny * inset]);
      }
      // chip the four corners a little (crushed corners)
      const corners = [
        [0, 0, 1, 1],
        [W, 0, -1, 1],
        [W, H, -1, -1],
        [0, H, 1, -1],
      ];
      for (const [cx, cy, sx, sy] of corners) {
        const chip = r(6, 13);
        for (const p of pts) {
          const dx = Math.abs(p[0] - cx);
          const dy = Math.abs(p[1] - cy);
          if (dx + dy < chip + 14) {
            const k = (chip + 14 - dx - dy) * 0.5;
            p[0] += sx * k;
            p[1] += sy * k;
          }
        }
      }
      return "M" + pts.map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join("L") + "Z";
    }

    // ---- Crumple facets: jittered grid → triangles, each lit from top-left ----
    function facets() {
      const cols = 17;
      const rows = 11;
      const g = [];
      for (let j = 0; j <= rows; j++) {
        const row = [];
        for (let i = 0; i <= cols; i++) {
          const edge = i === 0 || j === 0 || i === cols || j === rows;
          const jx = edge ? 0 : r(-0.45, 0.45) * (W / cols);
          const jy = edge ? 0 : r(-0.45, 0.45) * (H / rows);
          row.push([(i * W) / cols + jx, (j * H) / rows + jy, r(-1, 1)]);
        }
        g.push(row);
      }
      const tris = [];
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const a = g[j][i],
            b = g[j][i + 1],
            c = g[j + 1][i + 1],
            d = g[j + 1][i];
          if (rnd() < 0.5) tris.push([a, b, c], [a, c, d]);
          else tris.push([a, b, d], [b, c, d]);
        }
      }
      // light direction (top-left, slightly toward viewer)
      const L = [-0.55, -0.62, 0.56];
      const out = [];
      for (const [p, q, s] of tris) {
        const hz = 26; // relief height → how "crunchy" the fold reads
        const u = [q[0] - p[0], q[1] - p[1], (q[2] - p[2]) * hz];
        const v = [s[0] - p[0], s[1] - p[1], (s[2] - p[2]) * hz];
        let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
        if (n[2] < 0) n = n.map((x) => -x);
        const len = Math.hypot(n[0], n[1], n[2]) || 1;
        const lit = (n[0] * L[0] + n[1] * L[1] + n[2] * L[2]) / len; // ~0.2..1
        const flat = L[2];
        out.push({ pts: [p, q, s], k: lit - flat });
      }
      return out;
    }

    const NS = "http://www.w3.org/2000/svg";
    const el = (name, attrs, parent) => {
      const n = document.createElementNS(NS, name);
      for (const k in attrs) n.setAttribute(k, attrs[k]);
      if (parent) parent.appendChild(n);
      return n;
    };
    const triD = (t) =>
      "M" + t.pts.map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join("L") + "Z";

    const outline = tornPath();
    const tris = facets();
    const turbSeed = seed % 997;

    // Base layer: cream paper + light facets (highlights) + soft torn fibre edge
    const pd = el("defs", {}, base);
    const pclip = el("clipPath", { id: idp + "clip-a" }, pd);
    el("path", { d: outline }, pclip);
    const edgeBlur = el(
      "filter",
      { id: idp + "soft", x: "-5%", y: "-5%", width: "110%", height: "110%" },
      pd,
    );
    el("feGaussianBlur", { stdDeviation: "0.7" }, edgeBlur);
    // facets are softened slightly so they read as folds, not geometry
    const foldBlur = el(
      "filter",
      { id: idp + "fold", x: "-2%", y: "-2%", width: "104%", height: "104%" },
      pd,
    );
    el("feGaussianBlur", { stdDeviation: "0.9" }, foldBlur);
    const pg = el("g", { "clip-path": "url(#" + idp + "clip-a)" }, base);
    el("rect", { x: 0, y: 0, width: W, height: H, fill: "#F5F0E8" }, pg);
    const fg = el("g", { filter: "url(#" + idp + "fold)" }, pg);
    for (const t of tris) {
      if (t.k > 0.02) {
        el(
          "path",
          { d: triD(t), fill: "#FFFEFA", "fill-opacity": Math.min(0.75, t.k * 2).toFixed(3) },
          fg,
        );
      } else if (t.k < -0.02) {
        el(
          "path",
          { d: triD(t), fill: "#CDBFA6", "fill-opacity": Math.min(0.6, -t.k * 1.5).toFixed(3) },
          fg,
        );
      }
    }
    // torn fibre rim: pale, slightly soft
    el(
      "path",
      {
        d: outline,
        fill: "none",
        stroke: "#FFFCF5",
        "stroke-width": "3",
        "stroke-opacity": "0.9",
        filter: "url(#" + idp + "soft)",
      },
      pg,
    );

    // Shade layer (multiply, over the ink): dark facets + creases + micro-wrinkle grain
    const sd = el("defs", {}, shade);
    const sclip = el("clipPath", { id: idp + "clip-b" }, sd);
    el("path", { d: outline }, sclip);
    const grain = el(
      "filter",
      {
        id: idp + "grain",
        x: "0",
        y: "0",
        width: "100%",
        height: "100%",
        "color-interpolation-filters": "sRGB",
      },
      sd,
    );
    el(
      "feTurbulence",
      {
        type: "fractalNoise",
        baseFrequency: "0.035 0.05",
        numOctaves: "4",
        seed: String(turbSeed),
        result: "n",
      },
      grain,
    );
    const light = el(
      "feDiffuseLighting",
      {
        in: "n",
        surfaceScale: "7",
        diffuseConstant: "1.05",
        "lighting-color": "#FFFFFF",
        result: "l",
      },
      grain,
    );
    el("feDistantLight", { azimuth: "225", elevation: "48" }, light);
    const cm = el("feComponentTransfer", { in: "l" }, grain);
    el("feFuncR", { type: "linear", slope: "0.34", intercept: "0.68" }, cm);
    el("feFuncG", { type: "linear", slope: "0.34", intercept: "0.67" }, cm);
    el("feFuncB", { type: "linear", slope: "0.34", intercept: "0.65" }, cm);
    const edgeShade = el(
      "radialGradient",
      { id: idp + "edge", cx: "50%", cy: "50%", r: "62%" },
      sd,
    );
    el("stop", { offset: "0.72", "stop-color": "#FFFFFF" }, edgeShade);
    el("stop", { offset: "1", "stop-color": "#D9CDB8" }, edgeShade);

    const sg = el("g", { "clip-path": "url(#" + idp + "clip-b)" }, shade);
    el(
      "rect",
      { x: 0, y: 0, width: W, height: H, fill: "#FFFFFF", filter: "url(#" + idp + "grain)" },
      sg,
    );
    el("rect", { x: 0, y: 0, width: W, height: H, fill: "url(#" + idp + "edge)" }, sg);
    // crease lines: the sharp folds on a subset of facet edges — a dark hairline
    // with a pale ridge 1px beside it, crossing over the ink like a real crushed scrap
    let creases = "";
    for (const t of tris) {
      if (rnd() < 0.42) {
        const [p, q] = t.pts;
        creases +=
          "M" +
          p[0].toFixed(1) +
          " " +
          p[1].toFixed(1) +
          "L" +
          q[0].toFixed(1) +
          " " +
          q[1].toFixed(1);
      }
    }
    el(
      "path",
      {
        d: creases,
        fill: "none",
        stroke: "#FFFFFF",
        "stroke-width": "1.1",
        "stroke-opacity": "0.8",
        transform: "translate(0.9 0.9)",
      },
      pg,
    );
    el(
      "path",
      {
        d: creases,
        fill: "none",
        stroke: "#8A7D66",
        "stroke-width": "0.8",
        "stroke-opacity": "0.5",
        "stroke-linecap": "round",
      },
      sg,
    );
  }

  window.BMPaper = { render };
})();
