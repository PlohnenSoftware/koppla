#!/usr/bin/env bash
set -euo pipefail

# Render all .koppla files in this folder to .svg with the same base name.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

pnpm exec tsc

OUTPUT_DIR="${SCRIPT_DIR}/renders"
mkdir -p "${OUTPUT_DIR}"

for file in "${SCRIPT_DIR}"/*.koppla; do
    [ -e "${file}" ] || continue
    base="$(basename "${file%.koppla}")"
    svg="${base}.svg"
    pnpm exec node "${REPO_ROOT}/bin/koppla" "${file}" -output="${OUTPUT_DIR}/${svg}" -useAltFont -bakeText
    echo "Rendered ${svg}"
done
