# NUMBER_COUNTER — بيزنس مفهوم overlay

A brass count-up overlay for money figures, prices and percentages. It renders at 1080×1920, 30fps, on a transparent background.

| Beat  | Duration                           | Motion                                              |
| ----- | ---------------------------------- | --------------------------------------------------- |
| IN    | 0.2s                               | fade + rise 20px, ease-out                          |
| COUNT | `count_duration` (0.8–3s, def 1.5) | `start_value → end_value`, power3.out (decelerates) |
| LAND  | 0.2s                               | one pulse 100 → 104 → 100%                          |
| HOLD  | `hold_duration` (def 1.3)          | —                                                   |
| OUT   | 0.2s                               | fade                                                |

Markers: `SFX_TICK` at 0.2s (count start), `SFX_CHING` at 0.2s + `count_duration` (land).

## Variables

`start_value`, `end_value`, `decimals` (0–3), `prefix`, `suffix`, `label_text` (Arabic auto-switches to Cairo RTL), `count_duration`, `hold_duration`, plus:

- `max_width_pct` (default 30): the brass figure scales down to fit this share of frame width. At 160px, only about three characters fit in 30% (e.g. `38%`). For large figures (`EGP 1,250,000`), set 70–80.
- `green_screen` (default false): flat #00FF00 background with no shadow. Render this one to MP4.

## Render

```bash
# transparent ProRes 4444 (yuva444p12le)
npx hyperframes render . --format mov --strict-variables \
  --variables '{"end_value":1250000,"prefix":"EGP","suffix":"","label_text":"صافي الربح السنوي","max_width_pct":80}' \
  -o renders/egp-profit.mov

# Premiere markers for that render (pass the same count/hold overrides)
node scripts/export-markers.mjs --media renders/egp-profit.mov

# green-screen fallback
npx hyperframes render . --format mp4 -q delivery --variables '{"green_screen":true}' -o renders/green.mp4
```

In Premiere: **File → Import** `renders/<name>.markers.xml`. This brings in a sequence whose overlay clip already carries `SFX_TICK` and `SFX_CHING` markers. The `.csv`/`.json` sidecars hold the same frames if you prefer to place markers by hand.

Fonts (Montserrat, Cairo — SIL OFL) and GSAP are vendored under `assets/`, so renders don't depend on the network.
