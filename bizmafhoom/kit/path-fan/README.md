# path-fan

Monte Carlo "fan": N price paths from one starting point, drawn at low opacity so
density shows where outcomes cluster. Seek-safe (dash-offset draw, `pathLength=1`).

## Inputs

| Option                                                  | Default                     | Notes                                                               |
| ------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------- |
| `group`                                                 | —                           | `<g>` to draw into (required)                                       |
| `paths`                                                 | —                           | Precomputed `number[][]`. **Or** omit and pass the GBM inputs below |
| `S0`, `mu`, `sigma`, `steps`, `nPaths`, `seed`, `years` | `years=1`                   | Annualised μ/σ; needs `lib/gbm.js`                                  |
| `x0`, `x1`                                              | —                           | Horizontal extent (start → horizon)                                 |
| `yOf(price)`                                            | —                           | Price → y                                                           |
| `colors`                                                | `{ line: navy, dot: gold }` |                                                                     |
| `strokeWidth`, `opacity`                                | `1.6`, `0.14`               | Resting "cloud" style per path                                      |
| `idPrefix`                                              | `"fan"`                     |                                                                     |

## Returns

`{ els, values, terminals, endpoints, origin, draw(tl, el, at, dur), drawWaves(tl, waves) }`

`drawWaves` multiplies the fan: `[{ from, to, at, span, dur, accel }]` — paths
`[from, to)` start across `span` seconds; `accel > 1` bunches later starts.

```js
const fan = HFKit.pathFan.create({
  group: document.getElementById("fan-g"),
  S0: 100,
  mu: 0.08,
  sigma: 0.25,
  steps: 252,
  nPaths: 200,
  seed: 42,
  x0: 150,
  x1: 735,
  yOf: (p) => 1400 - (p - 40) * 5.5,
});
fan.drawWaves(tl, [
  { from: 0, to: 1, at: 3, span: 0, dur: 1 },
  { from: 1, to: 10, at: 4.1, span: 0.8, dur: 0.75 },
  { from: 10, to: 200, at: 5, span: 2, dur: 0.6, accel: 1.6 },
]);
```

For reproducible _numbers_ on screen, run the simulation in a build step (see
`montecarlo-graphic/build/simulate.mjs`) and pass `paths`; the param mode is for quick drafts.
