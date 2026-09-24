/*
 * gbm.js — seeded Geometric Brownian Motion + distribution stats.
 * Classic script: attaches to globalThis.HFKit in the browser, and to
 * module.exports under Node (require / createRequire). No dependencies.
 *
 * Exact GBM discretisation (no Euler bias):
 *   S[t+1] = S[t] * exp((mu - sigma^2 / 2) * dt + sigma * sqrt(dt) * Z),  Z ~ N(0, 1)
 */
(function (root) {
  "use strict";

  // mulberry32 — tiny, fast, well-distributed 32-bit PRNG. Same seed => same stream
  // on every JS engine (pure integer math), so renders are bit-reproducible.
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Box–Muller with a cached spare so every uniform pair yields two normals.
  function normalSource(rand) {
    let spare = null;
    return function () {
      if (spare !== null) {
        const s = spare;
        spare = null;
        return s;
      }
      let u = 0;
      while (u === 0) u = rand();
      const v = rand();
      const r = Math.sqrt(-2 * Math.log(u));
      spare = r * Math.sin(2 * Math.PI * v);
      return r * Math.cos(2 * Math.PI * v);
    };
  }

  /**
   * simulate({ S0, mu, sigma, steps, years, nPaths, seed })
   * mu / sigma are annualised; steps span `years` (default 1).
   * Returns Float64Array per path, each of length steps + 1 (index 0 = S0).
   */
  function simulate(opts) {
    const S0 = opts.S0;
    const mu = opts.mu;
    const sigma = opts.sigma;
    const steps = opts.steps;
    const years = opts.years == null ? 1 : opts.years;
    const nPaths = opts.nPaths;
    const dt = years / steps;
    const drift = (mu - 0.5 * sigma * sigma) * dt;
    const vol = sigma * Math.sqrt(dt);
    const randn = normalSource(mulberry32(opts.seed));
    const paths = new Array(nPaths);
    for (let p = 0; p < nPaths; p++) {
      const path = new Float64Array(steps + 1);
      path[0] = S0;
      let s = S0;
      for (let i = 1; i <= steps; i++) {
        s *= Math.exp(drift + vol * randn());
        path[i] = s;
      }
      paths[p] = path;
    }
    return paths;
  }

  // Linear-interpolated percentile (same as numpy.percentile default, method="linear").
  function percentile(values, q) {
    const sorted = Array.from(values).sort(function (a, b) {
      return a - b;
    });
    const pos = (q / 100) * (sorted.length - 1);
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
  }

  function mean(values) {
    let s = 0;
    for (let i = 0; i < values.length; i++) s += values[i];
    return s / values.length;
  }

  /**
   * histogram(values, { min, max, binWidth, clamp })
   * clamp=true folds out-of-range values into the edge bins (reported in `clamped`).
   */
  function histogram(values, o) {
    const n = Math.round((o.max - o.min) / o.binWidth);
    const counts = new Array(n).fill(0);
    let clamped = 0;
    for (let i = 0; i < values.length; i++) {
      let b = Math.floor((values[i] - o.min) / o.binWidth);
      if (b < 0 || b >= n) {
        clamped++;
        if (o.clamp === false) continue;
        b = b < 0 ? 0 : n - 1;
      }
      counts[b]++;
    }
    const bins = counts.map(function (c, i) {
      const lo = o.min + i * o.binWidth;
      return { lo: lo, hi: lo + o.binWidth, count: c };
    });
    return { bins: bins, clamped: clamped };
  }

  const api = {
    mulberry32: mulberry32,
    normalSource: normalSource,
    simulate: simulate,
    percentile: percentile,
    mean: mean,
    histogram: histogram,
  };
  root.HFKit = Object.assign(root.HFKit || {}, { gbm: api });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
