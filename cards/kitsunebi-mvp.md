---
id: kitsunebi-mvp
title: kitsunebi MVP — this board, rendered
status: in_progress
owner: claude
collaborators: [ada]
due: null
created: 2026-04-24
tags: [kitsunebi, meta, infrastructure]
blocked_by: []
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

**Phase 2 (later):** Human web UI for drag-and-drop + card edits + **image upload → Vercel Blob** (replaces the git-commit-image workflow).

**Phase 3 (later):** Agent API — `board_create`, `board_update`, `board_move`, `board_list`, `board_comment`, `board_attach_image` tools wired into the runtime so Koda/Sage/Vesper can manage their own cards and attach generated art.

**Phase 4:** Comments, activity feed, notifications (mesh webhook on card state changes).

**Phase 5:** Neon Override compatibility mode.
