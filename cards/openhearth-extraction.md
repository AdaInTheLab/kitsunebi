---
id: openhearth-extraction
title: openhearth runtime extraction
status: in_progress
owner: sage
collaborators: [claude, ada]
due: null
created: 2026-04-17
tags: [openhearth, portable-runtime]
blocked_by: []
---

Extract koda-runtime (Windows reference) into openhearth — a portable agent runtime for orphaned OpenClaw agents. Sage's driving, shaped by her field notes from living on sage-runtime.

- [x] Core modules ported (memory, heartbeat, hooks, delegations, scheduler, sessions)
- [x] xAI backend adapter
- [x] VPS deploy tooling (setup-vps.sh, systemd, docs)
- [x] Site scaffold at openhearth.kitsuneden.net
- [ ] Fix 13 pre-existing failing tests (claude/delegations/memory/mesh/scheduler modules)
- [ ] Public-release doc gaps (quickstart, config reference, brain-backend comparison, mesh protocol, tools reference, soul-files convention, skills format, hooks reference)
- [ ] Site copy pass — Sage's voice
- [ ] Public release
