# Discord-Server-Identität

**Status: done** (2026-07-02) — verified: profile shows the guild display name + @username; the real guild sync writes the live nickname (confirmed against the VGC Gemeinde server).

Persist each user's identity *as it appears on the VGC Gemeinde Discord
server* — server nickname and server avatar — and show it on the profile
page.

## Why

Two gaps in the login token (JWT). First, it carries a user's *global*
Discord identity, but we want their *server* identity: a person can be
„AlexK" globally yet „Alex | Team Rocket" on the server. Second, the JWT only
describes the signed-in user — so any view that shows a *different* user's
name or avatar has no source for it. Both the server nickname/avatar and the
persistence needed for other users come from the guild-member object already
fetched every 5 minutes for role sync, so capturing them rides on that sync
and stays as fresh as the role.

## Identity resolution (pure)

From the guild member, following Discord's own precedence:

- `displayName` = member `nick` → user `global_name` → user `username`
- `username` = user `username` (the real `@handle`)
- `avatarUrl` = guild avatar → global avatar → `null` (→ initials fallback);
  animated hashes (`a_…`) use `.gif`, else `.png`

When the user is **not** a guild member (member fetch 404s), fall back to the
session/JWT identity — available because sync always runs for the current
user. Non-members thus still get their global identity stored.

## Scope

- In:
  - `profiles` gains `display_name`, `username`, `avatar_url` (all nullable
    text, server-managed). No grant migration needed: the existing
    column-grant setup only grants the settings columns to `authenticated`,
    so these are write-protected by omission.
  - `fetchGuildMember` returns `nick` + `user` (id, username, global_name,
    avatar) + guild `avatar`; a pure `guildIdentity(member, fallback)`
    resolves the three fields.
  - The role sync becomes an identity+role sync (`syncMember`): one upsert
    writes role, display_name, username, avatar_url, role_synced_at, on the
    same 5-minute TTL.
  - Profile page: guild display name as the main heading, `@username` small
    beneath it, avatar from `avatar_url` (initials fallback), role badge.
    Reads the stored identity, not the JWT.
  - `SiteHeader` / user menu show the stored guild display name + avatar.
  - Personas: `/dev/login` pins identity (display_name/username/avatar_url)
    alongside the role; gallery specimens use the stored-identity props.
- Out: any UI that lists or displays users other than the signed-in one —
  the columns exist to make that possible, but this feature only renders the
  signed-in user's own identity (profile, header). No identity history or
  snapshots; stored identity always reflects the latest sync.

## Schema

- `profiles.display_name text`, `profiles.username text`,
  `profiles.avatar_url text` — all nullable. One generated migration; no
  custom migration (grants already exclude them).

## Files

- `src/lib/discord.ts` — `fetchGuildMember` returns the fuller member shape;
  avatar-URL construction helpers.
- `src/features/roles/`
  - `identity.ts` — pure `guildIdentity(member, fallback)` + avatar-URL logic
  - `sync.ts` — `syncMember` writes identity + role; `getRole` stays the
    freshness entry point
  - `guard.ts` — `currentUser` returns role + stored display name / username
    / avatar (falling back to the session identity)
- `src/features/auth/identity.ts` — the JWT identity carries `username` (the
  non-member fallback source)
- `src/features/profile/components/profile-header.tsx` — display name +
  `@username` + avatar from stored identity
- `src/app/profil/page.tsx`, `src/components/site-header.tsx`,
  `src/features/auth/components/user-menu.tsx` — consume stored identity
- `src/features/dev/personas.ts` / `login.ts` / `components/gallery.tsx`
- Migration for the three columns

## Tests

- Unit: `guildIdentity` precedence (nick/global_name/username; member null →
  JWT fallback; avatar guild/global/null; animated `.gif` vs `.png`).
- Integration: a settings upsert does not clobber the server-managed columns
  (role, identity), and a server-managed identity write does not clobber the
  settings columns — the two write paths stay isolated. (The Discord fetch in
  `syncMember` is not exercised in tests; `guildIdentity` covers its logic.)
- Manual/browser: profile shows guild nickname + `@username`; header shows
  the nickname; personas render their pinned identity.

## Open questions

None.
