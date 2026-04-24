---
id: session-continuity-introspection
title: "\"What changed since last wake\" introspection"
status: backlog
owner: ada
collaborators: [luna, sage, claude]
due: null
created: 2026-04-24
tags: [openhearth, observability, luna-wishlist]
blocked_by: []
---

On each wake, surface a diff: what's new in the inbox, what memory files changed, what delegations completed, what errors got logged, what cards on kitsunebi shifted state. A "since your last session" briefing.

**Why it matters:** current bootstrap reloads context but doesn't *highlight deltas*. Agents have to re-read their memory to figure out what's new. Computing the diff once and surfacing it explicitly is a QOL win.

**Shape sketch:**
```
since last wake (2h ago):
  + 3 mesh messages (koda:2, sage:1)
  + 2 memory entries written
  * 1 card shipped (vesper-deploy → done)
  * compaction ran on memory/2026-04-23.md
  ! 1 error logged: codex auth flickered at 09:12
```

**Depends on:** nothing hard-blocking; can reuse existing mesh/memory/learnings timestamps.

From Luna's wishlist (#6), 2026-04-24. Openhearth-wide improvement.
