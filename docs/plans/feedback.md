# Feedback: Fehlermeldungen & Ideen

**Status: done** (2026-07-29) — schema + `src/features/feedback/` + the user-menu
dialog, `createForumThread` in the Discord client, `APP_BUILD_SHA` on the Cloud
Run deploy, gallery specimens. Verified via unit/integration tests (including
the action's insert-then-post ordering against a mocked Discord) and the
rendered gallery. **No designer hand-off is planned for this feature** — the
build below is the finished design, not a rudimentary first pass, so
`design/FEEDBACK.md` will not exist and no later design pass is owed.

In-app *intake* for bug reports, gated *intake* for feature ideas. Tracking
stays in Discord — this is deliberately not a ticket system.

## Why in-app and not an external tool

GitHub, Canny, a Google Form — every external option asks a non-technical
user to leave the app and usually to create another account. That barrier is
what rules them out. Buli Hub already has the user signed in via Discord
OAuth at the moment the bug happens, plus roles, a Discord REST client and
the design system. A "Fehler melden" entry point is one click from wherever
it broke, and it can capture the context reporters never supply on their own.

The honest alternative is a Discord forum channel with status tags and no
code at all. It loses only the entry point and the auto-captured context —
but that is where most reports die.

**Discord forum tags are the entire status tracker.** The app shows no
status, and has no list view; the moment it does, there are two sources of
truth.

## Scope

**In:**
- **Bug melden** — any signed-in user. Two entry points, both opening the same
  dialog: a "Feedback geben" item in the user menu, and a "Feedback" link in
  the site footer. The footer covers the pages that render no header at all
  (Impressum, Datenschutz). Neither appears for signed-out visitors, who
  cannot file a report.
- **Idee einreichen** — same dialog, `roleAtLeast("staff")`. Submit-gated
  only: users below staff never see the option, and *nobody* gets an in-app
  list of ideas.
- **Auto-captured context**, none of it typed by the reporter: route, user +
  role, active season window + current Spieltag, build SHA, user agent.
- **One row per report, then one Discord forum thread.** The row is written
  first and is the durable record — a Discord outage must never lose a
  report. Follow-up questions and screenshots happen in the thread, so no
  Supabase Storage and no upload UI.
- **The forum lives in any guild the bot is in**, not necessarily the main
  VGC Gemeinde server. Reports start on the staff server and may move to the
  main server later; nothing in the app assumes one or the other.
- **Rate limit**: 5 reports per user per hour. Not in the original note, but
  the feature lets any signed-in user create Discord threads; without a cap
  the forum is one bored user away from unusable.

**Out (deferred):**
- Staff triage board, in-app comments, assignees, upvoting, email
  notifications, duplicate detection, any sync to GitHub issues.
- Screenshot/file upload — the thread handles it.
- A "Fehler melden" button on an error boundary. Genuinely the best entry
  point, but the app has no `error.tsx` today; adding one is its own slice.
- Public „Bekannte Fehler" list — the obvious v2, nearly free once the rows
  exist, and it cuts duplicate reports better than any dedupe logic.

## Data — new table `feedback_reports`

```
id            uuid PK default random
kind          feedback_kind enum ('bug', 'idea')
title         text
body          text
path          text            -- route the reporter was on (client-supplied)
user_agent    text            -- truncated (client-supplied)
build_sha     text null       -- null on local/unbuilt environments
window_id     uuid null FK → registration_windows (set null)
round         integer null    -- current Spieltag at submit time
reporter_id   uuid (FK → auth.users in the custom migration, cascade)
reporter_role role            -- role at submit time; roles change, reports don't
thread_id     text null       -- Discord forum thread, null while unposted
thread_guild_id text null     -- guild the thread landed in, from the API response
posted_at     timestamptz null
created_at    timestamptz default now
index (reporter_id, created_at)   -- the rate-limit read
```

Migrations: `feedback` (generated) + `feedback_fk_rls` (custom: auth FK, RLS
deny-all as defense in depth — nothing reads this table through PostgREST).

`thread_guild_id` is recorded per row rather than read from config, because
the forum is expected to move servers: rows written before a move must still
resolve to a working link afterwards. It is taken from the thread the API
returns, so it is right by construction and needs no configuration.

`path` and `user_agent` come from the browser and are untrusted: they are
length-capped in the Zod schema and rendered into Discord with the existing
`allowed_mentions: { parse: [] }`, so no report can ping the server.

## Feature folder — `src/features/feedback/`

**Pure logic (`feedback.ts`, unit-tested):**
- `feedbackInputSchema` — Zod: `kind`, `title` 3–100, `body` 10–1200, `path`
  ≤ 200, `userAgent` ≤ 200; all trimmed. The 1200 cap exists so body +
  context block always fit Discord's 2000-character message limit.
- `canSubmit(role, kind)` — `bug` for everyone, `idea` for
  `roleAtLeast(role, "staff")`. One function, used by the action's gate *and*
  by the dialog to decide whether the type switch appears.
- `threadTitle({ kind, title })` → `[Fehler] …` / `[Idee] …`, truncated to
  Discord's 100-character thread-name limit on a word boundary.
- `threadBody(context)` → the thread's opening message: the description, then
  a context block (Route, Nutzer, Rolle, Saison/Spieltag, Build, Browser).
  Deterministic string building, so it is exhaustively unit-testable.
- `submissionAllowed({ recentCount, limit })` → `{ ok } | { ok:false, error }`.
- `reporterThreadUrl({ threadGuildId, mainGuildId, threadId })` → the
  `discord.com/channels/…` link, **or `null` when the thread's guild is not
  the main guild** — see below.

**Queries (`queries.ts`, integration-tested):**
- `insertFeedback(row)` → id
- `markPosted(id, threadId)`
- `recentFeedbackCount(userId, since)` — the rate-limit input
- No list/read query. That is the point.

**Action (`actions.ts`, `{ ok: true, threadUrl } | { ok: false, error }`):**
`submitFeedback(input)` — sign-in gate → `feedbackInputSchema` → `canSubmit`
→ rate limit → resolve server context (`latestWindow`, `currentMatchday`,
`APP_BUILD_SHA`) → **insert the row** → best-effort forum thread → on success
`markPosted`. A failed Discord call is logged and still returns `ok`: the
report is safe, only the link is missing. No `revalidatePath` — nothing in
the app displays this data.

The Discord call stays in-band (~300 ms) because the reporter may get the
thread link in the success state; the row is already committed when it runs.

**Don't link a thread the reporter cannot open.** While the forum sits on the
staff server, a player who follows the link gets a Discord error page — worse
than no link. `reporterThreadUrl` therefore returns a link only when the
thread's guild matches `DISCORD_GUILD_ID`, the guild every user is
authenticated against; otherwise the success state just says thanks. This
needs no flag and flips itself the day the forum moves to the main server.

**Discord client (`src/lib/discord.ts`, one addition):**
`createForumThread(channelId, { name, content, appliedTags })` → `{ ok: true,
threadId, guildId } | { ok: false, status }`, matching `postChannelMessage`'s
typed-outcome style. `POST /channels/{id}/threads` with an inline `message`;
`guildId` is read off the returned thread, which is what makes the feature
guild-agnostic — the app never has to be told where the forum lives.

## Views

- `<FeedbackDialog>` (client) — 640px on desktop (`sm:max-w-[640px]`). The
  shared `DialogContent` now caps every dialog at `calc(100dvh-2rem)` and
  scrolls (it previously constrained neither, so any dialog taller than the
  viewport ran off a phone screen unreachable). This one goes further and turns
  that scrolling off (`overflow-y-hidden`) in favour of its own flex layout, so
  only the middle section scrolls and „Absenden" is never something you have to
  scroll to find. That is why the action bar is a separate
  `<FeedbackActions>` — it must sit outside the scrolling body. `min-h-0` on
  the scroll container is what lets a flex child actually shrink.
  Input (Titel) +
  Textarea (Beschreibung), plus a Bug/Idee RadioGroup rendered only when
  `canSubmitIdea` — two cards side by side, stacked below the `sm` breakpoint.
  Captures `usePathname()` and `navigator.userAgent` on open. States: form,
  submitting, success (thanks, plus "Zum Discord-Thread" only when the action
  returns a link), error.
- Design-system details (`design/DESIGN.md`): uppercase micro labels (§8.6)
  for the fields, `<Tick>` (§8.1) on the context strip and the success state,
  `<ActionLink>` (§8.7) for the thread link, `<DialogFooter>` for the action
  bar (buttons full-width and stacked on mobile). The captured context is
  named explicitly — the real route plus "Name & Rolle · Spieltag · Browser &
  Build" — rather than hidden behind a vague sentence. The description
  textarea is `field-sizing-content`, so it grows while typing; only its floor
  is set (`min-h-[124px]`, since the primitive's 64px invites a one-liner).
  The character counter appears only in the last 200 characters.
- `UserMenu` gains a "Feedback geben" item; it already receives `isStaff`, so
  the idea gate costs nothing there.
- `<FeedbackFooterLink>` + `SiteFooter`, which becomes an async server
  component and resolves `currentUser()`. Because the footer lives in the root
  layout, that put an auth read on *every* page — so `currentUser` is now
  wrapped in React `cache()`, making header, footer and page share one call
  per request instead of repeating the auth round-trip and role sync. Cost:
  `/staff/saison` was the last statically rendered page and is now dynamic
  like the rest.

## Environment & deploy

- `DISCORD_FEEDBACK_FORUM_CHANNEL_ID` — unset → rows are stored, no thread is
  created (local dev stays silent, mirroring `DISCORD_RESULTS_CHANNEL_ID`).
  The channel may live in **any guild the bot is a member of**; no guild id
  is configured for it. Prerequisite, one-time: invite the same bot to the
  staff server and give it *View Channel*, *Create Posts* and *Send Messages
  in Posts* on the forum. `DISCORD_GUILD_ID` stays the main server — it is
  the role-sync guild and the yardstick for whether a thread link is shown.
- `DISCORD_FEEDBACK_TAG_BUG` / `DISCORD_FEEDBACK_TAG_IDEA` — optional forum
  tag ids, applied when set. Tag ids belong to their forum, so **moving the
  forum to another server means new tag ids** — the two vars change together
  with the channel id. Status tags live in the same tag set and are applied
  by staff in Discord.
- `APP_BUILD_SHA` — added to the Cloud Run deploy step in `ci.yml` as
  `--update-env-vars APP_BUILD_SHA=${{ github.sha }}` (`--update-`, not
  `--set-`, so the service's manually configured vars survive). Unset → the
  context block reads „lokal".
- All of the above documented in `.env.example`; the forum channel and tag
  ids in `docs/deployment.md`.

## Dev tooling

- **Gallery** (`src/features/dev/components/gallery.tsx`): the dialog in bug
  and idea variants, validation error, success with and without a thread
  link, rate-limit error.
- **Personas**: no change needed — the existing player and staff personas
  already cover both sides of the idea gate, and the feature adds no new
  auth-metadata shape.

## Tests

- **Unit**: `canSubmit` across all four roles × both kinds;
  `feedbackInputSchema` bounds (trimming, min/max, over-long path/UA);
  `threadTitle` prefix + truncation at exactly 100; `threadBody` with and
  without season/round and with and without a build SHA, plus the ≤ 2000
  total-length guarantee at maximum input; `submissionAllowed` at the limit
  boundary; `reporterThreadUrl` (same guild → link, foreign guild → null,
  missing thread id → null).
- **Integration** (`queries.integration.test.ts`): `insertFeedback` +
  `markPosted` round-trip; `recentFeedbackCount` window boundary
  (inside/outside the hour, other users excluded); cascade delete with
  `auth.users`; report survives its window's deletion; RLS denies anon reads
  and writes (asserted as `anon` inside a transaction — the app's superuser
  connection bypasses RLS).
- **Integration** (`actions.integration.test.ts`): the action's ordering
  guarantee, with `currentUser` and `createForumThread` mocked — the row
  survives a Discord rejection, a thrown call, and a foreign-guild thread;
  the idea gate and the rate limit block before anything is written.
- **Manual**: submit as the player persona (bug only, no type switch), as the
  staff persona (both), verify the forum thread and its tag; confirm the
  success state shows *no* link while the forum is on the staff server, and
  that `thread_guild_id` recorded that server; unset the forum channel id and
  confirm the row still lands and the success state degrades.

## Delivery

Branch `feat/feedback` off `dev`, squash-merged to `main` as one commit.
