/*
 * histogram.js — horizontal ("vertical-axis") histogram for a price axis: bars
 * grow sideways from a vertical baseline, one bar per price bin. Supports a
 * highlight threshold: everything below the threshold price can be recoloured
 * with an exact clip at the threshold (a bar straddling it splits cleanly).
 * Classic script → HFKit.histogram.create(opts).
 */
(function (root) {
  "use strict";
  const SVGNS = "http://www.w3.org/2000/svg";

  function el(tag, attrs, parent) {
    const n = document.createElementNS(SVGNS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  function binValues(values, min, max, binWidth) {
    const n = Math.round((max - min) / binWidth);
    const counts = new Array(n).fill(0);
    values.forEach(function (v) {
      const b = Math.min(n - 1, Math.max(0, Math.floor((v - min) / binWidth)));
      counts[b]++;
    });
    return counts.map((c, i) => ({
      lo: min + i * binWidth,
      hi: min + (i + 1) * binWidth,
      count: c,
    }));
  }

  /**
   * create(opts)
   *   group       SVGGElement to draw into
   *   data        number[] raw values — OR `bins` [{lo, hi, count}] precomputed
   *   min, max, binWidth   binning (when `data` is given; out-of-range folds into edge bins)
   *   axisX       x of the baseline the bars grow from
   *   maxLen      px length of the tallest bar
   *   yOf(value)  value → y mapping (shared with the chart)
   *   gap         px gap between bars (default 8)
   *   color       bar colour (default navy)
   *   threshold   optional: values below this are highlighted
   *   highlightColor  (default burgundy)
   *   idPrefix
   * returns { bins, bars, hiBars, grow, highlight }
   */
  function create(opts) {
    const bins = opts.bins || binValues(opts.data, opts.min, opts.max, opts.binWidth);
    const gap = opts.gap == null ? 8 : opts.gap;
    const color = opts.color || "#1F2E5A";
    const hiColor = opts.highlightColor || "#7A1F2B";
    const prefix = opts.idPrefix || "hist";
    const maxCount = Math.max.apply(
      null,
      bins.map((b) => b.count),
    );

    function drawBars(parent, fill, tag) {
      return bins.map(function (b, i) {
        const yTop = opts.yOf(b.hi) + gap / 2;
        const yBot = opts.yOf(b.lo) - gap / 2;
        const len = maxCount ? (opts.maxLen * b.count) / maxCount : 0;
        return el(
          "rect",
          {
            id: prefix + "-" + tag + i,
            x: opts.axisX,
            y: yTop.toFixed(1),
            width: Math.max(0, len).toFixed(1),
            height: Math.max(1, yBot - yTop).toFixed(1),
            rx: 3,
            fill: fill,
          },
          parent,
        );
      });
    }

    const base = el("g", { id: prefix + "-base" }, opts.group);
    const bars = drawBars(base, color, "b");

    let hiGroup = null;
    let hiBars = [];
    if (opts.threshold != null) {
      const clip = el("clipPath", { id: prefix + "-hiclip" }, opts.group);
      const yT = opts.yOf(opts.threshold);
      el("rect", { x: 0, y: yT, width: 99999, height: 99999 }, clip);
      hiGroup = el(
        "g",
        { id: prefix + "-hi", "clip-path": "url(#" + prefix + "-hiclip)", opacity: 0 },
        opts.group,
      );
      hiBars = drawBars(hiGroup, hiColor, "h");
    }

    return {
      bins: bins,
      bars: bars,
      hiBars: hiBars,
      hiGroup: hiGroup,
      /**
       * grow(tl, { groups: [t0, t1, ...], stagger, dur, ease, order })
       * Bars are split into len(groups) contiguous groups (order "up" = low values
       * first, i.e. bottom → top) and each group starts at its time.
       */
      grow: function (tl, o) {
        const n = bins.length;
        const g = o.groups.length;
        const idx = bins.map((_, i) => i);
        if (o.order === "down") idx.reverse();
        idx.forEach(function (bi, k) {
          const gi = Math.min(g - 1, Math.floor((k * g) / n));
          const within = k - Math.ceil((gi * n) / g);
          const at = o.groups[gi] + within * (o.stagger == null ? 0.035 : o.stagger);
          const targets = [bars[bi]].concat(hiBars[bi] ? [hiBars[bi]] : []);
          tl.fromTo(
            targets,
            { scaleX: 0, transformOrigin: "0% 50%" },
            { scaleX: 1, duration: o.dur || 0.42, ease: o.ease || "back.out(1.8)" },
            at,
          );
        });
      },
      /** highlight(tl, at, dur) — recolour everything below `threshold`. */
      highlight: function (tl, at, dur) {
        if (!hiGroup) return;
        tl.fromTo(
          hiGroup,
          { opacity: 0 },
          { opacity: 1, duration: dur || 0.3, ease: "power2.out" },
          at,
        );
      },
    };
  }

  root.HFKit = Object.assign(root.HFKit || {}, {
    histogram: { create: create, binValues: binValues },
  });
})(typeof globalThis !== "undefined" ? globalThis : this);
