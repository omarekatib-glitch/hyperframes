# versus-card

Reusable 1080x1920 / 30fps side-by-side comparison overlay (بيزنس مفهوم brand lock).

Edit every option in Studio's variables panel, or override at render time:

```bash
npx hyperframes render --fps 30 --variables '{"left_title":"Equity","winner":"left","enter":"drop"}'
npm run render:green     # BG_MODE=green, flat #00FF00 for Ultra Key
npm run render:overlay   # transparent WebM (use with bg_mode paper)
```

- `LEFT` / `RIGHT` are flattened to `left_title`, `left_r{1-4}_{label,value,type}` (same for `right_*`). Empty label+value drops the row. Values are ILLUSTRATIVE: REPLACE WITH SOURCED DATA.
- Length is `start_time + duration`, inferred from the timeline. If rows would overrun `duration`, the build compresses to fit (console warning).
- SFX are named markers only (`paper-rustle`, `tick`, `ching`), max one per second, exposed as `<ol id="vc-sfx-markers">` and `window.__hfSfxMarkers`. No audio is embedded.
- Fonts (Cairo, Montserrat) and GSAP are vendored in `assets/` (SIL OFL fonts) so renders are offline and deterministic.
