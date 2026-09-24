/*
 * path-fan.js — draws a Monte Carlo "fan" of price paths into an SVG group and
 * schedules seek-safe GSAP draw-ons. Requires kit/lib/gbm.js when simulating.
 * Classic script → HFKit.pathFan.create(opts).
 */
(function (root) {
  "use strict";
  const SVGNS = "http://www.w3.org/2000/svg";

  function pathD(values, x0, x1, yOf) {
    const n = values.length - 1;
    let d = "";
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n;
      d += (i === 0 ? "M" : "L") + x.toFixed(1) + " " + yOf(values[i]).toFixed(1);
    }
    return d;
  }

  /**
   * create(opts)
   *   group      SVGGElement to draw into (required)
   *   paths      precomputed number[][] — OR simulate from the params below
   *   S0, mu, sigma, steps, seed, nPaths, years   GBM inputs (annualised mu/sigma)
   *   x0, x1     horizontal extent (px / SVG units)
   *   yOf(price) price → y mapping
   *   colors     { line, dot } (default navy / gold)
   *   strokeWidth, opacity     resting style of each path (the "cloud" look)
   *   idPrefix   id prefix for generated nodes (keep ids unique per page)
   * returns { group, els, values, terminals, endpoints, origin, draw, drawWaves }
   */
  function create(opts) {
    const colors = Object.assign({ line: "#1F2E5A", dot: "#C9A24A" }, opts.colors);
    let values = opts.paths;
    if (!values) {
      const gbm = root.HFKit && root.HFKit.gbm;
      if (!gbm) throw new Error("path-fan: pass `paths` or load kit/lib/gbm.js");
      values = gbm
        .simulate({
          S0: opts.S0,
          mu: opts.mu,
          sigma: opts.sigma,
          steps: opts.steps,
          years: opts.years,
          nPaths: opts.nPaths,
          seed: opts.seed,
        })
        .map((p) => Array.from(p));
    }
    const prefix = opts.idPrefix || "fan";
    const sw = opts.strokeWidth == null ? 1.6 : opts.strokeWidth;
    const op = opts.opacity == null ? 0.14 : opts.opacity;
    const els = values.map(function (v, i) {
      const p = document.createElementNS(SVGNS, "path");
      p.setAttribute("id", prefix + "-p" + i);
      p.setAttribute("d", pathD(v, opts.x0, opts.x1, opts.yOf));
      p.setAttribute("fill", "none");
      p.setAttribute("stroke", colors.line);
      p.setAttribute("stroke-width", sw);
      p.setAttribute("stroke-linejoin", "round");
      p.setAttribute("stroke-linecap", "round");
      p.setAttribute("stroke-opacity", op);
      // pathLength=1 → draw-on is dashoffset 1 → 0 regardless of real length.
      p.setAttribute("pathLength", "1");
      p.setAttribute("stroke-dasharray", "1 1");
      p.setAttribute("stroke-dashoffset", "1");
      opts.group.appendChild(p);
      return p;
    });
    const terminals = values.map((v) => v[v.length - 1]);
    return {
      group: opts.group,
      els: els,
      values: values,
      terminals: terminals,
      origin: { x: opts.x0, y: opts.yOf(values[0][0]) },
      endpoints: terminals.map((t) => ({ x: opts.x1, y: opts.yOf(t), value: t })),
      /** draw(tl, el, at, dur) — one path, left → right. Linear reads as "time passing". */
      draw: function (tl, el, at, dur) {
        tl.fromTo(
          el,
          { strokeDashoffset: 1 },
          { strokeDashoffset: 0, duration: dur, ease: "none" },
          at,
        );
      },
      /**
       * drawWaves(tl, waves) — multiply the fan in waves:
       *   [{ from, to, at, span, dur, accel }]  paths [from, to) start across `span`
       *   seconds after `at`; accel > 1 bunches later starts (accelerating feel).
       */
      drawWaves: function (tl, waves) {
        const self = this;
        waves.forEach(function (w) {
          const n = w.to - w.from;
          for (let k = 0; k < n; k++) {
            const u = n === 1 ? 0 : k / (n - 1);
            const start = w.at + w.span * Math.pow(u, 1 / (w.accel || 1));
            self.draw(tl, els[w.from + k], start, w.dur);
          }
        });
      },
    };
  }

  root.HFKit = Object.assign(root.HFKit || {}, { pathFan: { create: create, pathD: pathD } });
})(typeof globalThis !== "undefined" ? globalThis : this);
