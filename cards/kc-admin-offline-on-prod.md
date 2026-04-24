---
id: kc-admin-offline-on-prod
title: Admin user shows offline on prod panel
status: done
owner: ada
collaborators: [claude]
due: null
created: 2026-04-24
completed: 2026-04-24
tags: [kitsunecommand, prod, websocket, cloudflare-tunnel]
blocked_by: []
---

**Resolved in PR #38.** The real fix was **one line in cloudflared's tunnel config: `originRequest.httpHostHeader: "localhost:8889"` on the WS ingress rule**. The whole afternoon-long path-rename rabbit hole (`/ws` → `/socket` → `/kcevents` → `/kctunnel`) turned out to be chasing a phantom — the 400s I kept attributing to "Cloudflare WAF blocks paths with `ws` / `socket` / `events`" were actually WebSocketSharp's strict Host-header validation rejecting the request *before* OnOpen ever fired. Cloudflare just rewrites `Server: cloudflare` on every proxied response, so origin-rejected 400s look identical to edge-rejected 400s.

Concrete diagnostic that finally cracked it: `tcpdump -i lo -A 'tcp port 8889'` showed cloudflared was forwarding `Host: panel.kitsuneden.net` to origin, and direct-replay of those exact headers reproduced 400-from-WebSocketSharp on localhost. Then narrow bisection found the rule: WebSocketSharp accepts `Host: 127.0.0.1:8889` and `Host: localhost:8889` but rejects bare `localhost` or any non-IP authority. Two non-obvious gotchas, both documented in `docs/cloudflared-tunnel.example.yml`:

1. `httpHostHeader` must be `host:port` form, not just `host`.
2. Service URL must use `127.0.0.1` not `localhost` — cloudflared resolves to `::1` first (IPv6) and KC's WS server only binds `0.0.0.0` (IPv4).

Also-fixed in the same PR: `TokenValidator.ValidateToken` now logs token length / prefix / suffix / base64url decode result on `unprotect returned null` — what made the original silent failure cost us so long is that "valid token rejected by WebSocketSharp host check" and "stale token failing crypto" both showed up in the browser as identical "Finished 0 KB" WebSockets.

The `/ws` → `/kctunnel` rename is harmless and we kept it (KC-prefixed, won't ever collide), but it was not necessary for the fix. Lessons going into the troubleshooting doc — see `kc-troubleshooting-docs`.

Along the way also fixed cloudflared resolving `localhost` to `[::1]` while WebSocketSharp binds `0.0.0.0` — tunnel config now uses `http://127.0.0.1:` explicitly.

---

Logged in as `admin` on `panel.kitsuneden.net`, but the Users / presence view shows `admin` as offline. Works correctly on dev — so it's prod-specific, probably related to the Cloudflare Tunnel front-end that dev doesn't have.

**Likely culprits:**

1. **WebSocket failing through CF Tunnel.** Panel WS path is `/ws` → tunnel → `localhost:8889`. If the connection drops or never opens on prod, presence tracking never hears the "user is here" signal. Check browser devtools → Network → WS on prod; if closed/retrying, tunnel config needs `/ws` keepalive or different ingress shape.

2. **UpdateLastLogin vs "online" definition mismatch.** `WebServerHost.HandleLogin` calls `userRepo.UpdateLastLogin(username)` on auth, but presence might be driven by WS heartbeats, not login recency.

3. **Separate presence tracker tied to WS connect/disconnect.** If WS never connects, presence never registers.

**Fast diagnostic:**
- Browser devtools on prod → WS tab: is `/ws` connected, disconnected, or never opened?
- On prod: `grep "WebSocket connected\|WebSocket disconnected" $(ls -t ~/7d2d-server/output_log__*.txt | head -1)` — rapid connect/disconnect pairs = CF Tunnel idle-killing the socket.

**Where to look:**
- `src/KitsuneCommand/Services/` for a `UserPresenceTracker` / session tracker
- `src/KitsuneCommand/Web/WebSocket/` — connection lifecycle
- `frontend/src/composables/useAppWebSocket.ts` — client-side WS init
- `/etc/cloudflared/config.yml` on prod — verify `/ws` ingress rule

**Test plan:** login as admin on prod → WS connected in devtools → Users view shows admin online; repeat after deliberate CF Tunnel restart, verify reconnection.
