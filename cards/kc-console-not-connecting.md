---
id: kc-console-not-connecting
title: Console view doesn't connect on prod
status: backlog
owner: ada
collaborators: [claude]
due: null
created: 2026-04-24
tags: [kitsunecommand, prod, websocket, telnet, cloudflare-tunnel]
blocked_by: []
---

Panel's Console view is backed by a WebSocket that relays between browser and 7D2D's telnet interface. Works on dev. On prod (`panel.kitsuneden.net`), the Console view is empty — no log output, commands don't do anything.

**Likely causes, in order of suspicion:**

1. **Frontend WS URL hardcodes a port that isn't tunneled.** Same pattern as the `useWebSocket.ts` bug fixed in PR #23. Check `frontend/src/views/ConsoleView.vue` and any composable it uses — if the WS URL looks like `ws://host:8089/...` on prod, that's it. Fix with same-origin + path routing.

2. **CF Tunnel missing an ingress rule for the console WS path.** `sudo cat /etc/cloudflared/config.yml` on prod — if the console uses a different path than `/ws`, add a matching rule mapping to the right backend port.

3. **Telnet unreachable or misconfigured.** `ssh ada@87.99.153.20 'grep -i telnet /home/ada/7d2d-server/serverconfig.xml'` — `TelnetEnabled=true`, blank `TelnetPassword` makes it bind to localhost only (fine for KC which connects as local client, but worth checking). Confirm KC actually connects at startup: `grep -iE "telnet|console" $(ls -t ~/7d2d-server/output_log__*.txt | head -1)`.

**Fast diagnostic:**
- Browser devtools → Network → WS on prod console view — what URL is it trying? Any errors (404, 502, mixed-content)?
- Server: `ss -tlnp | grep -E ":(8081|8888|8889|8890)"` — telnet (8081) listening?

**Files likely involved:**
- `src/KitsuneCommand/Services/` — `ConsoleService` / `TelnetService` / similar
- `src/KitsuneCommand/Web/WebSocket/` — console WS handler
- `frontend/src/views/ConsoleView.vue` + its composable

**Test plan:** open Console on prod → issue `listplayers` → see expected output. Also confirm streaming live `[KitsuneCommand]` log lines as server does things.
