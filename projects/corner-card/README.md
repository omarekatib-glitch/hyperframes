# CORNER_CARD — بيزنس مفهوم

Crumpled-paper corner card overlay. While the host keeps talking full-frame, a
small scrap pops into a bottom corner with a date or figure he just said, holds,
and drops away. Reference, not focus: it sits in the bottom 15% of a 9:16 frame
and never covers the face.

- Canvas 1080×1920, 30fps, transparent (only the card and its shadow render).
- Card ~380×240, cream `#F5F0E8`, heavily crumpled, torn edges, rotated −6°.
- Shadow: black 40%, 20px blur, 6px down (always falls straight down, independent of the card's tilt).
- Value: Montserrat Bold 84px. Brass `#C9A04A` if money, Warm Charcoal `#2C2C2C` otherwise.
- Label (optional): Cairo Bold 34px, Charcoal at 70%.
- Position: card center (240, 1560). The right preset mirrors it to (840, 1560), with the tilt mirrored to +6°.

## Timing

| Phase | Time                     | Motion                                                                    |
| ----- | ------------------------ | ------------------------------------------------------------------------- |
| IN    | 0 → 0.35s                | Flicks up from below the frame, −20° → −6°, `back.out` (slight overshoot) |
| HOLD  | `hold_duration` (1.5–5s) | Dead still                                                                |
| OUT   | 0.25s                    | Drops off the bottom, `power2.in`                                         |

Total = 0.6s + hold (the default 2.5s hold gives 3.1s, or 93 frames). The render
length follows `hold_duration`; the last frame is empty.

**Marker `SFX_PAPER` = frame 0.** The rendered file cannot carry a Premiere
marker, so the rule is: snap the paper-rustle SFX to the overlay clip's in-point.
The card is visible from about frame 3. The composition records the marker as
`data-marker-sfx="SFX_PAPER@0"` on the root.

## Variables

| id              | type    | default         | notes                                                                                                                                                                                                    |
| --------------- | ------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value_text`    | string  | `EGP 12,000`    | For money, a leading or trailing currency code (`EGP`, `USD`, `$`, `ج.م`) is set at 40% size so the figure keeps 84px. If the value still overflows the scrap, it shrinks, down to 52px at the smallest. |
| `label_text`    | string  | `الراتب الشهري` | Leave empty to hide the label.                                                                                                                                                                           |
| `is_money`      | boolean | `true`          | Brass when true, Charcoal when false.                                                                                                                                                                    |
| `corner`        | enum    | `left`          | `left` or `right`.                                                                                                                                                                                       |
| `hold_duration` | number  | `2.5`           | Clamped to 1.5–5s.                                                                                                                                                                                       |
| `green_screen`  | boolean | `false`         | Fallback plate: flat `#00FF00`, no shadow.                                                                                                                                                               |

Each value gets its own crumple pattern: the pattern is seeded from the text, so
two cards in one reel don't look copy-pasted, and re-rendering the same text
gives the same pattern.

## Render

```bash
cd projects/corner-card

# Master: ProRes 4444 with alpha (drop straight onto V2 over the A-roll in Premiere)
npx hyperframes render --format mov -o renders/cc_2016.mov \
  --variables '{"value_text":"2016","label_text":"","is_money":false}'

# Money, right corner, longer hold
npx hyperframes render --format mov -o renders/cc_12000_R.mov \
  --variables '{"value_text":"EGP 12,000","label_text":"الراتب الشهري","is_money":true,"corner":"right","hold_duration":3.5}'

# Lighter alpha alternative
npx hyperframes render --format webm -o renders/cc_2016.webm --variables '{"value_text":"2016","is_money":false}'

# Green-screen fallback (key it in Premiere with Ultra Key)
npx hyperframes render --format mp4 -o renders/cc_2016_green.mp4 \
  --variables '{"value_text":"2016","is_money":false,"green_screen":true}'
```

Live preview with editable variables: `npx hyperframes preview`.

## Known trade-off: brass on cream

`hyperframes check` flags the money value for contrast. Brass `#C9A04A` on cream
`#F5F0E8` measures about 2.2:1 on flat paper and less on the shaded folds, which
is under the 3:1 minimum for large text. It is left as brand-locked. If it reads
weak on a phone, a deeper brass around `#8F7235` passes the check and stays in
the brass family.
