#!/usr/bin/env bash
# start.sh — run the Precision Auto Shop voice agent locally
# Tests via: smallestai agent chat (in a second terminal)
#
# Prerequisites:
#   1. Fill in agent/.env (at minimum: OPENAI_API_KEY)
#   2. python3.14 must be in PATH (brew install python@3.14 if missing)

set -e
cd "$(dirname "$0")"

# Verify required env vars
source .env 2>/dev/null || true

if [ -z "$OPENAI_API_KEY" ]; then
  echo "ERROR: OPENAI_API_KEY is not set in agent/.env"
  echo "  Get yours at: https://platform.openai.com/api-keys"
  exit 1
fi

if [ -z "$CONVEX_SITE_URL" ]; then
  echo "WARNING: CONVEX_SITE_URL is not set — inventory/appointment tools will fail"
fi

echo ""
echo "  Precision Auto Shop — Voice Agent"
echo "  Listening on ws://localhost:8080/ws"
echo ""
echo "  To test: open a second terminal and run:"
echo "    smallestai agent chat"
echo ""
echo "  Press Ctrl+C to stop"
echo ""

python3.14 app.py
