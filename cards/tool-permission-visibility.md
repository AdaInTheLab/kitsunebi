---
id: tool-permission-visibility
title: Tool permission visibility from inside runtime
status: backlog
owner: ada
collaborators: [luna, claude]
due: null
created: 2026-04-24
tags: [openhearth, observability, tools, luna-wishlist]
blocked_by: []
---

When a tool call gets blocked (exec allowlist, disabled capability, auth expired, etc.), the agent should see **why** — not just "tool failed." Prevents hidden constraint spirals where the agent retries the same blocked operation because they can't diagnose why it's not working.

**Shape:**
```
tool: exec("git clone https://gitlab.com/foo/bar")
→ blocked: pattern not in allowlist (only github.com is allowed)
→ to add: set additionalAllowedPatterns in config.json
```

Or an introspection tool Luna can call proactively:
```
tool_permissions() →
  ✓ file_ops: enabled
  ✓ web_fetch: enabled (brave-api key present)
  ✓ mesh: enabled (registered as "luna")
  ✗ image_generate: disabled in config
  ⚠ discord: enabled but token not yet validated
  ✗ exec: enabled, narrow allowlist (git clone github.com, ls, echo)
```

**Prevents:** the bootstrap-budget-style "I don't know why this isn't working" spiral.

From Luna's wishlist (#8), 2026-04-24. Openhearth-wide improvement.
