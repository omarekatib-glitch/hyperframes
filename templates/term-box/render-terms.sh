#!/usr/bin/env bash
# Batch-render TERM_BOX overlays, one file per term.
#
#   ./render-terms.sh "Cash Flow" "EBITDA" "Free Cash Flow"
#   HOLD=1.8 PRESET=SPLIT ./render-terms.sh "Working Capital"
#   CHROMA=1 ./render-terms.sh "EBITDA"          # green-screen fallback
#
# Env: HOLD (0.6–3, default 1.2), PRESET (FULL|SPLIT, default FULL),
#      SIZE (px, 0 = auto), CHROMA (1 = #00FF00 plate, no shadow),
#      FORMAT (mov|webm, default mov → ProRes 4444 with alpha), OUT (default renders/).
set -euo pipefail

cd "$(dirname "$0")"

HOLD="${HOLD:-1.2}"
PRESET="${PRESET:-FULL}"
SIZE="${SIZE:-0}"
FORMAT="${FORMAT:-mov}"
OUT="${OUT:-renders}"
CHROMA_JSON=false
[ "${CHROMA:-0}" = "1" ] && CHROMA_JSON=true

if [ "$#" -eq 0 ]; then
  echo "usage: $0 \"Term One\" [\"Term Two\" ...]" >&2
  exit 1
fi

mkdir -p "$OUT"

for term in "$@"; do
  if [ "${#term}" -gt 22 ]; then
    echo "skip: \"$term\" is ${#term} chars (max 22)" >&2
    continue
  fi
  slug="$(printf '%s' "$term" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' '-' | sed 's/^-//; s/-$//')"
  suffix="$PRESET"
  [ "$CHROMA_JSON" = true ] && suffix="${suffix}-chroma"
  vars="$(TERM_TEXT="$term" HOLD="$HOLD" PRESET="$PRESET" SIZE="$SIZE" CHROMA="$CHROMA_JSON" node -e '
    const e = process.env;
    process.stdout.write(JSON.stringify({
      term_text: e.TERM_TEXT,
      hold_duration: Number(e.HOLD),
      position_preset: e.PRESET,
      font_size_override: Number(e.SIZE),
      chroma_key: e.CHROMA === "true",
    }));
  ')"
  npx hyperframes render \
    --format "$FORMAT" \
    --fps 30 \
    --strict-variables \
    --variables "$vars" \
    --output "$OUT/term-box_${slug}_${suffix}.${FORMAT}"
done
