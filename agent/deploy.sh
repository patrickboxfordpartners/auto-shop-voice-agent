#!/usr/bin/env bash
# deploy.sh — deploy the agent to smallest.ai cloud (one-time per change)
#
# First-time setup:
#   1. Create an Atoms agent at https://console.smallest.ai
#   2. smallestai auth login
#   3. smallestai agent init  (links this directory to your agent)
#   Then run this script whenever you want to push a new version.
#
# After deploy:
#   • Set env vars in the smallest.ai console (Settings → Environment)
#   • Buy a phone number and assign it to the agent in the console

set -e
cd "$(dirname "$0")"

if [ ! -f ".smallestai/config.toml" ]; then
  echo "Agent not initialized. Run these first:"
  echo "  smallestai auth login"
  echo "  smallestai agent init"
  exit 1
fi

echo "Deploying Precision Auto Shop voice agent..."
smallestai agent deploy --entry-point app.py

echo ""
echo "Deploy complete."
echo ""
echo "Next steps (first time only):"
echo "  1. Go to https://console.smallest.ai → your agent → Settings"
echo "  2. Add environment variables:"
echo "     OPENAI_API_KEY, CAL_API_KEY, CAL_EVENT_TYPE_ID,"
echo "     CONVEX_SITE_URL, CARSXE_API_KEY, APIFY_API_TOKEN"
echo "  3. Buy a phone number (Phone Numbers → Buy Number → assign to agent)"
