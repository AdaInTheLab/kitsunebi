---
id: kc-vote-rewards
title: Vote-for-rewards integration (server listing sites)
status: backlog
owner: ada
collaborators: [claude]
created: 2026-04-26
tags: [kitsunecommand, feature, economy]
blocked_by: []
---

Self-hosted 7D2D admins routinely list their server on sites like
[7daystodie-servers.com](https://7daystodie-servers.com), gtop100,
top-7daystodieservers.com etc. — a player who votes for the server bumps
its visibility ranking, and in exchange the server hands them an in-game
reward. KC has all the pieces to deliver the reward (Points, CD Keys,
VIP Gifts, Task Scheduler, Chat Commands, Settings UI, audit log) but
no glue to actually pull the votes in. This card is that glue.

## API shape (7daystodie-servers.com, the v1 target)

Pull-based, dead simple. All over plain HTTPS, identified by an API key:

| Action | Verb + URL | Returns |
|---|---|---|
| Check if a player voted | `GET ?object=votes&element=claim&key=…&steamid=…` | `0` no vote / `1` voted unclaimed / `2` voted claimed |
| Mark vote as redeemed | `POST ?action=post&object=votes&element=claim&key=…&steamid=…` | `0` unclaimed / `1` claimed |
| List recent voters | `GET ?object=servers&element=voters&key=…&format=json` | array |

Steam ID is the cleanest identifier — it's what 7D2D itself uses to
identify connected clients, so no fuzzy display-name matching. Discord
ID and free-text username are also accepted but skip those for v1.

## Architecture

Build it pluggable from day one. There are at least four listing sites
with near-identical APIs and admins want all of them. The shape costs
nothing on v1 and saves a real refactor later.

```
IVoteSiteProvider
  ├─ SevenDtdServersProvider   ← v1 ships this
  ├─ TopSevenDtdServersProvider  ← v1.5
  ├─ Gtop100Provider             ← v1.5
  └─ ServerListEuProvider        ← whenever
```

Each provider knows how to: check a vote, mark it claimed, list recent
voters. Settings UI lists configured providers, each with its own enable
toggle + API key + reward config.

## Surface area

| File | What |
|---|---|
| `src/KitsuneCommand/Features/VoteRewards/IVoteSiteProvider.cs` | Interface (3 methods + a display name) |
| `src/KitsuneCommand/Features/VoteRewards/Providers/SevenDtdServersProvider.cs` | The v1 adapter, ~80 lines |
| `src/KitsuneCommand/Features/VoteRewards/VoteRewardsFeature.cs` | The feature module, registered in DI |
| `src/KitsuneCommand/Features/VoteRewards/VoteSweepTask.cs` | Scheduled poll: every N min, fetch voters list, grant rewards for unclaimed votes, POST claim, log. Idempotent via `vote_grants` table |
| `src/KitsuneCommand/Commands/VoteCommand.cs` | `/vote` chat command — on-demand check for the calling player. Covers the "I voted from outside the game" case |
| `src/KitsuneCommand/Web/Controllers/VoteRewardsController.cs` | REST API for the panel (config + audit log) |
| `frontend/src/views/SettingsView.vue` (Vote Rewards tab) | UI: per-provider enable, API key, reward type/amount, poll interval, broadcast template |
| `src/KitsuneCommand/Config/Migrations/00X_vote_grants.sql` | `vote_grants(id, provider, steamid, vote_id, granted_at, reward_type, reward_value)` — both audit log and idempotency key |

## Reward types

Player picks one per provider:

- **Points** — N points credited to the player's wallet via the existing Points service
- **Item gift** — same shape as VIP Gifts (a small inventory drop on next login)
- **CD Key bundle** — generates a single-use CD Key for an existing template; player redeems via the panel or chat command

All three flows already exist. The vote-rewards code just *triggers* one
of them; doesn't reimplement.

## Settings UI shape

`Settings → Vote Rewards` tab. For each configured provider:

- Enable / disable toggle
- API key (encrypted at rest, same pattern as the Discord token)
- Server URL (defaults sensibly per provider)
- Poll interval (default 5 min)
- Reward type (Points / Item gift / CD Key) + reward value
- Optional in-game broadcast template, e.g.
  `"{player} voted for the server! Thanks — here's {reward}."`
  (Empty = silent grant.)

Plus a per-provider audit-log view showing recent grants (timestamp,
player, vote id, reward).

## Sharp edges to handle

- **Idempotency.** Two polls in flight at once (or a sweep + a `/vote`
  command racing) shouldn't double-grant. The `vote_grants` table is
  unique on `(provider, vote_id)`. Insert before grant; on conflict,
  skip.
- **Offline players.** Sweeps can't push items into a non-online
  player's inventory directly. Either queue the grant for next login
  (re-use the VIP Gift pending-delivery mechanic) or only grant on the
  `/vote` command. Default to "queue."
- **API key leakage.** Same encrypted-storage pattern as the Discord
  token. Never log it. Never echo it back to the panel after save.
- **Network failures.** Poll task swallows errors and logs at WARN.
  Player can always re-run `/vote`.
- **Time-of-vote vs time-of-claim.** Some sites' "voted unclaimed"
  state lasts a calendar month, others a day — let the poll be lenient
  and let the API tell us when a vote is consumed.

## Done when

- A player votes for the dev server on 7daystodie-servers.com, and
  within ~5 min of polling (or instantly via `/vote`), they get the
  configured reward + an optional chat broadcast
- The `vote_grants` row is recorded
- Voting again the same day is a no-op (provider returns `claimed`)
- Adding a second provider site is a one-class addition, no scaffolding

## Adjacent

- This integrates naturally with the upcoming Discord vote-reminder
  embed (Discord bot already lives in KC — could ping a configured
  channel "It's been 24h, time to vote again!")
- Long-tail: a "leaderboard" panel on the public dashboard showing top
  voters of the month. Cosmetic, not v1.
