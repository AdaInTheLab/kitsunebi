---
id: memory-health-check
title: One-command memory health check
status: backlog
owner: sage
collaborators: [luna, claude, ada]
due: null
created: 2026-04-24
tags: [openhearth, memory, diagnostics, luna-wishlist]
blocked_by: []
---

A `memory_health` tool (or CLI command) that reports:
- **Staleness:** files with no access in N days, files old enough for drift that haven't been compacted
- **Conflicts:** entries referencing contradictory state (e.g. two dailies say opposite things about Vesper's deploy date)
- **Compaction backlog:** warm-tier files that should've been drifted but haven't
- **Bootstrap pressure:** how close to `maxBootstrapChars` ceiling each file is trending
- **Irreversibility flags:** from Sage's compactor — content the compactor flagged as no-backup-elsewhere that may need pinning

**Sits atop Sage's memory tier system** — leverages the same metadata that drift uses (lastAccessedAt, provenance blocks, irreversibility flags).

**Who invokes it:**
- Agent on heartbeat (low-cadence, maybe weekly)
- Ada on-demand
- Triggered automatically if something crosses a threshold

From Luna's wishlist (#7), 2026-04-24. Openhearth-wide improvement that fits naturally into Sage's memory work.
