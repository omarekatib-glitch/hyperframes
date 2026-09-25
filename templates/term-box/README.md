# TERM_BOX — بيزنس مفهوم

A reusable overlay for English finance terms. When the host says a term like "Cash Flow" or "EBITDA", this box takes the place of the one-word Arabic caption for that moment. The term always stays in English and is never translated.

The overlay renders only the box. Everything else is transparent, and it composites on top of the talking-head footage in Premiere.

## Spec (locked)

| Item     | Value                                                                                  |
| -------- | -------------------------------------------------------------------------------------- |
| Canvas   | 1080×1920, 30 fps, transparent                                                         |
| Box      | `#1D6FA4`, radius 12px, padding 28px (x) × 16px (y), width hugs text                   |
| Text     | Montserrat Bold, `#F5F0E8`, 64px, auto-shrinks to 44px minimum, one line, max 22 chars |
| Shadow   | black 25%, 12px blur, 4px down (alpha version only)                                    |
| Position | centered horizontally; FULL = center at 70% height (y 1344), SPLIT = 65% (y 1248)      |
| IN       | 0.15s, scale 90→100% + opacity 0→100%, ease-out (`power2.out`)                         |
| HOLD     | 1.2s default, 0.6–3s                                                                   |
| OUT      | 0.1s opacity fade, no movement                                                         |
| Excluded | icons, underlines, glow, gradients, sparkles, background plates, blue text             |

Auto-shrink starts when the box would be wider than 900px, which leaves 90px of safe space on each side for platform UI. At 44px the type stops shrinking.

## Variables

| Variable             | Type    | Default     | Notes                                                                         |
| -------------------- | ------- | ----------- | ----------------------------------------------------------------------------- |
| `term_text`          | string  | `Cash Flow` | Trimmed and hard-capped at 22 characters                                      |
| `hold_duration`      | number  | `1.2`       | Clamped to 0.6–3s                                                             |
| `position_preset`    | enum    | `FULL`      | `FULL` or `SPLIT`                                                             |
| `font_size_override` | number  | `0`         | `0` = auto (64→44). Any value above 0 sets a fixed size and skips auto-shrink |
| `chroma_key`         | boolean | `false`     | Fallback: flat `#00FF00` plate, shadow removed                                |

## Render

Run these from this folder:

```bash
# ProRes 4444 with alpha (the master)
npx hyperframes render --format mov --output renders/cash-flow.mov \
  --variables '{"term_text":"Cash Flow"}'

# WebM with alpha
npx hyperframes render --format webm --output renders/ebitda.webm \
  --variables '{"term_text":"EBITDA","position_preset":"SPLIT"}'

# Batch: one file per term
./render-terms.sh "Cash Flow" "EBITDA" "Working Capital"
HOLD=1.8 PRESET=SPLIT ./render-terms.sh "Free Cash Flow"
```

To tweak the design live, run `npx hyperframes preview`. Studio shows every variable as an editable field.

### Chroma fallback

```bash
CHROMA=1 ./render-terms.sh "EBITDA"
```

**Export the chroma version as MOV, not MP4.** The MP4 path encodes the green with BT.601 coefficients but tags the file as BT.709. Premiere then shows it as about `#00D700` instead of `#00FF00`, which makes the key less clean. The MOV decodes as exact `#00FF00`, and the box stays exact `#1D6FA4`.

The chroma render has no shadow. The box is solid and opaque, so the only pixels mixed with green are the anti-aliased rounded corners. Ultra Key's default edge settings handle them.

## Timing and frame accuracy

The out-point is rounded up to the next whole frame, and one fully transparent frame is added at the end. That way the last frame of the file is empty and the clip never pops off in Premiere.

| Hold | Frames | File length |
| ---- | ------ | ----------- |
| 0.6s | 27     | 0.90s       |
| 1.2s | 45     | 1.50s       |
| 3.0s | 99     | 3.30s       |

At the default 1.2s hold, the alpha is: frame 0 transparent → frames 1–4 fade in → hold → frames 42–43 fade out → frame 44 transparent. The visible graphic lasts about 1.45s, as specified.

**Premiere placement:** put the clip on a track above the footage. Line up frame 1 with the moment the term is spoken (frame 0 is blank). Then cut the Arabic caption for that stretch.

## Files

- `index.html`: the composition
- `fonts/Montserrat-Bold.woff2`: a static Bold subset (Latin + Latin-1) made from Google Fonts' Montserrat variable font. The license is in `fonts/OFL.txt`
- `render-terms.sh`: batch renderer
