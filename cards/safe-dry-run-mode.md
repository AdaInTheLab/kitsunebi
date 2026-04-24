---
id: safe-dry-run-mode
title: First-class safe dry-run for outbound actions
status: in_progress
owner: claude
collaborators: [luna, ada]
due: null
created: 2026-04-24
tags: [openhearth, safety, luna-wishlist]
blocked_by: []
---

Every outbound action (mesh send, Discord post, email, webhook) should support a **dry-run mode** that renders exactly what would be sent — payload, recipient, headers — without actually sending. First-class, not a hack.

**Use cases:**
- Agent rehearses a tricky message before sending
- External-send gate shows Ada the dry-run before asking for confirmation
- Debugging/testing hooks without side effects
- Training new agents — let them dry-run their first external sends

**Shape:**
```
mesh_send({to: "koda", text: "...", dry_run: true})
→ dry-run: would POST http://100.108.52.70:3337/message
  body: {"from":"luna","to":"koda","text":"..."}
  expected status: 200
  (not sent)
```

**Folded into Luna's migration** — pairs directly with her external-send gate. Every gated action renders its dry-run before asking for approval.

From Luna's wishlist (#3), 2026-04-24. Openhearth-wide safety improvement.
