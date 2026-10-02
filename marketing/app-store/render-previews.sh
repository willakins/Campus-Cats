#!/usr/bin/env bash
set -euo pipefail
preview_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
preview_output="$preview_dir/../../assets/images/app_previews"
preview_temp="$(mktemp -d /tmp/campus-cats-previews.XXXXXX)"
trap 'rm -rf "$preview_temp"' EXIT
mkdir -p "$preview_output"
command -v chromium >/dev/null
preview_names=(01-live-sighting-map 02-community-hub 03-presidential-election 04-feeding-stations 05-cat-catalog 06-cat-sighting-history 07-member-profile 08-donation-setup)
for preview_index in "${!preview_names[@]}"; do
  chromium --headless --no-sandbox --disable-gpu --disable-dev-shm-usage \
    --no-first-run --user-data-dir="$preview_temp/browser" --hide-scrollbars \
    --allow-file-access-from-files --force-device-scale-factor=3 \
    --window-size=440,956 --timeout=10000 \
    --screenshot="$preview_output/${preview_names[$preview_index]}.png" \
    "file://$preview_dir/source/preview.html?slide=$((preview_index + 1))"
done
