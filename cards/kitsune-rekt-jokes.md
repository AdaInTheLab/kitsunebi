---
id: kitsune-rekt-jokes
title: RektJokes — dad joke dialogue swap for Trader Rekt
status: backlog
owner: ada
collaborators: []
due: null
created: 2026-05-01
tags: [7dtd, qol, joke-mod, llm-content]
blocked_by: []
---

Standalone joke mod (working name: **RektJokes** / DadModeRekt / KitsuneRektReformed). Replace Trader Rekt's hostile dialogue text with dad jokes. Leave his angry voice audio alone — the mismatch IS the joke. Rekt growls aggressively while the subtitle reads "I'm afraid for the calendar. Its days are numbered."

**Implementation (cheap):**
- XPath set on `Data/Config/Localization.txt` for Rekt's dialog keys (greeting / goodbye / no-stock / trade-complete / threat / etc.)
- No Harmony, no XML schema changes, no audio modding
- Voice audio bundles untouched (and shouldn't be — comedic mismatch requires it)
- Half-day mod once content is generated

**Content pipeline (Qwen):**
Dad jokes have tight pun-template structure that LLMs nail with five-shot prompting. Pipeline:

1. **Identify Rekt's localization keys** — grep Localization.txt + dialogs.xml for `traderRekt*` / `rekt_*` keys, bucket by dialog context
2. **Five-shot Qwen prompt per context bucket**:
   - Greeting jokes: short, punchy, set the scene
   - Trade-complete jokes: payoff/closer feel
   - No-stock: deflection humor
   - Goodbye jokes: send-off zingers
3. **Batch-generate ~50 per bucket** → human review pass → pick top 10–15
4. **XPath set those into the modlet's Localization.txt override**

**Stretch ideas:**
- Per-tier escalation: lower trader stage = corny dad jokes; higher tier = increasingly elaborate puns
- Optional config toggle: keep Rekt's hostility but layer dad-joke quest descriptions on top
- Other traders too? Hugh's already neutral — could go full "dad mode."

- [ ] Audit Localization.txt + dialogs.xml for Rekt-specific keys; bucket by context
- [ ] Build five-shot Qwen prompts per bucket
- [ ] Generate corpus, human-review filter, pick finalists
- [ ] Write XPath modlet overriding the keys
- [ ] Test in-game: voice plays, subtitle shows joke
- [ ] Pick final mod name + create repo
