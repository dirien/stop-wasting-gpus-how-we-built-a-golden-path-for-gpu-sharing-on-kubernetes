#!/usr/bin/env bash
# Swap infra/index.ts from "tonight's block" (us-west-2b, p4d, A100 40GB) to
# "Friday's block" (us-west-2a, p4de, A100 80GB) for the KCD Texas talk.
#
# Friday block:
#   Reservation:    cr-0654ff09326e4aafc
#   SKU:            p4de.24xlarge (8x A100 80GB)
#   AZ:             us-west-2a
#   Active window:  2026-05-15 11:30 UTC (Fri 6:30 AM CDT)
#                 → 2026-05-16 11:30 UTC (Sat 6:30 AM CDT)
#
# Run from the infra/ directory:
#   bash switch-to-friday.sh
#
# Then deploy:
#   pulumi up --yes
#
# To revert: bash switch-to-today.sh   (or:  git checkout -- index.ts)

set -euo pipefail
cd "$(dirname "$0")"
FILE=index.ts
BACKUP=index.ts.before-friday

if [ ! -f "$FILE" ]; then
    echo "ERROR: $FILE not found. Run from infra/ directory." >&2
    exit 1
fi

if grep -q '"cr-0654ff09326e4aafc"' "$FILE"; then
    echo "✅ Already switched to Friday config. Nothing to do."
    exit 0
fi

if ! grep -q '"cr-085916fd734a060cd"' "$FILE"; then
    echo "ERROR: $FILE doesn't contain today's reservation id." >&2
    echo "       The file may already be modified, or is in an unexpected state." >&2
    exit 1
fi

cp "$FILE" "$BACKUP"
echo "📦 Backed up $FILE → $BACKUP"

# 6 functional swaps:
sed -i.tmp 's|"cr-085916fd734a060cd"|"cr-0654ff09326e4aafc"|g' "$FILE"   # reservation
sed -i.tmp 's|"p4d.24xlarge"|"p4de.24xlarge"|g'                "$FILE"   # SKU in LT
sed -i.tmp 's|s.az === "us-west-2b"|s.az === "us-west-2a"|g'   "$FILE"   # AZ filter
sed -i.tmp 's|profile == "3g.20gb"|profile == "3g.40gb"|g'     "$FILE"   # large MIG profile
sed -i.tmp 's|profile == "2g.10gb"|profile == "2g.20gb"|g'     "$FILE"   # medium MIG profile
sed -i.tmp 's|profile == "1g.5gb"|profile == "1g.10gb"|g'      "$FILE"   # small MIG profile
rm -f "$FILE.tmp"

echo ""
echo "✅ Switched to Friday config. Diff vs backup:"
diff -u "$BACKUP" "$FILE" || true

echo ""
echo "Next:"
echo "  pulumi env set ediri/pulumi-idp/auth aws.region us-west-2"
echo "  pulumi up --yes"
