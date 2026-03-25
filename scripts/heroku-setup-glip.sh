#!/usr/bin/env bash
# End-to-end: fix stale Heroku git remote + set GLIP_WEBHOOK_URL on the real app.
#
# Prerequisites:
#   1. heroku login   (browser or CLI — run once)
#   2. Know your app name from https://dashboard.heroku.com/apps (or create a new app)
#
# Usage (from dashboard/):
#   ./scripts/heroku-setup-glip.sh                    # uses HEROKU_APP env or prompts
#   ./scripts/heroku-setup-glip.sh my-app-name        # explicit app
#   HEROKU_APP=my-app ./scripts/heroku-setup-glip.sh
#
# Webhook URL: reads GLIP_WEBHOOK_URL from .env if present; else pass as 2nd arg:
#   ./scripts/heroku-setup-glip.sh my-app 'https://hooks.ringcentral.com/...'

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

die() { echo "Error: $*" >&2; exit 1; }

if ! command -v heroku &>/dev/null; then
  die "Heroku CLI not found. Install: https://devcenter.heroku.com/articles/heroku-cli"
fi

if ! heroku auth:whoami &>/dev/null; then
  die "Not logged in. Run: heroku login"
fi

echo "Heroku account: $(heroku auth:whoami)"

APP="${1:-${HEROKU_APP:-}}"
OLD_REMOTE_APP=""
if git remote get-url heroku &>/dev/null; then
  OLD_REMOTE_APP="$(git remote get-url heroku | sed -E 's#.*/([^/.]+)\.git#\1#')"
fi

if [ -z "$APP" ] && [ -n "$OLD_REMOTE_APP" ]; then
  if heroku apps:info -a "$OLD_REMOTE_APP" &>/dev/null; then
    APP="$OLD_REMOTE_APP"
    echo "Using existing remote app (verified): $APP"
  else
    echo "Git remote points to '$OLD_REMOTE_APP' but that app was not found (deleted or wrong account)."
    echo "Current Heroku apps you can access:"
    heroku apps || true
    die "Pass the correct app name: ./scripts/heroku-setup-glip.sh YOUR_APP_NAME"
  fi
fi

if [ -z "$APP" ]; then
  echo "Heroku apps on this account:"
  heroku apps || true
  die "Specify app: ./scripts/heroku-setup-glip.sh YOUR_APP_NAME   (or export HEROKU_APP=...)"
fi

heroku apps:info -a "$APP" &>/dev/null || die "Cannot access app '$APP'. Check name, team access, or run: heroku create $APP"

echo "Linking git remote heroku → $APP ..."
git remote remove heroku 2>/dev/null || true
heroku git:remote -a "$APP"

WEBHOOK_URL="${2:-}"
if [ -z "$WEBHOOK_URL" ] && [ -f .env ]; then
  # Value may contain '=' (JWT) — take everything after first =
  line="$(grep -E '^[[:space:]]*GLIP_WEBHOOK_URL=' .env | tail -1 || true)"
  if [ -n "$line" ]; then
    WEBHOOK_URL="${line#*=}"
    WEBHOOK_URL="${WEBHOOK_URL%$'\r'}"
    WEBHOOK_URL="${WEBHOOK_URL#\"}"
    WEBHOOK_URL="${WEBHOOK_URL%\"}"
    WEBHOOK_URL="${WEBHOOK_URL#\'}"
    WEBHOOK_URL="${WEBHOOK_URL%\'}"
  fi
fi

[ -n "$WEBHOOK_URL" ] || die "No webhook URL. Add GLIP_WEBHOOK_URL to .env or pass as second argument."

echo "Setting GLIP_WEBHOOK_URL on $APP ..."
heroku config:set "GLIP_WEBHOOK_URL=$WEBHOOK_URL" -a "$APP"

echo ""
echo "Done."
heroku config:get GLIP_WEBHOOK_URL -a "$APP" | sed 's/\(.\{60\}\).*/\1… (truncated)/'
echo ""
echo "Next: git push heroku main   (or master) to deploy."
