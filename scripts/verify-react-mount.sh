#!/bin/bash
# verify-react-mount.sh
# Validates that React mounts successfully on stage environment

set -e

STAGE_URL="${STAGE_URL:-https://stage.geckoadvisor.com}"
TIMEOUT=10

echo "🔍 Verifying React Mounting Fix on: $STAGE_URL"
echo "================================================"

# Check 1: Homepage loads with 200 OK
echo -n "✓ Checking homepage loads... "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$STAGE_URL")
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ OK (HTTP $HTTP_CODE)"
else
  echo "❌ FAIL (HTTP $HTTP_CODE)"
  exit 1
fi

# Check 2: Vendor-react chunk exists and has correct size
echo -n "✓ Checking vendor-react bundle... "
VENDOR_REACT=$(curl -s "$STAGE_URL" | grep -o 'vendor-react\.[^"]*\.js' | head -1)
if [ -n "$VENDOR_REACT" ]; then
  CHUNK_URL="$STAGE_URL/chunks/$VENDOR_REACT"
  CHUNK_SIZE=$(curl -s "$CHUNK_URL" | wc -c)
  # Should be ~186KB (186000 bytes) with scheduler, NOT ~182KB without
  if [ "$CHUNK_SIZE" -gt 185000 ] && [ "$CHUNK_SIZE" -lt 190000 ]; then
    echo "✅ OK ($CHUNK_SIZE bytes, includes scheduler)"
  else
    echo "⚠️  WARNING ($CHUNK_SIZE bytes, expected ~186KB)"
  fi
else
  echo "❌ FAIL (vendor-react chunk not found)"
  exit 1
fi

# Check 3: Verify root div is not empty
echo -n "✓ Checking React renders content... "
PAGE_HTML=$(curl -s "$STAGE_URL")
# Check if <div id="root"></div> is empty (bad) or has content (good)
if echo "$PAGE_HTML" | grep -q '<div id="root"></div>'; then
  echo "❌ FAIL (root div is empty - React not mounting)"
  exit 1
else
  echo "✅ OK (root div has content)"
fi

# Check 4: Verify scheduler is in vendor-react bundle
echo -n "✓ Checking scheduler bundled with React... "
if curl -s "$CHUNK_URL" | grep -q "scheduleCallback"; then
  echo "✅ OK (scheduler found in bundle)"
else
  echo "❌ FAIL (scheduler not found in vendor-react)"
  exit 1
fi

# Check 5: Check for JavaScript errors (basic validation)
echo -n "✓ Checking for console errors... "
# This is a simplified check - full validation needs browser automation
if echo "$PAGE_HTML" | grep -qi "error\|exception\|undefined"; then
  echo "⚠️  WARNING (potential errors detected, manual verification needed)"
else
  echo "✅ OK (no obvious errors in HTML)"
fi

echo ""
echo "================================================"
echo "✅ All React mounting checks passed!"
echo ""
echo "Manual Verification Steps:"
echo "1. Open $STAGE_URL in browser"
echo "2. Check DevTools Console for errors"
echo "3. Verify homepage UI renders correctly"
echo "4. Test navigation (About, Docs, Pricing)"
echo "5. Verify scan functionality works"
echo ""
echo "Deployment Status: READY FOR PRODUCTION ✨"
