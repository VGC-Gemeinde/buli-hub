> Abgelöst in Teilen durch specs/004-google-cloud-migration (Session-Vertrag).

# Contract: the shared Gemeinde session

The one definition every Gemeinde app that signs players in with Discord adopts (FR-008). Today:
buli-hub and gemeinde-tippspiel. An app joins by implementing exactly this and nothing else about
the session.

## Prerequisites

- The app uses the Buli Hub production Supabase project and its Discord app (no second provider).
- Its host is under `vgcgemein.de` and listed in the Supabase Redirect URLs
  (`https://<host>/**`).
- No browser code reads the session; every read happens on the server.

## Cookie options

`src/lib/supabase/cookie-options.ts`, identical in every app. A change to it goes into every app
in the same feature; the file says so in its header:

```ts
sessionCookieOptions(env) // pure: reads AUTH_COOKIE_DOMAIN only
```

| `AUTH_COOKIE_DOMAIN` | Returned `cookieOptions` |
|---|---|
| set (production only, value `.vgcgemein.de`) | `{ name: "gemeinde-auth", domain: ".vgcgemein.de", path: "/", sameSite: "lax", secure: true, httpOnly: true }` |
| unset (local, staging) | `{ httpOnly: true }`: library defaults otherwise, so the name stays `sb-<ref>-auth-token` and the cookie host-only |

Every `createServerClient(url, key, { cookies, cookieOptions })` in the app passes it: the server
client and the proxy. An app with a browser client cannot join without moving those reads to the
server.

## Sign-out

`supabase.auth.signOut({ scope: "local" })`: ends the session in this browser for every Gemeinde
app, keeps the account's other devices signed in.

## Legacy cookie cleanup

While `AUTH_COOKIE_DOMAIN` is set, the proxy clears `sb-<ref>-auth-token` (all chunks) at host-only
scope when the request carries it, via `clearAuthCookiesAtScopes` from `@supabase/ssr`, which finds the cookie and its chunks itself and
does nothing when there are none. `<ref>` (`legacySessionKey`, same file) is
the first host label of `NEXT_PUBLIC_SUPABASE_URL`. An app that joins later and never wrote the
default cookie in production may skip this.

## Deployment

- `AUTH_COOKIE_DOMAIN=.vgcgemein.de` on the production service, set before the code that reads it
  deploys. Never on staging or locally.
- Every `*.vgcgemein.de` host is operated by the Gemeinde; pointing a subdomain at a third-party
  service would hand it every player's session.

## Not part of the contract

Authorization. Roles, bans, guild membership and every other permission stay with each app.
