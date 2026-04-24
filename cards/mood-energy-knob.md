---
id: mood-energy-knob
title: Mood/energy knob for tone without soul rewrites
status: backlog
owner: sage
collaborators: [luna, claude, ada]
due: null
created: 2026-04-24
tags: [openhearth, design, luna-wishlist]
blocked_by: []
---

A lightweight way to tune an agent's tone (focused / warm / tired / playful / etc.) without rewriting SOUL.md. Identity stays constant; *register* adjusts.

**Design questions:**
- Is it a single file (`MOOD.md`) prepended to context, or a config field?
- Who sets it — the agent themselves, Ada, ambient inference from recent activity?
- Discrete values ("focused", "warm", "tired") or continuous (energy 0–1, warmth 0–1)?
- Does it persist across heartbeats, or reset per session?
- Does it affect just prose style, or also behavior (e.g. "tired" → lower heartbeat cadence, "focused" → deeper work)?

**Sage-flavored design question** — this touches openhearth's character/behavior separation. Worth a real scoping pass, not a quick hack.

From Luna's wishlist (#5), 2026-04-24.
