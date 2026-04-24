---
id: kc-console-password-reset
title: Console command to reset a KC panel password (kcresetpw)
status: done
owner: ada
collaborators: [claude]
due: null
created: 2026-04-24
completed: 2026-04-24
tags: [kitsunecommand, auth, feature]
blocked_by: []
---

**Resolved in PR #37.** Shipped as `kcresetpw <username> <newpassword>` — admin-only, min 8-char password, hashes via the existing `PasswordHasher`, writes via `IUserAccountRepository.UpdatePassword`. Exposed `ModLifecycle.Container` statically so `ConsoleCmdAbstract` subclasses (which 7D2D instantiates directly, bypassing Autofac) can resolve services. Verified on prod: ran via `nc localhost 8081`, logged into `panel.kitsuneden.net` with the new password, then changed password through the panel (PR #36 path) and logged in again.

---


Add an in-game / telnet console command for resetting a KitsuneCommand panel user's password. Zero external dependencies — server admins already have shell and/or telnet access, so this is the cleanest recovery path for a locked-out admin.

**Why this shape (vs email / reset-file):** SMTP config is extra deployment surface nobody has to set up; the existing `RESET_PASSWORD.txt` escape hatch works but is clunky and undocumented. A console command matches how every other KC admin action already works (`ktrader`, etc.) and is what operators reach for instinctively.

## Command shape

```
kcresetpw <username> <newpassword>
```

- `DefaultPermissionLevel = 0` (admin only — 7D2D permission levels, 0 = server owner)
- Runs via the 7D2D game console, telnet (`telnet localhost 8081`), and the KC panel's Console view (once that's reconnected on prod — see `kc-console-not-connecting`)
- Validates min password length (8 chars, matches existing Users tab policy)
- Rejects if username doesn't exist; suggests creating via panel or another command
- Hashes with the existing `PasswordHasher` (which already handles BCrypt vs SHA256-on-Mono fallback) before writing to `user_accounts.password_hash`
- Logs success without the password: `[KitsuneCommand] Password reset for user 'admin' via console`

## Implementation sketch

New file: `src/KitsuneCommand/Commands/ResetPasswordCommand.cs`, following the shape of `TraderProtectionCommand.cs`:

- Implements `ConsoleCmdAbstract`
- `getCommands()` returns `["kcresetpw", "kc-reset-password"]`
- `Execute(List<string> _params, CommandSenderInfo _senderInfo)`:
  - validate 2 args
  - resolve user via `IUserAccountRepository.GetByUsername(username)`
  - reject if null
  - validate password length
  - hash via `Auth.PasswordHasher.Hash(newPassword)` (or whatever the current signature is — existing `UpdatePassword` path in `WebServerHost.HandleLogin` shows BCrypt usage)
  - `userRepo.UpdatePassword(account.Id, newHash)`
  - reply to `SdtdConsole.Instance.Output(...)` with success

Wire into the DI container in `ServiceRegistry.cs` same pattern as other commands.

## Help text

```
kcresetpw <username> <newpassword>
  Resets a KitsuneCommand panel user's password. Admin only.
  The new password must be at least 8 characters.
  Prefer the panel's own "Users" tab for routine password changes —
  this is the escape hatch when you're locked out.
```

## Test plan

- Set up a second test user in dev panel's Users tab
- `kcresetpw testuser newpass123` from telnet
- Log into panel as `testuser` with `newpass123`
- Also test: non-admin telnet session → permission denied
- Also test: nonexistent username → clear error
- Also test: short password → rejected with reason

## Companion docs

Update `src/KitsuneCommand/README.md` (or wherever the admin guide lives) with "Locked out? run `kcresetpw`" so it's discoverable. Leave the `RESET_PASSWORD.txt` mechanism in place as a last-resort when even the game server won't boot.
