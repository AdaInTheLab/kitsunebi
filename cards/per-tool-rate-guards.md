---
id: per-tool-rate-guards
title: Per-tool cooldowns and rate guards
status: backlog
owner: ada
collaborators: [luna, claude]
due: null
created: 2026-04-24
tags: [openhearth, safety, tools, luna-wishlist]
blocked_by: []
---

Prevent runaway loops where an agent calls the same tool N times in a short window because of a bug or recursive hook. Config shape:

```json
"tools": {
  "rate_limits": {
    "web_fetch": { "max_per_minute": 10 },
    "exec": { "max_per_minute": 20, "min_interval_ms": 500 },
    "image_generate": { "max_per_hour": 30 },
    "mesh_send": { "max_per_minute": 15, "burst": 5 }
  }
}
```

**Enforcement:** tool dispatcher (`tools.js`) wraps every call with a rate check. If exceeded, returns a structured error the agent can see ("rate limit: web_fetch used 11/10 this minute, cooling until 10:47:00") — not a silent swallow.

**Interacts well with tool-permission-visibility** — both surface the "why can't I do X right now" channel cleanly.

From Luna's wishlist (#9), 2026-04-24. Openhearth-wide safety improvement.
