---
id: kc-login-polish
title: Polish KC login page (logo, password bar, language dropdown)
status: done
owner: ada
collaborators: [claude]
due: null
created: 2026-04-24
completed: 2026-04-24
tags: [kitsunecommand, polish, frontend]
blocked_by: []
---

**Resolved in PR #35.** All three items landed in one pass: fox logo (Ada-provided `kitsune-command-logo-transparent.png`) rendered above the gradient title on login, password input made full-width via `:deep(.p-password)` / `.p-password-input` CSS overrides so it matches the username box pixel-for-pixel, language dropdown yanked from the absolute-positioned top-right corner and relocated to the footer next to "MANAGEMENT". Bonus: same logo dropped above the sidebar brand name on every authenticated page.

---


Login page has three visual snags worth cleaning up in one pass.

## 1. No logo

Fox mark belongs here. The new favicon (`kc-favicon` card) gives us an SVG we can reuse at a larger size — 48×48 or so — above the "KitsuneCommand" title. Helps the page feel like a brand landing, not a generic login.

## 2. Password input is narrower than username

The eye-toggle icon sits *outside* the password input, so the input box ends short of where the username box ends. Misaligned. Fix: move the eye toggle *inside* the input as a trailing icon (PrimeVue `IconField` + `InputIcon` pattern or similar), so both fields share identical width.

## 3. Language dropdown placement looks off

Currently floating in the top-right corner of the login card, overlapping the title zone. Options to consider:
- Move below the "Sign In" button as a small text-style switcher
- Move to the page footer (outside the card)
- Keep in the card but smaller and right-aligned under "7D2D Server Management"

Third option is probably least disruptive — looks like a subtitle-level control rather than a competing CTA.

## Files

- `frontend/src/views/LoginView.vue` (likely — confirm by searching for "Sign In" + "English")
- Shared locale switcher component if one exists

## Test plan

- Visual: compare before/after side-by-side at full-width and narrow widths
- Password input width matches username input width pixel-for-pixel
- Language switcher reachable via keyboard + screen reader
- Logo renders sharp at retina DPI
