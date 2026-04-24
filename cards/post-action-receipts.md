---
id: post-action-receipts
title: Built-in post-action receipts
status: in_progress
owner: claude
collaborators: [luna, ada]
due: null
created: 2026-04-24
tags: [openhearth, observability, luna-wishlist]
blocked_by: []
---

After any agent action (tool call, mesh send, file write, memory compaction, delegation), emit a structured receipt: **what was done, where, status.** Persistent audit trail, readable by the agent on next wake.

**Shape:**
```yaml
- action: mesh_send
  at: 2026-04-24T11:16:26Z
  to: koda
  status: ok
  details: { id: ff4b1866-..., text_len: 128 }

- action: file_write
  at: 2026-04-24T11:17:02Z
  path: memory/2026-04-24.md
  status: ok
  details: { bytes_written: 340, append: true }

- action: exec
  at: 2026-04-24T11:18:45Z
  cmd: "git clone https://github.com/foo/bar"
  status: blocked
  reason: "allowlist: no pattern matches"
```

**Storage:** appended to a rolling `.receipts/YYYY-MM-DD.md` or similar. Surfaceable via `what_did_i_do_today()` tool.

**Folded into Luna's migration** as part of her observability foundations. Openhearth-wide.

From Luna's wishlist (#4), 2026-04-24.
