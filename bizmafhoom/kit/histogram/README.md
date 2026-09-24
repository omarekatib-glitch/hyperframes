# histogram

Sideways histogram on a shared price axis: bars grow horizontally from a vertical
baseline, one per price bin, with a back-ease overshoot. Optional highlight recolours
everything **below a threshold value** using an exact clip, so a bar straddling the
threshold splits at the line instead of flipping whole.

## Inputs

| Option                   | Default   | Notes                                                            |
| ------------------------ | --------- | ---------------------------------------------------------------- |
| `group`                  | —         | `<g>` to draw into                                               |
| `data`                   | —         | Raw `number[]` — **or** `bins: [{lo, hi, count}]` precomputed    |
| `min`, `max`, `binWidth` | —         | Binning when `data` is given (out-of-range folds into edge bins) |
| `axisX`, `maxLen`        | —         | Baseline x, px length of the tallest bar                         |
| `yOf(value)`             | —         | Same mapping as the chart                                        |
| `gap`, `color`           | `8`, navy |                                                                  |
| `threshold`              | —         | **Highlight threshold** (value); omit for no highlight           |
| `highlightColor`         | burgundy  |                                                                  |
| `idPrefix`               | `"hist"`  |                                                                  |

## Returns

`{ bins, bars, hiBars, grow(tl, { groups, stagger, dur, ease, order }), highlight(tl, at, dur) }`

`grow` splits bars into `groups.length` contiguous groups (`order: "up"` = low values
first) and starts each group at its time — one SFX per group, not per bar.

```js
const hist = HFKit.histogram.create({
  group,
  data: terminals,
  min: 40,
  max: 200,
  binWidth: 8,
  axisX: 760,
  maxLen: 235,
  yOf,
  threshold: HFKit.gbm.percentile(terminals, 5),
});
hist.grow(tl, { groups: [8.62, 8.94, 9.26, 9.58] });
hist.highlight(tl, 11.5);
```
