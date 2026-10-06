#!/usr/bin/env bash
set -euo pipefail
creative_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
creative_output="$creative_root/creative-assets"
creative_temp="$(mktemp -d /tmp/campus-cats-creative.XXXXXX)"
trap 'rm -rf "$creative_temp"' EXIT
mkdir -p "$creative_output"
command -v chromium >/dev/null
command -v magick >/dev/null
for creative_kind in header search; do
  if [[ "$creative_kind" == header ]]; then
    creative_height=1646
    creative_name=header
  else
    creative_height=2560
    creative_name=search-results
  fi
  chromium --headless --no-sandbox --disable-gpu --disable-dev-shm-usage \
    --no-first-run --user-data-dir="$creative_temp/browser" --hide-scrollbars \
    --allow-file-access-from-files --force-device-scale-factor=1 \
    --window-size="3840,$creative_height" --virtual-time-budget=5000 \
    --screenshot="$creative_temp/$creative_name.png" \
    "file://$creative_root/source/creative-assets.html?asset=$creative_kind"
  # Export opaque RGB PNG files even when Chromium supplies a redundant alpha channel.
  magick "$creative_temp/$creative_name.png" -background '#fff9f0' -alpha remove -alpha off \
    -colorspace sRGB "PNG24:$creative_output/$creative_name.png"
  magick identify "$creative_output/$creative_name.png"
done
