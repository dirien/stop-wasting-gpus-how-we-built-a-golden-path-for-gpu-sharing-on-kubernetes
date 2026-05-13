#!/usr/bin/env bash
# Revert infra/index.ts from "Friday's block" back to "tonight's block".
# Run if you applied switch-to-friday.sh and want to roll back.

set -euo pipefail
cd "$(dirname "$0")"
FILE=index.ts

if grep -q '"cr-085916fd734a060cd"' "$FILE"; then
    echo "✅ Already on today's config. Nothing to do."
    exit 0
fi

if ! grep -q '"cr-0654ff09326e4aafc"' "$FILE"; then
    echo "ERROR: $FILE is in an unexpected state — neither config is present." >&2
    exit 1
fi

sed -i.tmp 's|"cr-0654ff09326e4aafc"|"cr-085916fd734a060cd"|g' "$FILE"
sed -i.tmp 's|"p4de.24xlarge"|"p4d.24xlarge"|g'                "$FILE"
sed -i.tmp 's|s.az === "us-west-2a"|s.az === "us-west-2b"|g'   "$FILE"
sed -i.tmp 's|profile == "3g.40gb"|profile == "3g.20gb"|g'     "$FILE"
sed -i.tmp 's|profile == "2g.20gb"|profile == "2g.10gb"|g'     "$FILE"
sed -i.tmp 's|profile == "1g.10gb"|profile == "1g.5gb"|g'      "$FILE"
rm -f "$FILE.tmp"

echo "✅ Reverted to today's config (p4d, us-west-2b, cr-085916fd734a060cd)."
