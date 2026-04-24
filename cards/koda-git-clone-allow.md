---
id: koda-git-clone-allow
title: Add git clone to Koda's exec allowlist
status: done
owner: claude
collaborators: [ada, koda]
due: null
created: 2026-04-24
completed: 2026-04-24
tags: [koda, config, exec]
blocked_by: []
---

Koda needed to clone a private repo; auth was wired but `git clone` wasn't in her exec allowlist.

Added narrow-scope GitHub-only patterns to `exec.additionalAllowedPatterns`:
- `^git clone https://github\.com/`
- `^git clone git@github\.com:`

Rejected the wide-open `^git clone(\s|$)` — malicious post-checkout hook from arbitrary origin is the main risk, GitHub-scoping reduces the surface.

Picks up on Koda's next restart. Flagged the 30s exec timeout as a caveat for large repos.
