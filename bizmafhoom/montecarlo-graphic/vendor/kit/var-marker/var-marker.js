/*
 * var-marker.js — Value-at-Risk marker: a horizontal threshold line at a
 * percentile of a distribution, a tinted "tail" zone below it, and an HTML
 * label chip (value computed from the data, never typed by hand).
 * Assumes the SVG viewBox is in the same px space as the HTML layer
 * (full-frame SVG, viewBox = composition size).
 * Classic script → HFKit.varMarker.create(opts). Uses HFKit.gbm.percentile if loaded.
 */
(function (root) {
  "use strict";
  const SVGNS = "http://www.w3.org/2000/svg";

  function pct(values, q) {
    if (root.HFKit && root.HFKit.gbm) return root.HFKit.gbm.percentile(values, q);
    const s = Array.from(values).sort((a, b) => a - b);
    const pos = (q / 100) * (s.length - 1);
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    return s[lo] + (s[hi] - s[lo]) * (pos - lo);
  }

  /**
   * create(opts)
   *   group        SVGGElement for the line + tail zone
   *   layer        HTMLElement (absolute, full-frame) for the label
   *   data         number[] — distribution the percentile is taken from
   *   percentile   e.g. 5 for 95% VaR (default 5)
   *   reference    value losses are measured against (e.g. S0). Default: none
   *   x0, x1       line extent;  yOf(value) mapping;  zoneBottom  y where the tail zone ends
   *   color        default burgundy #7A1F2B
   *   label        chip text, e.g. "VaR 95%"
   *   format(v, ref) → value string for the chip. Default: "−" + loss% vs reference
   *   sublabel     optional second line (e.g. Arabic term)
   *   labelPos     { x, y } top-left of the label block (px)
   *   idPrefix
   * returns { value, loss, line, zone, labelEl, slideIn, revealLabel }
   */
  function create(opts) {
    const color = opts.color || "#7A1F2B";
    const prefix = opts.idPrefix || "var";
    const q = opts.percentile == null ? 5 : opts.percentile;
    const value = pct(opts.data, q);
    const loss = opts.reference != null ? opts.reference - value : null;
    const y = opts.yOf(value);

    const zone = document.createElementNS(SVGNS, "rect");
    zone.setAttribute("id", prefix + "-zone");
    zone.setAttribute("x", opts.x0);
    zone.setAttribute("y", y);
    zone.setAttribute("width", opts.x1 - opts.x0);
    zone.setAttribute("height", Math.max(0, (opts.zoneBottom || y) - y));
    zone.setAttribute("fill", color);
    zone.setAttribute("opacity", 0);
    opts.group.appendChild(zone);

    const line = document.createElementNS(SVGNS, "line");
    line.setAttribute("id", prefix + "-line");
    line.setAttribute("x1", opts.x0);
    line.setAttribute("x2", opts.x1);
    line.setAttribute("y1", y);
    line.setAttribute("y2", y);
    line.setAttribute("stroke", color);
    line.setAttribute("stroke-width", opts.strokeWidth || 5);
    line.setAttribute("stroke-linecap", "round");
    opts.group.appendChild(line);

    const fmt =
      opts.format ||
      function (v, ref) {
        return ref != null ? "−" + ((100 * (ref - v)) / ref).toFixed(1) + "%" : v.toFixed(1);
      };

    const labelEl = document.createElement("div");
    labelEl.id = prefix + "-label";
    labelEl.className = "var-marker-label";
    labelEl.style.cssText =
      "position:absolute;left:" + opts.labelPos.x + "px;top:" + opts.labelPos.y + "px;";
    const chip = document.createElement("div");
    chip.className = "var-marker-chip";
    chip.style.background = color;
    const k = document.createElement("span");
    k.className = "var-marker-key";
    k.textContent = opts.label || "VaR " + (100 - q) + "%";
    const v = document.createElement("span");
    v.className = "var-marker-value";
    v.textContent = fmt(value, opts.reference);
    chip.appendChild(k);
    chip.appendChild(v);
    labelEl.appendChild(chip);
    if (opts.sublabel) {
      const s = document.createElement("div");
      s.className = "var-marker-sub";
      s.style.color = color;
      s.textContent = opts.sublabel;
      labelEl.appendChild(s);
    }
    opts.layer.appendChild(labelEl);

    return {
      value: value,
      loss: loss,
      y: y,
      line: line,
      zone: zone,
      labelEl: labelEl,
      /** slideIn(tl, at, dur) — line slides in from the left edge and lands (use `at + dur` for the thud). */
      slideIn: function (tl, at, dur) {
        const d = dur || 0.37;
        tl.fromTo(line, { x: -(opts.x1 + 40) }, { x: 0, duration: d, ease: "back.out(1.4)" }, at);
        tl.fromTo(
          zone,
          { opacity: 0 },
          { opacity: opts.zoneOpacity || 0.07, duration: 0.3, ease: "power2.out" },
          at + d,
        );
      },
      /** revealLabel(tl, at) — chip pops, sublabel follows. */
      revealLabel: function (tl, at) {
        tl.fromTo(
          chip,
          { opacity: 0, scale: 0.6, transformOrigin: "0% 50%" },
          { opacity: 1, scale: 1, duration: 0.38, ease: "back.out(2)" },
          at,
        );
        const sub = labelEl.querySelector(".var-marker-sub");
        if (sub)
          tl.fromTo(
            sub,
            { opacity: 0, y: 14 },
            { opacity: 1, y: 0, duration: 0.34, ease: "back.out(1.7)" },
            at + 0.12,
          );
      },
    };
  }

  root.HFKit = Object.assign(root.HFKit || {}, { varMarker: { create: create } });
})(typeof globalThis !== "undefined" ? globalThis : this);
