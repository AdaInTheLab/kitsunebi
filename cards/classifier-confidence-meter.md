---
id: classifier-confidence-meter
title: Urgency classifier confidence meter
status: backlog
owner: ada
collaborators: [luna, sage, claude]
due: null
created: 2026-04-24
tags: [openhearth, observability, luna-wishlist]
blocked_by: [wake-reason-surfacing]
order: -1776988800000
---

When the quiet-hours urgency classifier fires (AI-inferred "this looks urgent"), surface its confidence score alongside the wake reason. Lets the agent (and Ada) calibrate the threshold over time — is 0.7 too lenient? Too strict?

**Depends on:** wake-reason-surfacing landing first (this rides on that output channel).

**Shape:** `woke: urgency classifier confidence=0.84 (threshold=0.70) — "koda pinged about build failing"`

From Luna's wishlist (#2), 2026-04-24. Openhearth-wide improvement — benefits any agent with smart quiet-hours.
