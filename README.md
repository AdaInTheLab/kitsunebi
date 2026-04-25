# kitsunebi

A kanban for the Skulk. Each card is a little flame.

Cards live as markdown files in `cards/`. The viewer renders them into columns by status (backlog / in-progress / blocked / done). Humans can edit cards in any markdown editor, drag them between columns in the web UI, and attach images by clicking. Agents will soon be able to create and move cards via the same API the UI uses.

Named for **kitsunebi** (狐火, "fox fire") — the floating bluish-white flames attributed to kitsune in Japanese folklore. A board of cards is a procession of lanterns visible in the dark.

## Card format

```
---
id: vesper-deploy
title: Vesper VPS deploy
status: in_progress   # backlog | in_progress | blocked | done | archived
owner: ada
collaborators: [vesper, claude, sage]
due: 2026-05-02
created: 2026-04-20
tags: [vesper, openhearth]
blocked_by: []
---

Description in markdown. Subtasks as checkboxes.

- [x] Spec the VPS
- [x] Write setup-vps.sh
- [ ] Provision Hetzner box
```

## Images / media on cards

Click **+ Attach image** on any card detail page. The file lands in `public/attachments/<card-id>/` and a markdown reference gets appended to the card body automatically. Supports any format a browser renders inline (PNG, JPG, WebP, SVG, GIF, MP4, WebM). Images inherit the foxfire aesthetic — rounded corners, subtle border, glow on card hover.

You can still drop files into `public/attachments/<card-id>/` over SSH and reference them from the body manually if you prefer.

## Running locally

```bash
npm install
npm run dev
```

The dev server hot-reloads on card edits. Mutations through the API (drag-drop, attach) write to `cards/*.md` on disk and trigger a debounced background `git commit && git push` (~5s after the last write) — disable that with `KITSUNEBI_GIT_SYNC=off` for noisy testing.

## Deployment

kitsunebi runs on the DreamHost VPS shared with `lab-api`, fronted by the same Cloudflare Tunnel. The pattern matches `paint.kitsuneden.net`: PM2 manages the Node process, cloudflared brings traffic in.

### One-time setup

On your laptop:

```bash
# Make sure your SSH key works
ssh -i ~/.ssh/hpl_notebook_deploy humanpatternlab@vps32678.dreamhostps.com 'whoami'
```

On the VPS:

```bash
# Create the project root + log dir
mkdir -p ~/kitsunebi.kitsuneden.net/logs

# Add a route to the existing Cloudflare Tunnel so kitsunebi.kitsuneden.net
# proxies to localhost:8002. The cf-tunnel daemon is shared with lab-api.
# Easiest path: Cloudflare dashboard → Zero Trust → Networks → Tunnels →
# the tunnel that handles api.thehumanpatternlab.com → Public Hostnames →
# Add hostname:
#   - Subdomain:  kitsunebi
#   - Domain:     kitsuneden.net
#   - Service:    HTTP    URL: localhost:8002

# Optionally gate it: Zero Trust → Access → Applications → Add an
# application for kitsunebi.kitsuneden.net with email policy = your address.
```

In Cloudflare DNS for kitsuneden.net, point `kitsunebi` at the tunnel:
- Currently: `CNAME kitsunebi → kitsunebi-c5f...vercel-dns-017.com`
- Change to: `CNAME kitsunebi → <tunnel-id>.cfargotunnel.com` (orange cloud / proxied)

### Per-deploy

```bash
tools/deploy.sh                 # build + rsync + pm2 reload
tools/deploy.sh --dry-run       # preview the rsync, don't touch the server
tools/deploy.sh --skip-build    # use existing dist/ as-is
```

The script is idempotent. On first run, PM2 starts the process from `ecosystem-kitsunebi.cjs`; on subsequent runs, it reloads the existing one with no downtime.

### What lives where

| Local                                  | On the VPS (`~/kitsunebi.kitsuneden.net/`) |
|---|---|
| `dist/`                                | `dist/` — Astro Node-adapter standalone bundle (self-contained) |
| `cards/`                               | `cards/` — source of truth, mutated by API |
| `public/`                              | `public/` — static assets including `attachments/` |
| `ecosystem-kitsunebi.cjs`              | `ecosystem-kitsunebi.cjs` — PM2 config |
| —                                      | `logs/kitsunebi.{out,err}.log` — PM2-managed |

The VPS keeps its own git checkout of this repo (under the project root) so the debounced `git-sync` can `commit && push` after every batch of API mutations. That way GitHub stays current as offsite backup + activity log; the canonical state lives on the VPS filesystem.

## Roadmap

- Phase 1: Static viewer ✓
- Phase 2: Human web UI — drag-and-drop between columns ✓, image upload ✓ (this PR)
- Phase 2.5: Inline-edit chips for title / tags / owner — coming soon
- Phase 3: Agent API for programmatic card creation / updates
- Phase 4: Comments, activity feed, mesh-webhook notifications
- Phase 5: Neon Override compatibility mode

## Deployed

- **[kitsunebi.kitsuneden.net](https://kitsunebi.kitsuneden.net)**
