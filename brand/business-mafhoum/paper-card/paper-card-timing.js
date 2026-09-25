/*
 * PAPER_CARD timing — single source of truth.
 *
 * Loaded by index.html (browser, sets window.PaperCardTiming) and by
 * scripts/markers.mjs (Node, module.exports) so the SFX markers handed to
 * Premiere can never drift from the rendered motion.
 *
 * Every downstream template that reuses the paper (hub diagram, corner
 * card, …) should import IN/OUT/SHADOW from here rather than copy numbers.
 */
(function (root) {
  var IN = { duration: 0.5 };
  var OUT = { duration: 0.4 };
  var BUILD = {
    titleAt: 0.5, // title fades in
    titleDur: 0.35,
    barAt: 0.8, // blue bar draws right -> left
    barDur: 0.3,
    firstLineAt: 1.2, // first body line (bar done at 1.1 + 0.1 breath)
    lineGap: 0.6, // one line at a time, 0.6s apart
    minLineGap: 0.35, // compressed floor for short holds
    lineDur: 0.4, // fade + rise
    highlightDelay: 0.3, // box wipes 0.3s after its line appears
    highlightDur: 0.3,
    minReadHold: 0.5, // fully-built card stays still at least this long
  };
  var HOLD = { min: 2, max: 10, default: 5 };
  // Resting surface shadow: black 35%, 30px blur, 10px down.
  var SHADOW = { opacity: 0.35, blur: 30, y: 10 };

  function clamp(v, lo, hi) {
    return Math.min(hi, Math.max(lo, v));
  }

  /**
   * @param {{ holdDuration?: number, lineCount?: number, highlightLine?: number }} o
   *   holdDuration — timestamp (s) at which OUT begins ("hold until"), 2–10.
   *   lineCount    — number of non-empty body lines (0–3).
   *   highlightLine — index of the line carrying the highlight, or -1.
   */
  function plan(o) {
    var holdUntil = clamp(Number(o.holdDuration) || HOLD.default, HOLD.min, HOLD.max);
    var n = clamp(o.lineCount | 0, 0, 3);
    var hl = o.highlightLine == null ? -1 : o.highlightLine;

    function buildEnd(gap) {
      if (n === 0) return BUILD.barAt + BUILD.barDur;
      var last = BUILD.firstLineAt + (n - 1) * gap + BUILD.lineDur;
      if (hl >= 0) {
        var h = BUILD.firstLineAt + hl * gap + BUILD.highlightDelay + BUILD.highlightDur;
        last = Math.max(last, h);
      }
      return last;
    }

    // Short holds compress the line stagger (never below minLineGap — the
    // brief bans revealing everything at once); if it still doesn't fit,
    // OUT waits for the build instead of cutting it off.
    var gap = BUILD.lineGap;
    if (n > 1 && buildEnd(gap) + BUILD.minReadHold > holdUntil) {
      var room = holdUntil - BUILD.minReadHold - BUILD.firstLineAt - BUILD.lineDur;
      gap = clamp(room / (n - 1), BUILD.minLineGap, BUILD.lineGap);
    }
    var outAt = Math.max(holdUntil, buildEnd(gap) + BUILD.minReadHold);
    outAt = Math.round(outAt * 30) / 30; // land on a 30fps frame

    var lines = [];
    for (var i = 0; i < n; i++) lines.push(BUILD.firstLineAt + i * gap);
    var highlightAt = hl >= 0 && hl < n ? lines[hl] + BUILD.highlightDelay : null;
    var end = outAt + OUT.duration;

    var markers = [{ name: "SFX_PAPER", time: 0 }];
    lines.forEach(function (t, i) {
      markers.push({ name: "SFX_CLICK", time: t, note: "body line " + (i + 1) });
    });

    return {
      in: { at: 0, duration: IN.duration },
      titleAt: BUILD.titleAt,
      titleDur: BUILD.titleDur,
      barAt: BUILD.barAt,
      barDur: BUILD.barDur,
      lines: lines,
      lineDur: BUILD.lineDur,
      lineGap: gap,
      highlightAt: highlightAt,
      highlightDur: BUILD.highlightDur,
      outAt: outAt,
      outDur: OUT.duration,
      end: end,
      markers: markers,
    };
  }

  var api = { IN: IN, OUT: OUT, BUILD: BUILD, HOLD: HOLD, SHADOW: SHADOW, plan: plan };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PaperCardTiming = api;
})(typeof window !== "undefined" ? window : globalThis);
