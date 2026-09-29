# split-frame — reusable overlay template

`compositions/split-frame.html` is the template. `index.html` is a demo host.
Canvas 1080x1920, 30fps.

## Editing from the Studio timeline

- **START_TIME / DURATION** = the host clip's `data-start` / `data-duration`. Drag and trim the clip;
  the template reads the host duration for its out-transition (falls back to the `DURATION` variable).
- All other constants are `data-composition-variables` (Studio variables panel) and per-instance
  overrides via `data-variable-values` on the host: `BG_MODE`, `GRAPHIC_ZONE_HEIGHT_PCT`,
  `FACE_X_INSET_PCT`, `FACE_HEIGHT_PCT`, `FACE_BOTTOM_MARGIN_PCT`, `FACE_CORNER_RADIUS_PX`,
  `CAPTION_SLOT_Y_PCT`, `TRANSITION_IN/OUT`, `TRANSITION_DURATION`, `EASE`, `SHADOW_INTENSITY`,
  `DOT_GRID`, `FOOTAGE_PLACEHOLDER`.
- Keep SPLIT <= ~15s. Longer logs a console warning.

## Slots

`#GRAPHIC_SLOT` (paper area) and `#CAPTION_SLOT` (empty, centred at `CAPTION_SLOT_Y_PCT`) are empty named
boxes. Geometry for parented overlays: `window.__splitFrame`.

## Modes

- `paper`: charcoal + dot grid + crumpled cream sheet + shadows; the face window is a real cut-out.
  `FOOTAGE_PLACEHOLDER=true` fills it with a flat charcoal plate (preview MP4);
  `false` leaves it transparent for an alpha export stacked over V1.
- `green`: flat `#00FF00` everywhere, no shadows/blur/texture.

## SFX markers (no audio authored)

Timeline labels `sfx:swoosh#1` (0s) and `sfx:swoosh#2` (DURATION - TRANSITION_DURATION);
also in `window.__sfxMarkers["split-frame"]`.

## Presets

`npm run render:paper-preview` → `renders/split-frame_paper-preview.mp4`.
`npm run check` samples the transitions (`--at-transitions`); the default sampler only sees the static hold.
