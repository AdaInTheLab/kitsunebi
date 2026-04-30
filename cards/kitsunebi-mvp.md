---
id: kitsunebi-mvp
title: kitsunebi MVP — this board, rendered
status: done
owner: claude
collaborators: [ada]
due: null
created: 2026-04-24
tags: [kitsunebi, meta, infrastructure]
blocked_by: []
order: -1776902399999
completed: 2026-04-30
---

Build a markdown-backed kanban for the Skulk. Named for kitsunebi (狐火) — fox-fire. Each card a flame, the board a procession of lanterns.

**Phase 1 (shipped 2026-04-24):**
- [x] Project scaffold (Astro 5, content collections)
- [x] Card schema in frontmatter
- [x] Seed cards from today's real Skulk work
- [x] Static renderer — columns by status
- [x] Foxfire palette (cyan → warm orange, deep shadows)
- [x] Push to github.com/AdaInTheLab/kitsunebi
- [x] Deploy to Vercel production
- [x] Image/media support on cards (git-committed into `public/attachments/<card-id>/`)
- [x] Cloudflare DNS for kitsunebi.kitsuneden.net (Ada's task)

**Phase 2 ~ Human web UI (2026-04-25 → 2026-04-26):**
- [x] Migration to DreamHost VPS (PM2 + Cloudflare Tunnel)
- [x] CI auto-deploy on push to main
- [x] Same-origin CSRF guard (replacing Astro's checkOrigin)
- [x] Drag-and-drop between columns
- [x] Intra-column drag-sort with float `order` field
- [x] Image upload from card detail page (filesystem on VPS, not Vercel Blob)
- [x] 50×50 1:1 card thumbnails
- [x] Hover ✕ to remove an attached image (file + body markdown)
- [x] Auto-archive done cards after N days (default 14, env-configurable)
- [x] /archive view with text/owner/tag filters

**Phase 2.5 ~ Inline-edit chips:**
- [x] Title chip on card detail page
- [ ] Tags chip on card detail page
- [ ] Owner chip on card detail page
- [ ] Mirror all three chips to the board card view

**Phase 3 ~ Agent API:**
- [ ] `board_create`, `board_update`, `board_move`, `board_list`, `board_comment`, `board_attach_image` tools wired into the runtime so Koda/Sage/Vesper can manage their own cards and attach generated art

**Phase 4 ~ Activity:**
- [ ] Comments
- [ ] Activity feed
- [ ] Notifications (mesh webhook on card state changes)

**Phase 5:**
- [ ] Neon Override compatibility mode

![oq2Cd.jpg](/attachments/kitsunebi-mvp/oq2Cd.jpg)

![dosAD.jpg](/attachments/kitsunebi-mvp/dosAD.jpg)
