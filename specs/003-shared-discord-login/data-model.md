# Data Model: Ein Discord-Login für alle Gemeinde-Seiten

No schema change. Nothing in Postgres, Firestore or Supabase Auth changes shape.

## Entities

- **Account** (`auth.users`, shared by buli-hub and gemeinde-tippspiel): unchanged. The user id is
  what buli-hub's ~20 foreign keys and tippspiel's Firestore document ids (`predictions`, `scores`,
  `members`) refer to, so no data moves.
- **Session** (Supabase session: access token + refresh token): unchanged in content; only where
  the browser keeps it changes.

  | | Before | After, production | After, local and staging |
  |---|---|---|---|
  | Cookie name | `sb-<ref>-auth-token` | `gemeinde-auth` | `sb-<ref>-auth-token` |
  | Scope | host-only | `.vgcgemein.de` | host-only |
  | Readable by page scripts | yes | no | no |
  | HTTPS only | no | yes | no (HTTP locally) |
  | Sign-out | all devices | this browser | this browser |

  Lifecycle: created by a site's `/auth/callback`; renewed by whichever site's proxy sees an expired
  access token; ended by sign-out on any site or by revocation; a pre-switch session is ignored.
- **Buli Hub profile** (`public.profiles`): unchanged. Created lazily by `getRole` → `syncMember`
  on the first request that carries a session without one (research D7).

Full option values: `contracts/shared-session.md`.
