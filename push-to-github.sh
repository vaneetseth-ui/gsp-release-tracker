#!/bin/bash
# ============================================================
# push-to-github.sh
# Run this once to push the GSP Release Tracker to GitHub.
#
# Prerequisites:
#   1. Create a new repo at https://github.com/new
#      Name: gsp-release-tracker   (or whatever you prefer)
#      Visibility: Private
#      Do NOT add README / .gitignore / license (we have those)
#
#   2. Create a GitHub Personal Access Token (PAT):
#      https://github.com/settings/tokens/new
#      → Scopes needed: repo (full control)
#      Copy the token — you only see it once.
#
#   3. Run this script:
#      bash push-to-github.sh
# ============================================================

set -e

# ── Config (edit these) ───────────────────────────────────
GITHUB_USERNAME="vaneetseth-ui"
REPO_NAME="gsp-release-tracker"
# ─────────────────────────────────────────────────────────

echo ""
echo "Enter your GitHub Personal Access Token (hidden):"
read -s GITHUB_TOKEN
echo ""

if [ -z "$GITHUB_TOKEN" ]; then
  echo "❌ Token cannot be empty. Exiting."
  exit 1
fi

REMOTE_URL="https://${GITHUB_USERNAME}:${GITHUB_TOKEN}@github.com/${GITHUB_USERNAME}/${REPO_NAME}.git"

echo "→ Setting remote origin..."
git remote remove origin 2>/dev/null || true
git remote add origin "$REMOTE_URL"

echo "→ Pushing to GitHub..."
git push -u origin main

echo ""
echo "✅ Done! Repo is live at:"
echo "   https://github.com/${GITHUB_USERNAME}/${REPO_NAME}"
echo ""
echo "Next: connect this repo to Heroku — see DEPLOY.md for steps."
