---
id: companion-status-panel
title: KitsuneCompanion: companion status panel (custom XUi window)
status: backlog
owner: ada
collaborators: []
due: null
created: 2026-04-30
tags: [kitsune-companion, 7dtd, ui, xui]
blocked_by: [companion-bond-ladder-rename, companion-tier-progress-helper]
---

Standalone bespoke window opened by hotkey or from the shrine panel's "View Companion Status" link. Three rows: BOND, TEMPERAMENT, FORM. Each has icon + label + content. Footer flavor: "It walks beside you, bound by trust and shared purpose."

Title bar shows kitsune-head emblem + "KITSUNE COMPANION" + settings gear (top-right). Bond row shows tier name AND fractional progress (e.g., "TRUSTED 60%" with 5/8 segments lit).

Introduces the **MANIFESTED** form layer — a base state the kitsune occupies before specialization (Mist/Ember/Grove/Storm). May require a separate refactor to add Manifested as the default form on top of which evolution forms layer.

Mockup: `project_ui_panel_design.md` in KitsuneCompanion memory.

- [ ] Custom XUi window XML
- [ ] `XUiC_KitsuneStatusPanel` controller
- [ ] Three rows: BOND, TEMPERAMENT, FORM with their respective bindings
- [ ] Bond fractional progress bar (depends on TierProgress helper)
- [ ] Decide: add MANIFESTED as a base form, or treat as the absence-of-specialization label
- [ ] Footer flavor strings + localization
- [ ] Settings gear icon → open mod config (placeholder)
