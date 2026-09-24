# var-marker

Value-at-Risk marker: a horizontal line at a percentile of a distribution, a faint
tinted tail zone below it, and an HTML label chip. The value is **computed from the
data** — never typed — so the label can't drift from the chart.

## Inputs

| Option                          | Default          | Notes                                                                             |
| ------------------------------- | ---------------- | --------------------------------------------------------------------------------- |
| `percentile`                    | `5`              | 5 → 95% VaR                                                                       |
| `label`                         | `"VaR {100-p}%"` | Chip key text                                                                     |
| `data`                          | —                | Distribution (e.g. 1,000 terminal values)                                         |
| `reference`                     | —                | Value losses are measured from (e.g. `S0`). Default format shows `−loss%` vs this |
| `format(v, ref)`                | `−x.x%`          | Override the value string                                                         |
| `sublabel`                      | —                | Optional second line (e.g. `القيمة المعرضة للخطر`)                                |
| `group`, `layer`                | —                | SVG `<g>` for line/zone; full-frame HTML layer for the label                      |
| `x0`, `x1`, `yOf`, `zoneBottom` | —                | Geometry                                                                          |
| `labelPos`                      | —                | `{ x, y }` px, top-left of the label                                              |
| `color`                         | burgundy         |                                                                                   |
| `idPrefix`                      | `"var"`          |                                                                                   |

## Returns

`{ value, loss, y, line, zone, labelEl, slideIn(tl, at, dur), revealLabel(tl, at) }`

`slideIn` lands at `at + dur` — cue the impact SFX there. Style hooks:
`.var-marker-chip`, `.var-marker-key`, `.var-marker-value`, `.var-marker-sub`.

```js
const v = HFKit.varMarker.create({
  group,
  layer,
  data: terminals,
  percentile: 5,
  reference: 100,
  x0: 150,
  x1: 995,
  yOf,
  zoneBottom: 1410,
  label: "VaR 95%",
  sublabel: "القيمة المعرضة للخطر",
  labelPos: { x: 150, y: 1266 },
});
v.slideIn(tl, 11.05, 0.37);
v.revealLabel(tl, 11.62);
```
