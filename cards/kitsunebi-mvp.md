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

**Phase 1 (this sprint):**
- [x] Project scaffold (Astro 5, gray-matter for frontmatter)
- [x] Card schema in frontmatter
- [x] Seed cards from today's real Skulk work
- [ ] Static renderer — columns by status
- [ ] Foxfire palette (cyan → warm orange, deep shadows)
- [ ] Push to github.com/AdaInTheLab/kitsunebi
- [ ] Deploy to kitsunebi.kitsuneden.net via Vercel
- [ ] Point Cloudflare DNS

**Phase 2 (later):** Human web UI for drag-and-drop + card edits.

**Phase 3 (later):** Agent API — `board_create`, `board_update`, `board_move`, `board_list`, `board_comment` tools wired into the runtime so Koda/Sage/Vesper can manage their own cards.

**Phase 4:** Comments, activity feed, notifications (mesh webhook on card state changes).

**Phase 5:** Neon Override compatibility mode.
