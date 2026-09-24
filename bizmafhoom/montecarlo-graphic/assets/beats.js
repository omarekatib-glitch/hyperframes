// Single source of truth for timing — read by index.html (visuals) and
// build/sfx.mjs (audio), so every SFX lands on the frame its visual does.
// Seconds, absolute composition time.
(function (root) {
  root.BEATS = {
    duration: 15,
    // 0.0–2.5 HOOK
    swoosh: 0.08,
    tear: 0.18, // torn-edge reveal runs 0.18 → 0.62
    arabic: 0.62,
    cardOut: 2.45,
    // 2.5–4.0 ONE STARTING POINT
    dot: 2.72,
    path1: 2.92, // draws for 1.0s
    // 4.0–8.0 THE FAN
    fan: 4.0,
    counterStart: 4.05,
    counterEnd: 7.65,
    counterTicks: 40, // one tick per 25 scenarios; interval shrinks with ease-in
    // 8.0–11.0 THE DISTRIBUTION
    dist: 8.0,
    dropEnd: 8.6,
    barGroups: [8.62, 8.94, 9.26, 9.58],
    mean: 10.05,
    // 11.0–13.5 THE RISK
    varSlide: 11.05,
    varLand: 11.42,
    varLabel: 11.62,
    // 13.5–15.0 THE TAKEAWAY
    takeaway: 13.5,
    strip: 13.6,
    textDone: 14.2, // final frame held 14.2 → 15.0 (0.8s)
    chaChing: 14.12,
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
