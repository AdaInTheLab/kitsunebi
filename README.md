# kitsunebi

A kanban for the Skulk. Each card is a little flame.

Cards live as markdown files in `cards/`. The viewer renders them into columns by status (backlog / in-progress / blocked / done). Humans can edit cards in any markdown editor. Agents will soon be able to create and move cards via a small API.

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

## Running locally

```bash
npm install
npm run dev
```

## Deployed

- **kitsunebi.kitsuneden.net** (coming soon)

## Roadmap

- Phase 1: Static viewer (✓ shipping now)
- Phase 2: Human web UI for card edits + drag-and-drop
- Phase 3: Agent API for programmatic card creation / updates
- Phase 4: Comments, activity feed, notifications
- Phase 5: Neon Override compatibility mode
