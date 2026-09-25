# BRIEF — PAPER_CARD

- workflow: motion-graphics
- flow: autonomous
- category: lower-thirds (overlay card) — form category, `asset_needs: []`
- brand: بيزنس مفهوم (EDITING-STYLE §5 "paper is an object", §9 item 2)
- canvas: 1080×1920 @ 30fps; optional 2160×3840 (DPR-2 supersample)
- output: transparent overlay — MOV ProRes 4444 + alpha (WebM alpha optional); green #00FF00 fallback with hard or no shadow
- content: title + 1–3 body lines + one highlighted phrase (variables)
- motion: IN 0.5s (SLIDE / DROP / PUSH_IN) → staged BUILD → HOLD until `hold_duration` → OUT 0.4s left; ≈5.4s
- markers: SFX_PAPER at start, SFX_CLICK per body line
- do not: clean white card, textbook look, icons, emojis, reveal all text at once
