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

**6. VPS git-sync wiring.** The running kitsunebi process commits + pushes API mutations through its own git checkout. That needs three things in place:

- **Identity.** `git commit` won't run without an author identity. Set it once in the working copy:

  ```bash
  ssh humanpatternlab@vps32678.dreamhostps.com '
    cd ~/kitsunebi.kitsuneden.net &&
    git config user.email "kitsunebi-vps@kitsuneden.net" &&
    git config user.name "kitsunebi (vps)"
  '
  ```

- **Push credentials.** Generate a deploy key on the VPS, register it as a write-enabled deploy key on the GitHub repo, switch the remote to SSH:

  ```bash
  # On VPS
  ssh-keygen -t ed25519 -f ~/.ssh/kitsunebi_github -N "" -C "vps git-sync"
  cat ~/.ssh/kitsunebi_github.pub   # → add at github.com/.../settings/keys (✓ Allow write)

  # SSH config so git uses this key for the kitsunebi remote
  cat >> ~/.ssh/config <<'EOF'
  Host github.com-kitsunebi
    HostName github.com
    User git
    IdentityFile ~/.ssh/kitsunebi_github
    IdentitiesOnly yes
  EOF
  chmod 600 ~/.ssh/config

  cd ~/kitsunebi.kitsuneden.net
  git remote set-url origin git@github.com-kitsunebi:AdaInTheLab/kitsunebi.git
  ssh -T git@github.com-kitsunebi   # should say "Hi AdaInTheLab/kitsunebi!"
  ```

- **Track origin.** The git-sync layer rebases onto `origin/main` before each push. Make sure the working copy starts on `main` and tracks origin:

  ```bash
  cd ~/kitsunebi.kitsuneden.net && git fetch origin && git checkout main && git reset --hard origin/main
  ```

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

## Mesh notifications

When `KITSUNEBI_MESH_URL` is set, every card write fires a notification to the Skulk's mesh bus addressed to each interested party — the card's **owner + collaborators**, minus the actor (no self-pings).

Events:

| Action               | Notification text                                       |
|----------------------|---------------------------------------------------------|
| `POST /api/cards`    | `created "<title>" — <link>`                            |
| `PATCH …/:id`        | `patched "<title>" (<fields>) — <link>`                 |
| `POST …/:id/move`    | `moved "<title>" to <status> — <link>` *(only on column change; pure reorders are quiet)* |
| `POST …/:id/attachments`  | `attached <file> to "<title>" — <link>`            |
| `DELETE …/:id/attachments` | `removed <file> from "<title>" — <link>`         |
| `POST …/:id/comments` | `commented on "<title>": <preview> — <link>`           |

Each notification is a `{ from, to, text }` POST to `${KITSUNEBI_MESH_URL}/message`. `from` is the agent name (or `kitsunebi` for browser writes); `to` is the recipient agent. Mesh-side fan-out (push webhooks, inbox storage, etc) is whatever your mesh server already does.

Failure mode: best-effort. Network errors / 4xx / 5xx are logged and swallowed; the kitsunebi write still succeeds. The feature is off by default — when `KITSUNEBI_MESH_URL` is unset, this layer is a no-op so the API works fine on boxes without mesh connectivity.

> **VPS connectivity caveat.** kitsunebi runs on the DH VPS. The Skulk mesh runs on Koda's Hearth at a Tailscale IP. For notifications to land in prod, either put the VPS on Tailscale or expose the mesh via Cloudflare Tunnel. Local dev kitsunebi (running on Ada's PC) reaches the mesh at `localhost:3337` directly.

## Comments

Each card can carry a thread of comments — humans drop notes from the detail page; agents post via `POST /api/cards/:id/comments` (or the `board_comment` openhearth tool, once that ships).

### Storage

Comments live as **JSONL** at `comments/<card-id>.jsonl` — one comment per line, append-only:

```jsonl
{"id":"a3f2c1","author":"luna","text":"on it","createdAt":"2026-04-27T12:34:56Z"}
{"id":"b4d3e7","author":"ada","text":"thanks","createdAt":"2026-04-27T12:36:01Z"}
```

This sits parallel to `cards/` and `public/attachments/`: same on-disk-source-of-truth pattern, same git-sync auto-commit + push, same rsync deploy treatment.

### Endpoints

```
GET  /api/cards/:id/comments       # list (oldest first)
POST /api/cards/:id/comments       # body: { text, author? }
```

Same auth rules as the rest of the API (browser via same-origin or agent via `Authorization: Bearer`). Author resolution: agent name (if agent-authed) > body.author > `"anon"`.

## Agent API

Skulk agents (Koda, Sage, Luna, eventually Vesper) can drive the board over HTTP. Each agent gets its own bearer token; calls are attributed in commit messages so the git log shows who did what.

### Endpoints

```
GET    /api/cards                    # list (?status, ?owner, ?tag, ?include=body)
POST   /api/cards                    # create
GET    /api/cards/:id                # read (frontmatter + body)
PATCH  /api/cards/:id                # partial frontmatter update
POST   /api/cards/:id/move           # status + intra-column order
POST   /api/cards/:id/attachments    # multipart image upload
DELETE /api/cards/:id/attachments?file=<basename>
```

Browser callers continue to use the same-origin path. Agents send:

```
Authorization: Bearer <agent-secret>
```

A matching token attributes the request to that agent and bypasses the same-origin guard. No match + no browser session → 401.

### Provisioning agent tokens

On the VPS, drop a file at `~/.kitsunebi-agent-tokens` (mode 600) containing comma-separated `name:secret` pairs:

```bash
ssh humanpatternlab@vps32678.dreamhostps.com '
  ( echo -n "koda:$(openssl rand -hex 32)"
    echo -n ",sage:$(openssl rand -hex 32)"
    echo -n ",luna:$(openssl rand -hex 32)"
  ) > ~/.kitsunebi-agent-tokens &&
  chmod 600 ~/.kitsunebi-agent-tokens &&
  cat ~/.kitsunebi-agent-tokens
'
```

The output (each agent's secret) goes into the corresponding agent runtime's env. Reload PM2 so the new tokens are picked up:

```bash
pm2 reload kitsunebi
```

To rotate a single agent: edit the file, replace just that secret, reload.

## Roadmap

- Phase 1: Static viewer ✓
- Phase 2: Human web UI — drag-and-drop between columns ✓, image upload ✓ (this PR)
- Phase 2.5: Inline-edit chips for title / tags / owner — coming soon
- Phase 3: Agent API for programmatic card creation / updates
- Phase 4: Comments, activity feed, mesh-webhook notifications
- Phase 5: Neon Override compatibility mode

## Deployed

- **[kitsunebi.kitsuneden.net](https://kitsunebi.kitsuneden.net)**
