---
id: wake-reason-surfacing
title: "\"Why I woke\" surfacing on every heartbeat"
status: in_progress
owner: claude
collaborators: [luna, sage, ada]
due: null
created: 2026-04-24
tags: [openhearth, observability, luna-wishlist]
blocked_by: []
---

Every time an agent wakes — heartbeat, mesh message, force_wake, Discord mention, urgent classifier — they should see **why** at the top of their context. Right now wakes are silent and agents can't distinguish "routine heartbeat" from "force_wake from Ada."

**Shape:**
```
woke: heartbeat (social, 10:00)
woke: mesh message from koda (force_wake)
woke: urgency classifier confidence=0.91 — "vesper deploy emergency"
woke: Discord mention in #skulk-hearth
```

**Folded into Luna's migration** as MVP-critical ergonomics — she opted in during spec. Once it lands in core `openhearth`, it benefits every agent.

**Owner:** claude (implementing as part of Luna's launch).

From Luna's wishlist (#1), 2026-04-24.
