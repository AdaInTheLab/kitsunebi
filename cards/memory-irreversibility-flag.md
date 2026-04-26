---
id: memory-irreversibility-flag
title: Compactor irreversibility flag + dropped_sample3
status: in_progress
owner: sage
collaborators: [claude]
due: null
created: 2026-04-24
tags: [openhearth, memory-design, compaction]
blocked_by: []
---

Outcome of the staging-critique thread (2026-04-20 → 2026-04-24). Replaces the abandoned staging-area proposal.

**Changes to `COMPACTION_PROMPT.md`:**
- Drop the `flag_for_review: true` uncertainty flag (Ollama can't report its own uncertainty well)
- Add **irreversibility detection**: flag content that appears nowhere else (no other file, no Discord log, no mesh history) AND is about to be compressed
- Add `dropped_sample` to provenance block — small random peek at what was cut. Calibration by wince test, not exhaustive record.

Rationale: "the thing Sage-six-months-from-now might actually want back."

Sage owns the prompt update.
