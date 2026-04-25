---
id: kc-troubleshooting-docs
title: Add a "Troubleshooting" section to the KC docs
status: in_progress
owner: ada
collaborators: [claude]
due: null
created: 2026-04-24
tags: [kitsunecommand, docs]
blocked_by: []
---

Stand up a proper "Troubleshooting" section in the KC docs (likely
`src/KitsuneCommand/README.md` plus a new `docs/troubleshooting.md`, or
wherever the admin guide lands once the repo has a real `docs/` tree).
We've accumulated enough gnarly prod-only failures over the last week
that the "ah yes I remember that, let me dig through the PR" approach
is costing real minutes every time.

## First entries

Each entry: **symptom → cause → fix** in that order. Operators scan for
the symptom, so the headline has to be what they see.

- **Live badge never turns green on prod; WebSocket "Finished 0 kB".**
  WebSocketSharp's WebSocketServer does strict Host-header validation
  and rejects requests whose Host doesn't match the authority it was
  bound to — with HTTP 400 *before* OnOpen runs, so token-validation
  logging never fires. Cloudflared by default forwards the public
  hostname (`panel.example.com`) which doesn't match the local bind.
  Fix is **one line in the tunnel config**: `httpHostHeader:
  "localhost:8889"` on the WS ingress rule. Two sharp edges:
    1. Must be `host:port` form. Bare `localhost` still gets rejected.
    2. Use `127.0.0.1` (not `localhost`) in the service URL —
       cloudflared resolves to `::1` first, KC binds `0.0.0.0`.

  See `docs/cloudflared-tunnel.example.yml` in the repo for the full
  proven config. (PR #38.)

  Side note: I spent most of an afternoon convinced this was Cloudflare
  WAF blocking specific paths (`/ws`, `/socket`, `/events`). It wasn't.
  Every "WAF block" I diagnosed was WebSocketSharp's host check
  returning 400 with `Server: cloudflare` mistakenly stamped on by CF's
  proxy layer. Don't burn time renaming the WS path — fix the Host
  header.

- **`MapTileRenderer initialization failed: … dl assembly:<unknown>`**
  on Linux. SkiaSharp's `LibraryLoader` does `[DllImport("dl")]` and
  Mono's bundled config has no dllmap for the short name `dl`. Fix:
  ship `SkiaSharp.dll.config` alongside the DLL with
  `<dllmap dll="dl" target="libdl.so.2" os="!windows" />`. Mirrors the
  existing `System.Data.SQLite.dll.config`. (PR #34.)

- **SkiaSharp loads the wrong `libSkiaSharp.so` and throws at runtime.**
  SkiaSharp's `GetLibraryPath` on glibc Linux looks in
  `{assemblyDir}/x64/libSkiaSharp.so`, not `linux-x64/`. Build scripts
  must copy to `x64/`. (PR #34.)

- **`cloudflared` can't reach KC on `[::1]:8889`.** WebSocketSharp binds
  to `0.0.0.0` (IPv4). Cloudflared resolves `localhost` to `::1` first.
  Use `http://127.0.0.1:8889` explicitly in `/etc/cloudflared/config.yml`.

- **"I'm locked out of the panel."** Run
  `kcresetpw <username> <newpassword>` from the game console, telnet
  (`nc localhost 8081`), or once reconnected, KC's own Console view.
  Min 8 chars, admin-only. (PR #37.)

- **"I changed my password in Settings and now can't log in."** Was a
  bug — `AuthService.ChangePassword` called `Update` which doesn't
  persist `password_hash`. Fixed by calling `UpdatePassword` directly.
  (PR #36.) If you're stuck on an older build, use `kcresetpw`.

- **Favicon / login logo missing after deploy.** `wwwroot/` on prod
  gets overwritten on each frontend deploy — confirm the deploy copied
  the full vite-built `wwwroot/` and not just `assets/`.

## Shape

Keep it boring:

```
## <Symptom user sees>

**Cause:** <one or two sentences>

**Fix:** <commands or PR reference>
```

No prose essays — this is a lookup index, not a narrative. Link to
PRs for the history; body stays short.

## Where it lives

Options (pick during implementation):
1. New `docs/troubleshooting.md` at repo root, linked from
   `src/KitsuneCommand/README.md`.
2. A `## Troubleshooting` section inside the existing README.

Lean toward (1) once the list grows past ~8 entries — it's already
close — but inline is fine for the first version as long as it's
discoverable from the README top-of-page.

## Done when

- File exists, linked from README's top-of-page.
- The entries above are captured with PR links.
- Next time a gnarly prod bug lands, adding a new entry is the obvious
  last step of the fix PR (include "updated troubleshooting.md" in the
  PR description template, maybe).
