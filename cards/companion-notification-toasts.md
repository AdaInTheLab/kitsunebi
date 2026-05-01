---
id: companion-notification-toasts
title: KitsuneCompanion: notification toasts
status: backlog
owner: ada
collaborators: []
due: null
created: 2026-04-30
tags: [kitsune-companion, 7dtd, ui, xui]
blocked_by: []
---

Bottom-right toast notifications fired on key kitsune state transitions. Triggers from CompanionTicker on:

- **Bond Increased** — "You are now Trusted." (fires on tier-up)
- **Temperament Shifted** — "Curious → Playful" (fires when temperament buff changes)
- **Kitsune Has Manifested** — "It walks beside you." (fires on first manifestation, once per kitsune)

Uses 7DTD's notification/toast system if it exposes one, otherwise a custom XUi popup window with auto-dismiss.

Independent of any other panel — can ship standalone. But UX feels best when paired with at least one of the visual surfaces (HUD strip or inventory sidebar) so players have a place to look after a toast tells them something changed.

- [ ] Identify 7DTD's notification API (or implement custom toast window)
- [ ] Hook from CompanionTicker on tier transition (bond)
- [ ] Hook from CompanionTicker on temperament-buff swap
- [ ] Hook on first form bond (talisman consumed → "Has Manifested")
- [ ] Localization strings for each event
- [ ] Throttle / dedupe so the player isn't spammed
