# Discord role sync

**Status: done** (2026-07-02) — verified against the real guild (role ids resolve, non-member → 404 → player) and in the browser via personas.

Buli Hub roles are derived from the VGC Gemeinde Discord server. The backend
looks up a user's guild roles via the Discord REST API (bot token, no bot
process — per CLAUDE.md) and stores the resulting app role; the profile page
shows it.

## Roles

`dev` > `admin` > `staff` > `player` (highest configured role wins when a
member has several). Guild members without any configured role — and users
who are not guild members at all — are `player`. German UI labels: Dev,
Admin, Staff, Spieler.

`staff` may be granted by more than one Discord role: the league staff role
plus other trusted teams that get the same access — currently the MOTW-Team,
via its own Discord role. They all resolve to the same `staff` app role with
full staff access; the app has no finer per-section scoping.

## Scope

- In:
  - `role` column on `profiles` (pg enum, not null, default `player`),
    server-managed — the settings action cannot touch it, and a custom
    migration revokes INSERT/UPDATE on the column from `authenticated` so
    the PostgREST path cannot either (defense-in-depth).
  - `src/lib/discord.ts` — first Discord REST helper: `fetchGuildMember`
    (bot token + guild id from env; 404 → not a member → null).
  - Role derivation as a pure function: `(memberRoleIds, roleConfig) → role`.
  - Sync on every sign-in: the auth callback, after a successful code
    exchange, fetches the member and upserts the profile row's role.
    Best-effort — a Discord API failure logs and never blocks sign-in
    (existing role, or default `player`, stays).
  - **TTL revalidation on read**: `profiles.role_synced_at` records the last
    sync. All role reads go through `getRole(userId, discordId)` — if the
    stored role is older than 5 minutes, it re-syncs from Discord first.
    Revocations and promotions therefore take effect within the TTL, without
    re-login, a scheduler, or a per-request Discord dependency. If Discord
    is unreachable, the stale role is used and the failure logged
    (availability over freshness inside a small window). Future gated
    features MUST read roles only through this helper — it is the freshness
    guarantee.
  - Missing role config (env) → sync silently skipped, so local dev works
    without a bot token.
  - Profile page: role badge (shadcn `badge`) next to the name in
    `ProfileHeader`.
  - Dev tooling (per CLAUDE.md definition of done): each persona gets a
    role — langer-name → dev, voll → admin, kein-avatar → staff,
    leer → player — written directly to the DB on `/dev/login`; the gallery
    shows the badge in all four role variants.
- Out: permission *enforcement* (no route/action is gated yet — that starts
  with the first admin feature, which will build on `getRole`), role change
  notifications, scheduled batch re-sync (unnecessary given TTL
  revalidation), a manual "refresh my role" control.

## Configuration (env)

| var                    | value                                    |
|------------------------|------------------------------------------|
| `DISCORD_BOT_TOKEN`    | bot token (already in `.env.example`)     |
| `DISCORD_GUILD_ID`     | VGC Gemeinde server id                    |
| `DISCORD_ROLE_ID_DEV`  | Discord role id mapped to `dev`           |
| `DISCORD_ROLE_ID_ADMIN`| Discord role id mapped to `admin`         |
| `DISCORD_ROLE_ID_STAFF`| Discord role id mapped to `staff`         |
| `DISCORD_ROLE_ID_MOTW` | MOTW-Team role id, also mapped to `staff` (optional) |

`DISCORD_ROLE_ID_MOTW` is the only optional one — absent, `staff` is granted
by the league staff role alone. The bot must be a member of the guild; the
single-member REST lookup
(`GET /guilds/{guild}/members/{user}`) needs no privileged gateway intent.
(The membership feature's roster sweep additionally uses the guild members
*list*, which does require the Server Members Intent — enabled on the bot for
that reason; see docs/plans/discord-membership.md. Role sync itself still
works without it.)

## Schema

- `pgEnum("role", ["dev", "admin", "staff", "player"])`
- `profiles.role: role not null default 'player'`
- `profiles.role_synced_at: timestamptz null` (null = never synced)
- Generated migration + custom migration for the column-level REVOKE
  (covers both new columns).
- Role sync upserts only the `role` column on conflict — handles and origin
  are never touched by the sync path.

## Files

- `src/features/roles/`
  - `roles.ts` — `Role` type, ordering, `deriveRole`, `roleLabel` (pure)
  - `config.ts` — reads the env mapping, `null` when incomplete
  - `sync.ts` — `syncRole(userId, discordId)`: fetch member → derive →
    upsert; `getRole(userId, discordId)`: read with TTL revalidation
  - `roles.test.ts` (incl. pure staleness check `isRoleStale(syncedAt, now)`)
- `src/lib/discord.ts` — REST helper (server-only; token never client-side)
- `src/app/auth/callback/route.ts` — calls `syncRole` after the exchange
- `src/features/profile/components/profile-header.tsx` — role badge
- `src/app/profil/page.tsx` — passes the role from the profile row
- `src/features/dev/personas.ts` / `login.ts` / `components/gallery.tsx`
- shadcn addition: `badge`

## Tests

- Unit: `deriveRole` — priority order, multiple configured roles, no
  configured roles, not a guild member, empty/unknown role ids; `roleLabel`.
- Integration (extends the existing profile suite): role column default;
  sync upsert leaves settings columns untouched.
- Not tested: the Discord HTTP call itself (thin fetch wrapper).

## Open questions

None.
