# Quickstart: validating the move

How to prove the feature works, from a fresh clone to a rehearsed switch. Details of the session,
maintenance and transfer behavior are in [contracts/](contracts/); the data model in
[data-model.md](data-model.md).

## 1. Local stack without Supabase (SC-008, US6)

```bash
npm ci
npm run db:start        # docker compose: postgres:17 on 54322, fake-gcs-server on 4443
npm run db:reset        # drop + recreate the local DB, drizzle-kit migrate (new baseline)
npm test -- --run       # full suite; no Supabase tool installed
npm run dev
```

Expected: the suite is green; `which supabase` is irrelevant; `grep -ri supabase src scripts
package.json` finds nothing but backlink notes and the move script (SC-007).

## 2. Sign-in (US2)

With `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` in `.env` and
`http://localhost:3000/auth/callback` registered in the Discord app:

1. "Mit Discord anmelden" → Discord → back on `/`, signed in, name and avatar in the header.
2. In the browser's dev tools: one cookie `buli-hub-auth`, HttpOnly; no `sb-…` cookie.
3. Start a sign-in and cancel on Discord → back on `/` with today's "cancelled" message.
4. Replay the callback URL from step 1 → generic error, nobody signed in.
5. Sign out → signed out; a second browser signed in as the same account stays signed in.
6. `psql`: `update sessions set last_seen_at = now() - interval '31 days'` → next request is
   signed out.

## 3. `/dev` tooling (US6)

`/dev` → sign in as each persona, impersonate a real user from a `db:clone-prod` fixture; each is
immediately signed in as that account. `/dev/ui` shows the maintenance page.

## 4. Stream photos locally (US4)

As a persona offered a photo: upload on `/profil`, see it at `/stream-photos/<userId>/<uuid>.webp`
(signed in as that persona or as staff), replace, remove. Signed out, or as another player, the
same address answers 404. The stream API
(`curl -H "Authorization: Bearer $STREAM_API_SECRET" localhost:3000/api/stream/matches`) returns
`<APP_BASE_URL>/stream-photos/<path>?sig=…`, which loads without a session; with one character of
the signature changed it answers 404. The emulator bucket itself is never linked.

## 5. Maintenance (FR-018)

`MAINTENANCE=on npm run dev`:
- `/`, `/spieler/<id>`, `/staff`, `/auth/callback`, a Server Action POST → 503 with the approved
  page; `/impressum`, `/datenschutz` → 200; `/api/stream/matches` and `/api/jobs/discord-season-sync`
  → 503 JSON; the database sees no query (`pg_stat_activity` / query log stays quiet).

## 6. The move, locally (US3)

Two local databases: one restored from a production-shaped Supabase dump (the old schema, built
with the old chain from git history or a nightly backup), one empty target.

```bash
npm run db:move-from-supabase -- --source=<old> --target=<empty> --dry-run
npm run db:move-from-supabase -- --source=<old> --target=<empty>
```

Expected: the verification table shows equal counts for every table, every account with the same
id and Discord id, every referenced photo present; exit code 0. Introduce a difference (delete one
row in the target, re-run verify only) → exit code 1 and the table names it.

## 7. Rehearsal on staging (SC-001 to SC-006)

Follow `docs/deployment.md` "Umzug von Supabase" with the staging names, then:
- sign in as a real staff account and as a player; compare their pages with production;
- run the Discord season sync once ("Jetzt abgleichen"); its result reports no created, changed or
  deleted object on the test server;
- trigger the nightly backup once; restore it into the local stack and run the hub on it;
- fetch every photo URL from the stream API without a session.

Only after all of this passes is the production switch scheduled.
