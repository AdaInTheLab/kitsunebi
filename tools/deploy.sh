#!/usr/bin/env bash
#
# Build kitsunebi locally, sync the bundle to the DreamHost VPS, reload PM2.
#
# Usage:
#   tools/deploy.sh                 # build + sync + reload
#   tools/deploy.sh --dry-run       # rsync in dry-run mode (shows what would change)
#   tools/deploy.sh --skip-build    # use the existing dist/ as-is
#
# Prereqs (one-time):
#   - SSH key auth to humanpatternlab@vps32678.dreamhostps.com
#   - ~/kitsunebi.kitsuneden.net/ exists on the VPS with logs/ subdir
#   - cloudflared ingress rule: kitsunebi.kitsuneden.net → http://127.0.0.1:8002
#   - PM2 already started this app once: `pm2 start ecosystem.config.cjs`
#   See README.md "Deployment" for the full one-time setup walkthrough.
#
set -euo pipefail

SSH_HOST="humanpatternlab@vps32678.dreamhostps.com"
REMOTE_DIR="~/kitsunebi.kitsuneden.net"
SSH_KEY_FLAG=""

# Default key matches what we use for paint.kitsuneden.net etc.
if [ -f "$HOME/.ssh/hpl_notebook_deploy" ]; then
  SSH_KEY_FLAG="-i $HOME/.ssh/hpl_notebook_deploy -o IdentitiesOnly=yes"
fi

DRY_RUN=""
SKIP_BUILD=""
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN="--dry-run" ;;
    --skip-build) SKIP_BUILD="1" ;;
    *) echo "unknown flag: $arg" >&2; exit 2 ;;
  esac
done

cd "$(dirname "$0")/.."

if [ -z "$SKIP_BUILD" ]; then
  echo "==> building locally"
  npm run build
fi

if [ ! -f dist/server/entry.mjs ]; then
  echo "ERROR: dist/server/entry.mjs not found. Did you run 'npm run build'?" >&2
  exit 1
fi

echo "==> syncing to $SSH_HOST:$REMOTE_DIR"
# We rsync:
#   - dist/        (the Astro Node standalone bundle; self-contained)
#   - cards/       (source of truth for card content; the API mutates these)
#   - comments/    (per-card comment jsonl files; mutated by the API)
#   - public/      (static assets including attachments/)
#   - ecosystem.config.cjs   (PM2 config)
#
# We do NOT rsync:
#   - node_modules/   (Astro standalone bundles everything; not needed at runtime)
#   - src/, *.config.*, package*.json   (only needed to build, not to run)
#   - .git/   (the VPS has its own clone for git-sync; see below)
#
# We use --delete on dist/ so stale chunks get cleaned up, but NOT on cards/,
# comments/, or public/ — those are mutated on the VPS by the API and we'd
# lose anything created since the last local pull.
rsync -avz $DRY_RUN --delete \
  -e "ssh $SSH_KEY_FLAG" \
  dist/ \
  "$SSH_HOST:$REMOTE_DIR/dist/"

rsync -avz $DRY_RUN \
  -e "ssh $SSH_KEY_FLAG" \
  cards/ \
  "$SSH_HOST:$REMOTE_DIR/cards/"

# `comments/` may not exist locally if no card has been commented on yet;
# skip if absent so the rsync doesn't fail.
if [ -d comments ]; then
  rsync -avz $DRY_RUN \
    -e "ssh $SSH_KEY_FLAG" \
    comments/ \
    "$SSH_HOST:$REMOTE_DIR/comments/"
fi

rsync -avz $DRY_RUN \
  -e "ssh $SSH_KEY_FLAG" \
  --exclude 'attachments/' \
  public/ \
  "$SSH_HOST:$REMOTE_DIR/public/"

rsync -avz $DRY_RUN \
  -e "ssh $SSH_KEY_FLAG" \
  ecosystem.config.cjs \
  "$SSH_HOST:$REMOTE_DIR/"

if [ -n "$DRY_RUN" ]; then
  echo "==> dry run complete; not reloading PM2"
  exit 0
fi

echo "==> reloading PM2 on $SSH_HOST"
ssh $SSH_KEY_FLAG "$SSH_HOST" \
  "cd ~/kitsunebi.kitsuneden.net && \
   ~/.nvm/versions/node/v20.19.6/bin/pm2 reload kitsunebi || \
   ~/.nvm/versions/node/v20.19.6/bin/pm2 start ecosystem.config.cjs"

echo "==> verifying"
ssh $SSH_KEY_FLAG "$SSH_HOST" \
  "~/.nvm/versions/node/v20.19.6/bin/pm2 list | grep -E 'kitsunebi|cf-tunnel' || true"

echo "==> done. https://kitsunebi.kitsuneden.net should be live."
