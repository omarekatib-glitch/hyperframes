# SECTION_HEADER — بيزنس مفهوم

A pinned section header overlay: a small label (`الخطوة ٢`) sits above a title on an Electric Blue bar (`Cash Flow`). It stays at the top of the frame for the whole section so the viewer always knows where they are. It orients the viewer and does not shout.

- Canvas: 1080×1920, 30 fps, transparent background
- Length: `0.5s IN + hold_duration + 0.3s OUT` (the default is 15.8s)
- Output: ProRes 4444 MOV with alpha (primary), VP9 WebM with alpha, or a green-screen MP4 as the fallback

## Variables

| id                | type    | default     | notes                                                                                                                    |
| ----------------- | ------- | ----------- | ------------------------------------------------------------------------------------------------------------------------ |
| `label_text`      | string  | `الخطوة ٢`  | Line 1. Arabic text uses Cairo Bold; text with no Arabic characters uses Montserrat Bold.                                |
| `title_text`      | string  | `Cash Flow` | Line 2. The font is picked the same way as line 1, per line.                                                             |
| `next_title_text` | string  | _(empty)_   | Leave empty for a plain header. If set, the title crossfades to this text (0.3s) while the bar resizes to fit it.        |
| `change_at`       | number  | `0`         | The section-change time in seconds from the start of the clip. `0` means mid-hold. The value is clamped inside the hold. |
| `alignment`       | enum    | `right`     | `right` (Arabic default) · `center` · `left`                                                                             |
| `hold_duration`   | number  | `15`        | How long the header stays still, in seconds. Clamped to 3–60s.                                                           |
| `chroma_fallback` | boolean | `false`     | Flat `#00FF00` background with no shadow. The label is drawn at full opacity so it keys cleanly.                         |

## Render

```bash
npm run render:mov      # ProRes 4444, yuva444p (alpha) → renders/SECTION_HEADER_alpha.mov
npm run render:webm     # VP9 + alpha                  → renders/SECTION_HEADER_alpha.webm
npm run render:green    # H.264 on #00FF00             → renders/SECTION_HEADER_green.mp4

# per-section render: pass the values as JSON
npx hyperframes render . --format mov -o renders/step3.mov \
  --variables '{"label_text":"الخطوة ٣","title_text":"الميزانية","hold_duration":22}'
```

## Timing and markers

| Time (s)     | Frame @30     | Event                                                            |
| ------------ | ------------- | ---------------------------------------------------------------- |
| 0.00         | 0             | **SFX_CLICK**: the bar starts wiping right→left (0.3s, ease-out) |
| 0.20         | 6             | Title fades in                                                   |
| 0.30         | 9             | Label fades in and drops 10px (settles at 80% opacity)           |
| 0.50         | 15            | HOLD begins. Nothing moves.                                      |
| `change_at`  | —             | _(optional)_ Title crossfade + bar resize, 0.3s                  |
| `0.5 + hold` | 465 (default) | OUT: the block fades and rises 10px over 0.3s                    |

HyperFrames can't write Premiere sequence markers into the file. The click is always on the clip's first frame, so in Premiere put the `SFX_CLICK` marker (or the SFX itself) on the clip's in-point.

## Layout (locked)

- The block's top edge is at y=180 (the label's line box). The right edge is 64px from the frame edge; for `left` it's the left edge.
- Label: 34px, cream `#F5F0E8` at 80% opacity, no background, 10px above the bar.
- Title: 54px cream on `#1D6FA4`, radius 10px, padding 24×12px. The bar is measured from the text, so it always hugs it.
- Shadow: black at 25%, 10px blur. It is removed in the chroma fallback.
- Not allowed: motion during the hold, pulsing, icons, underlines, blue text.

## Edit in Studio (Windows desktop shortcut)

Run this once in PowerShell from this folder:

```powershell
powershell -ExecutionPolicy Bypass -File .\install-desktop-shortcut.ps1
```

Double-clicking **SECTION_HEADER Studio** on the desktop runs `open-studio.ps1`. That starts the HyperFrames Studio server and opens the timeline editor at `http://localhost:3002`. Leave the PowerShell window open while you edit; closing it stops Studio. Edits save to `index.html` in this folder. Requires Node.js (LTS).

## Files

- `index.html`: the composition
- `open-studio.ps1` / `install-desktop-shortcut.ps1`: the Studio launcher and the desktop-shortcut installer
- `assets/fonts/`: Cairo 700 (Arabic + Latin subsets) and Montserrat 700 (Latin), both under the OFL
- `assets/vendor/gsap.min.js`: GSAP 3.14.2, bundled so renders never make a network request
