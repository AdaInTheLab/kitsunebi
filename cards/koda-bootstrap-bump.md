---
id: koda-bootstrap-bump
title: Bump Koda's maxBootstrapChars 20000 → 28000
status: done
owner: claude
collaborators: [ada, koda]
due: null
created: 2026-04-23
completed: 2026-04-24
tags: [koda, config, memory]
blocked_by: []
---

Koda flagged (Apr 23) that AGENTS.md was truncating to 329/9387 chars every session and the daily memory file was being skipped entirely. 6+ sessions compounding.

Fix landed in `koda-runtime/config.json:73`. Picks up on Koda's next restart. Ada framed it as "good data either way" — if 28K holds, great; if not, we learn the file set has grown past that too.

Also updated `config.example.json` so new runtimes get 28000 as the default from the start. Commit `6929542` pushed.
