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

**1. SSH access.** Confirm your laptop key reaches the VPS:

```bash
ssh -i ~/.ssh/hpl_notebook_deploy humanpatternlab@vps32678.dreamhostps.com 'whoami'
```

**2. Project root on the VPS.** Bootstrap the directory and clone this repo (the VPS keeps its own working copy so the running app's `git-sync` layer can `commit && push` after every batch of API mutations):

```bash
ssh humanpatternlab@vps32678.dreamhostps.com '
  mkdir -p ~/kitsunebi.kitsuneden.net/logs &&
  cd ~ && git clone https://github.com/AdaInTheLab/kitsunebi.git kitsunebi.kitsuneden.net.tmp &&
  mv kitsunebi.kitsuneden.net.tmp/.git kitsunebi.kitsuneden.net/ &&
  cp -an kitsunebi.kitsuneden.net.tmp/. kitsunebi.kitsuneden.net/ &&
  rm -rf kitsunebi.kitsuneden.net.tmp
'
```

**3. Cloudflare Tunnel + Public Hostname.** kitsunebi gets its own dashboard-managed tunnel (separate from lab-api's local-config one):

- Cloudflare dashboard → Zero Trust → Networks → Tunnels → **Create a tunnel** (Cloudflared) → name it `kitsunebi-prod` (or anything). It hands you a `cloudflared tunnel run --token <…>` line — save the token; you'll feed it to PM2 in step 4.
- In the same wizard, **Public Hostnames** → Add:
  - Subdomain: `kitsunebi`
  - Domain: `kitsuneden.net`
  - Service: HTTP, URL: `localhost:8002`
- This auto-creates/updates the DNS record (`kitsunebi.kitsuneden.net CNAME <tunnel-id>.cfargotunnel.com`, proxied).

**4. Stash the tunnel token on the VPS** (mode 600, off git):

```bash
ssh humanpatternlab@vps32678.dreamhostps.com '
  mkdir -p ~/.cloudflared &&
  echo -n "<paste-the-token-here>" > ~/.cloudflared/kitsunebi-tunnel-token.txt &&
  chmod 600 ~/.cloudflared/kitsunebi-tunnel-token.txt
'
```

`ecosystem.config.cjs` reads from this path at PM2 start and feeds the token into the `cloudflared` args.

**5. (Optional) Cloudflare Zero Trust gate.** Zero Trust → Access → Applications → add `kitsunebi.kitsuneden.net` with an email policy locked to your address.

### Per-deploy

```bash
tools/deploy.sh                 # build + rsync + pm2 reload
tools/deploy.sh --dry-run       # preview the rsync, don't touch the server
tools/deploy.sh --skip-build    # use existing dist/ as-is
```

The script is idempotent. On first run, PM2 starts the process from `ecosystem.config.cjs` (which boots both `kitsunebi` and `cf-tunnel-kitsunebi`); on subsequent runs, it reloads the existing processes with no downtime.

> **Filename note:** the file *must* be `ecosystem.config.cjs` (not e.g. `ecosystem-kitsunebi.cjs`). PM2 only auto-detects `*.config.{js,cjs}` as ecosystem configs and parses their `apps:` array. Anything else gets run as a plain Node script and silently no-ops.

### What lives where

| Local                       | On the VPS (`~/kitsunebi.kitsuneden.net/`)                    |
|---|---|
| `dist/`                     | `dist/` — Astro Node-adapter standalone bundle                |
| `cards/`                    | `cards/` — source of truth, mutated by the API                |
| `public/`                   | `public/` — static assets including live `attachments/`       |
| `ecosystem.config.cjs`      | `ecosystem.config.cjs` — PM2 config (kitsunebi + tunnel)      |
| —                           | `~/.cloudflared/kitsunebi-tunnel-token.txt` — tunnel token    |
| —                           | `logs/{kitsunebi,cf-tunnel-kitsunebi}.{out,err}.log` — PM2    |

The VPS's own git working copy under the project root is what the debounced `git-sync` layer pushes from — so GitHub stays current as audit log + offsite backup, but canonical state lives on the VPS filesystem.

## Roadmap

- Phase 1: Static viewer ✓
- Phase 2: Human web UI — drag-and-drop between columns ✓, image upload ✓ (this PR)
- Phase 2.5: Inline-edit chips for title / tags / owner — coming soon
- Phase 3: Agent API for programmatic card creation / updates
- Phase 4: Comments, activity feed, mesh-webhook notifications
- Phase 5: Neon Override compatibility mode

## Deployed

- **[kitsunebi.kitsuneden.net](https://kitsunebi.kitsuneden.net)**
