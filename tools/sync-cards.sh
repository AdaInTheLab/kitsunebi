#!/usr/bin/env bash
#
# Pull the VPS's working copy up to date with origin/main.
#
# When you edit cards/*.md locally and push to GitHub, the VPS git checkout
# doesn't auto-update — the deploy workflow is path-filtered to skip
# card-only commits (so the live app's own pushes don't ping-pong into
# redeploys; see .github/workflows/deploy.yml). Run this one-liner after a
# local card edit to bring the VPS in sync.
#
# Usage:
#   tools/sync-cards.sh
#
set -euo pipefail

SSH_HOST="humanpatternlab@vps32678.dreamhostps.com"
SSH_KEY_FLAG=""
if [ -f "$HOME/.ssh/hpl_notebook_deploy" ]; then
  SSH_KEY_FLAG="-i $HOME/.ssh/hpl_notebook_deploy -o IdentitiesOnly=yes"
fi

echo "==> pulling cards/public on $SSH_HOST"
# `reset --hard` rather than `pull` because the VPS's local commits (from
# the git-sync layer) are already on origin/main; resetting just makes the
# working tree match. If the VPS has uncommitted local changes, that means
# the git-sync layer crashed mid-write — investigate before clobbering.
ssh $SSH_KEY_FLAG "$SSH_HOST" \
  "cd ~/kitsunebi.kitsuneden.net && \
   if ! git diff --quiet || ! git diff --cached --quiet; then \
     echo 'WARNING: VPS has uncommitted changes — refusing to reset.'; \
     git status --short; \
     exit 2; \
   fi && \
   git fetch && \
   git reset --hard origin/main"

echo "==> done. Astro server-mode re-reads cards on every request, so the"
echo "    next page load will reflect the pulled state. No PM2 reload needed."
