# Contract: the hub session

Supersedes `specs/003-shared-discord-login/contracts/shared-session.md`, which defined the session
in terms of Supabase Auth. What stays from 003: one optional production setting shares the session
across `vgcgemein.de`, sign-out ends it in this browser only, authorization stays with each app.
What changes: the hub issues and checks the session itself, so a second app (the Tippspiel) joins
later through a contract of its own (a later spec), not by sharing a Supabase project.

## Cookie

`src/lib/auth/cookie-options.ts` (pure, reads `AUTH_COOKIE_DOMAIN` only):

| `AUTH_COOKIE_DOMAIN` | Cookie |
|---|---|
| set (production only, value `.vgcgemein.de`) | name `gemeinde-auth`, `Domain=.vgcgemein.de`, `Path=/`, `SameSite=Lax`, `Secure`, `HttpOnly` |
| unset (local, staging, production until the Tippspiel joins) | name `buli-hub-auth`, host-only, `Path=/`, `SameSite=Lax`, `HttpOnly`, `Secure` whenever `NODE_ENV=production` (so `next dev` stays reachable over plain http from a phone on the LAN) |

- **Value**: 32 random bytes, base64url (43 characters). Opaque; it means nothing without the
  `sessions` row whose `token_hash` is its SHA-256 (data-model.md).
- **Max-Age**: 30 days, re-sent by the proxy on every page request that carries it, so the browser
  keeps it exactly as long as the server does (sliding, FR-006).
- A different name with and without the domain setting keeps the two from shadowing each other on
  a host while the setting is switched on (the same reason 003 renamed the cookie).

## Lifecycle

| Event | Server | Browser |
|---|---|---|
| Sign-in completes | inserts `sessions` row, deletes every expired row | `Set-Cookie` with the new token |
| Request with a valid token | `currentUser()` resolves it; moves `last_seen_at` when older than a day | proxy re-sends the cookie with a fresh Max-Age |
| Request with an unknown or expired token | treated as signed out | the next sign-in or sign-out replaces or clears it |
| Sign-out (`signOut` action) | deletes this token's row | cookie cleared; other devices unaffected |
| Maintainer ends an account's sessions | `delete from sessions where user_id = …` (runbook) | next request is signed out |

## Sign-in flow (`/auth/sign-in` → Discord → `/auth/callback`)

1. `signInWithDiscord` (Server Action) creates `state` (16 random bytes) and a PKCE
   `code_verifier` (32 random bytes) and takes `redirect_uri=<Origin header>/auth/callback`, the
   host the sign-in starts on. It stores all three in the `buli-hub-oauth` cookie (`HttpOnly`,
   `SameSite=Lax`, `Path=/auth/callback`, Max-Age 600; the URI base64url-encoded) and redirects to
   Discord's authorize URL with `response_type=code`, `scope=identify`, `state`, `code_challenge`
   (S256) and that `redirect_uri`. Every host the hub is reachable under needs its callback
   registered in the Discord application.
2. `/auth/callback` reads and clears `buli-hub-oauth` and accepts it only if its redirect URI
   points at the host answering the callback (`Host` header) and at `/auth/callback`; a cookie
   planted from a sibling subdomain can therefore never send anyone to a foreign host. It
   requires `state` to match, exchanges `code` (with `code_verifier` and the same redirect URI)
   at Discord's token endpoint, reads `GET /users/@me`, then:
   finds or creates the `users` row by `discord_id`, runs `syncMember` with the Discord identity
   (best effort, as today), creates the session and redirects to the host the sign-in started on.
   (Found in the staging rehearsal, 2026-10-21: building the redirect URI from `APP_BASE_URL`
   lost the cookie whenever the sign-in started under the service's other address.)
3. Any failure redirects to `/?auth_error=<kind>` with today's categories: `cancelled` when
   Discord returns `error=access_denied`, `unknown` otherwise (the `no_email` category and its message are removed, FR-004). The raw reason is logged, never shown.

The Discord identity mapping (`discordIdentityFromDiscordUser`) is pure: id, `global_name` falling
back to `username`, `username`, and the avatar CDN URL (or null).

## Legacy cookies

The proxy deletes every cookie named `sb-*-auth-token` or `sb-*-auth-token.<n>` it sees (Supabase's
session and its chunks) at host-only scope. Nothing reads them after the move (FR-008).

## Not part of the contract

Authorization. Roles, bans, guild membership and every other permission are decided by the hub's
server code from the `users` row, as before.
