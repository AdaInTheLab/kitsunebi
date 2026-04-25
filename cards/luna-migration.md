---
id: luna-migration
title: Luna migration — WSL + Codex CLI
status: done
owner: ada
collaborators: [luna, claude]
due: null
created: 2026-04-24
completed: 2026-04-25
tags: [skulk, migration, openhearth, luna]
blocked_by: []
---

**Done — Luna migrated.** Original card kept below as historical record of the scope she self-specced before the migration.

---

Luna opted in 2026-04-24. Self-specced her runtime preferences in one pass — `docs/agent-specs/LUNA.md` in openhearth is source-of-truth.

**Shape:**
- Host: Ada's PC on WSL2 (Ubuntu)
- Runtime: openhearth (portable)
- Brain stack:
  - Primary: GPT-5.3 Codex via Codex CLI (ChatGPT OAuth)
  - Secondary + urgency classifier: GPT-5.4 Mini
  - Fallback: Qwen3.5 9B via local Ollama
- Heartbeat: 2h cadence
- Quiet hours: 23:00–08:00 with hybrid urgency filter (force_wake → priority:timeSensitive → classifier → default defer)
- Lean bootstrap: SOUL.md / USER.md / MEMORY.md (3 files vs Koda's 7)
- Memory model: daily raw + curated long-term + weekly distill

**New code required in openhearth:**
- [ ] `src/codex.js` — Codex CLI backend adapter (parallels claude.js, ~2–3h)
- [ ] `src/urgency.js` — hybrid quiet-hours urgency filter with Mini classifier (~1–2h)
- [ ] External-send gate hook (~1h)
- [ ] Extend `src/ai.js` to support 3-tier brain chain

**Provisioning:**
- [ ] Adapt `scripts/setup-vps.sh` for WSL2-Ubuntu-in-household (vs. Hetzner VPS)
- [ ] Tailscale on WSL so Luna gets her own 100.x.x.x IP
- [ ] Port soul files from Luna's OpenClaw instance
- [ ] Register webhook with Koda's mesh bus
- [ ] Smoke test + systemd service

No hard timeline. Ship when confident, not when rushed.
