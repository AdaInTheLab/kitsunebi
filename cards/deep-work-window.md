---
id: deep-work-window
title: Deep work window mode
status: backlog
owner: sage
collaborators: [luna, claude, ada]
due: null
created: 2026-04-24
tags: [openhearth, design, heartbeat, luna-wishlist]
blocked_by: []
order: -1776988800001
---

Optional mode where an agent batches work quietly for a set window, then emits **one concise summary** at the end. Anti-streaming for focused tasks — no noisy progress pings, just "here's what got done."

**Design questions:**
- Duration: fixed (e.g. 2hr window) or "until this task is done"?
- Invocation: manual opt-in (`/deep_work 2h`), or can the agent self-declare when it sees a big task?
- Scope: suppresses *all* outbound communication during the window, or only routine updates (urgent still breaks through)?
- What happens to scheduled heartbeats during a deep work window — skip, delay, or execute silently?
- Output shape: single markdown summary to a daily file? Mesh message at the end? Both?

**Touches heartbeat behavior + hook/output plumbing.** Worth a Sage design pass before coding — there's real tension between "low-noise" and "visible to the Skulk."

From Luna's wishlist (#10), 2026-04-24.
