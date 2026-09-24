# kit/

Reusable, seek-safe data-viz components for بيزنس مفهوم motion graphics.
All are **classic scripts** (no bundler) that attach to `window.HFKit` and schedule
tweens onto a GSAP timeline you pass in, so they work inside any HyperFrames
composition's single paused root timeline.

| Component                             | What it does                                                                                                                                             |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/gbm.js`                          | Seeded GBM simulator (mulberry32 + Box–Muller, exact log-normal step), `percentile`, `mean`, `histogram`. Also `require`-able from Node for build steps. |
| [`path-fan/`](path-fan/README.md)     | Monte Carlo fan of price paths with draw-on waves                                                                                                        |
| [`histogram/`](histogram/README.md)   | Sideways histogram on a price axis, overshoot growth, exact below-threshold highlight                                                                    |
| [`var-marker/`](var-marker/README.md) | Percentile/VaR line + tail zone + label chip, value computed from data                                                                                   |

**Loading in a project.** HyperFrames only serves files inside the project folder, so
copy the kit in at build time (see `montecarlo-graphic/build/sync-kit.mjs`) and load:

```html
<script src="vendor/gsap.min.js"></script>
<script src="vendor/kit/lib/gbm.js"></script>
<script src="vendor/kit/path-fan/path-fan.js"></script>
<script src="vendor/kit/histogram/histogram.js"></script>
<script src="vendor/kit/var-marker/var-marker.js"></script>
```

**Shared conventions**

- Full-frame SVG with `viewBox` = composition size, so SVG units == CSS px (var-marker's HTML label relies on this).
- Every component takes a `yOf(value)` mapping — pass the same one to all three so path ends, bars and the VaR line line up.
- `idPrefix` keeps generated ids unique when a component is used twice on one page.
- Brand defaults: navy `#1F2E5A`, burgundy `#7A1F2B` (risk/loss), gold `#C9A24A` (mean/highlight).
