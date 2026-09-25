# PAPER_CARD — بيزنس مفهوم

The master paper object: a wrinkled cream sheet with its surface shadow and a physical entrance. It holds the main idea of an explanation beat (a title plus 1–3 short lines) in the top ~60% of a 1080×1920 SPLIT layout. The host's face card goes underneath in Premiere.

This is a **design-system component**: later templates (hub diagram, corner card, sketch chart…) reuse its texture, shadow and motion. They don't restyle it.

## What ships

| File                            | Role                                                                                                            |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `index.html`                    | The HyperFrames composition (1080×1920, 30fps, transparent).                                                    |
| `paper-card-timing.js`          | **Single source of truth** for IN / BUILD / HOLD / OUT beats, the resting shadow, and the SFX markers.          |
| `assets/paper-texture.jpg`      | Master wrinkled-paper texture, 1800×2000 (2× the card, so 4K stays sharp). Its median pixel is exactly #F5F0E8. |
| `scripts/make-paper-texture.py` | Seeded generator for the texture. `--seed 7` is the brand sheet. Re-running it gives the same bytes.            |
| `scripts/markers.mjs`           | Writes the SFX markers as CSV plus FCP7 XML for Premiere import.                                                |
| `assets/fonts/`                 | Cairo + Montserrat variable fonts as WOFF2 (OFL, licences included), bundled so renders never hit the network.  |
| `assets/vendor/gsap.min.js`     | GSAP, vendored for offline, reproducible renders.                                                               |

## Variables

| id                 | type   | default                          | notes                                                                                                                   |
| ------------------ | ------ | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `title_text`       | string | `ليه الـ Inflation بياكل فلوسك؟` | Cairo Bold 72px, with Latin words auto-set in Montserrat Bold. Wraps to 2 lines max, then steps down to 52px.           |
| `body_line_1..3`   | string | three demo lines                 | Cairo Regular 46px, one line each. A long line shrinks to 34px instead of wrapping. Leave a line empty to drop it.      |
| `highlight_phrase` | string | `بتشتري حاجات أقل`               | Must appear verbatim in a body line. The first match gets the blue box.                                                 |
| `enter_variant`    | enum   | `SLIDE`                          | `SLIDE` / `DROP` / `PUSH_IN`                                                                                            |
| `hold_duration`    | number | `5`                              | **The timestamp at which OUT starts** ("hold until"), 2–10s. Total length is this plus 0.4s.                            |
| `background_mode`  | enum   | `transparent`                    | `transparent` (alpha), `green` (#00FF00, no shadow), `green_hard_shadow` (#00FF00 with a solid #1A1A1A shadow, no blur) |

The root has **no fixed `data-duration`**, so the render length follows the timeline. `hold_duration` really does change the clip length (hold 3 → 3.4s / 102 frames).

Short-hold rule: when the build can't finish at least 0.5s before OUT, the line stagger compresses from 0.6s down to a floor of 0.35s. The brief bans revealing everything at once, so it goes no lower. If that still doesn't fit, OUT waits for the build. Example: hold 2 with 3 lines → OUT at 2.8s.

## Timeline (defaults)

| t (s)           | Beat                                                           | Marker         |
| --------------- | -------------------------------------------------------------- | -------------- |
| 0.0–0.5         | IN (variant)                                                   | `SFX_PAPER`    |
| 0.5             | Title fades and rises (0.35s)                                  |                |
| 0.8–1.1         | Blue bar 80×8 draws right → left                               |                |
| 1.2 / 1.8 / 2.4 | Body lines fade and rise one at a time (0.4s each, 0.6s apart) | `SFX_CLICK` ×3 |
| line + 0.3      | Highlight box wipes right → left (0.3s)                        |                |
| → 5.0           | HOLD                                                           |                |
| 5.0–5.4         | OUT: slides left, rotates −1.5° → −5.5°, `power2.in`           |                |

Entrance variants:

- **SLIDE**: from off the right edge on `power3.out`. The rotation overshoots to −2.5°, then corrects 1° back to −1.5° as it settles.
- **DROP**: falls under gravity (`power2.in`) with scale 105% → 99% at impact → 100%, plus an 8px settle bounce. The shadow starts loose (70px down, 30px sigma, 12%) and tightens to rest at landing.
- **PUSH_IN**: scale 85% → 100% on `power3.out` with a 0.2s fade, so the sheet never cuts in.

Resting shadow (all variants): black 35%, 30px blur (Gaussian σ 15px), 10px down. It follows the sheet's slightly irregular, hand-torn-straight edge.

## Commands

Run these from this folder. `hyperframes` is the CLI (`npx hyperframes …`).

```bash
npx hyperframes lint && npx hyperframes check                     # gates (both pass clean)
npx hyperframes preview                                           # Studio: edit variables live

# Overlay masters — ProRes 4444 + alpha (yuva444p12le)
npx hyperframes render --format mov --output renders/PAPER_CARD_SLIDE_1080x1920.mov
npx hyperframes render --format mov --resolution portrait-4k --output renders/PAPER_CARD_SLIDE_2160x3840.mov
npx hyperframes render --format mov --variables '{"enter_variant":"DROP"}' --output renders/PAPER_CARD_DROP_1080x1920.mov

# Per-beat render from a JSON file of variable values
npx hyperframes render --format mov --variables-file beats/beat-04.json --output renders/beat-04.mov
node scripts/markers.mjs --variables-file beats/beat-04.json --name beat-04 --media renders/beat-04.mov

# Web alpha / green fallback
npx hyperframes render --format webm --output renders/PAPER_CARD.webm
npx hyperframes render --variables '{"background_mode":"green"}' --output renders/PAPER_CARD_GREEN.mp4
```

The 4K render is supersampled with Chrome DPR 2, not upscaled: text, texture and the shadow are all drawn natively at 2160×3840.

## Premiere

1. Import the `.mov`. ProRes 4444 alpha comes in as straight alpha. Put it on a track above the charcoal background or the footage.
2. Markers: `File → Import…` the matching `.xml`. It opens as a sequence holding the MOV, with `SFX_PAPER` / `SFX_CLICK` as clip markers, so they stay on the clip when you copy it into your edit. If Premiere asks to relink, point it at the MOV (the XML stores the absolute path from the render machine). The `.markers.csv` has the same list in readable form.
3. For push-ins in the edit, use the 2160×3840 render at 50% scale on a 1080×1920 timeline, then keyframe up to 100% with no softening.

Green fallback: keep it for tools without alpha. The `PUSH_IN` fade and the paper's anti-aliased edge produce a few semi-green frames/pixels. That's normal for a key, but prefer the alpha MOV whenever you can.

## Reusing the paper in other templates

- Copy `assets/paper-texture.jpg`, the `.pc-paper` / `.pc-shadow` CSS and the `--pc-edge` polygon. Don't redraw the sheet.
- Load `paper-card-timing.js` and take `IN`, `OUT` and `SHADOW` from it. Copy the `ENTER` variant table in `index.html` rather than re-deriving the eases.
- New texture sizes: `python3 scripts/make-paper-texture.py --seed 7 --out …` (edit `W, H`). Use the same seed for the same family of creases, or a different seed for a second sheet that should look different when both are on screen.
