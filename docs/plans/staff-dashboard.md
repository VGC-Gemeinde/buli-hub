# Staff-Bereich: Dashboard und Navigation

**Status: done** (2026-09-30): verified by screenshots at 1440 × 900,
1280 × 800 and phone width, in the pre-season and the running season.

No designer hand-off follows: the views are built final, on
`design/DESIGN.md`. `design/STAFF-DASHBOARD.md` describes the result;
`design/STAFF-BEREICH.md` and `design/SAISON-DASHBOARD.md` point to it where
they placed things on `/staff`.

## Context

`/staff` grew one section per feature. In the running season it is over
5000px long: four todo cards, four stat tiles, the open disputes, all 33 open
matches of the week, the resolved disputes, the drops and 38 membership rows,
most of them "Noch nicht geprüft". Most of it is data without anything to do.
The way to the other staff pages is split three ways (buttons in the season
strip, "Banliste →" / "Nutzung →" beside the title, links inside cards), and
the subpages do not share one anatomy: Aufnahmen, MotW and Banliste have the
back link and the 30px title, Nutzung and Divisionen do not.

The rule, the same as for the Spieler-Dashboard
(`player-dashboard-at-a-glance.md`): what staff need at once is on one screen.
For staff that means:

- **Concrete problems** are shown directly, each with the one action that
  solves it.
- **Everything normal** ("33 offen diese Woche") is a number, not a list.
- **Full lists** live on their own pages, which all look and navigate alike.

## Mental model: three scopes

Not necessarily visible as such, but what the page is built around:

- **Woche**: this Spieltag's matches (open, overdue, free wins to confirm,
  disputes), recordings to release, the MotW candidates.
- **Saison**: participants (registrations, membership, drops, replacements),
  divisions, Spielplan, Match of the Week.
- **Hub**: Banliste, Nutzung, things that outlive a season.

## The dashboard

Top to bottom, the same skeleton in every phase:

1. **Title and season header.** "Staff-Bereich" with the season beside it:
   the season, its phase, Spieltag n of m with the progress bar and the
   week's dates. Pre-season the season card is the first block instead,
   since opening the registration happens in it.
2. **Zu erledigen.** One list, one anatomy for every item: what is wrong in
   one line, a short why, one action (button or link to the place that
   solves it). Two tones: red when it is overdue or holds something back,
   orange when it is due. Sorted red first. Empty: one quiet line "Nichts zu
   tun" instead of the list, so staff see at a glance that all is well.
3. **Diese Woche** (running season) and **Saison**, side by side on
   desktop, 2 × 2 stat tiles each. A tile that counts a problem is only red
   when the problem is also a todo above; tiles link to the matching list.
   Pre-season the season tiles are the registration numbers.

On desktop 1-4 fit one screen; on mobile they stack.

## Where today's pieces go

Running season (`regular_season`, `schedule_hidden`):

| Today | Becomes |
|---|---|
| "Banliste →", "Nutzung →" beside the title | staff navigation (below) |
| Season strip with Spielplan / MotW / Aufnahmen / Divisionen buttons | season header (1) + navigation |
| Publish schedule card (`schedule_hidden`) | todo |
| Discord sync card (only when out of sync) | todo |
| Stale recording holds card | todo |
| MotW candidates / confirmation card | todo |
| Membership warning card | todo, links to Teilnehmer filtered to "nicht auf dem Server" |
| Stat tiles Überfällig / Angefochten / offen diese Woche / Freewins offen | Diese Woche tiles; overdue matches, open disputes and free wins to confirm are also todos |
| List "Angefochten" | todo per dispute ("Prüfen" opens the match) |
| List "Diese Woche offen" (33) | Woche page |
| "Erledigte Anfechtungen" | Woche page |
| Drops section with dialogs | Teilnehmer page; tile "Drops" in Saison |
| Discord-Mitgliedschaft list (38) | Teilnehmer page; tile in Saison |

Pre-season:

| Today | Becomes |
|---|---|
| Preseason todo card (seeding, schedule) | todo |
| Season card (open the window, link, closing date) | stays, as the first block |
| Anmeldungen grid | Teilnehmer page; tile "Anmeldungen" |
| Membership warning and list | todo and Teilnehmer page, as above |

## Subpages

One shared anatomy (`StaffPage` shell) for every staff subpage, existing and
new: the site header with the Staff-Bereich row, the 30px title with the large tick, one intro line, then the
content. Nutzung and Divisionen adopt it.

New pages, the lists that leave the dashboard:

- **Woche** (`/staff/woche`): the Spieltag's matches with filter chips
  (Alle, Offen, Überfällig, Freewins offen, Angefochten), Spieltag switch,
  the resolved disputes below. The dashboard tiles link into its filters.
- **Teilnehmer** (`/staff/teilnehmer`): everyone registered in the season as
  one list with status and filter chips (Alle, Nicht auf dem Server, Nicht
  geprüft, Gedroppt), the actions per player where they are today (cancel
  registration, drop, replace), the drop and replacement dialogs. Pre-season
  it is the registration list.

- **Spielplan** (`/staff/spielplan`): the public schedule component in the
  staff shell. The public `/spielplan` stays for everyone; a staff tab never
  leads out of the Staff-Bereich.

Existing pages keep their content: Match of the Week, Aufnahmen, Divisionen
(seeding), Banliste, Nutzung. The seeding workspace keeps its 1520px, but
only below the tab bar, in a frame that scrolls sideways; header and tab bar
sit as on every other staff page.

## Navigation

The staff pages are the Staff-Bereich section of the site navigation
(`docs/plans/site-navigation.md`): the header stays as on every page, and the
section's row under it holds the staff pages, grouped by scope with a thin
divider between the groups (Übersicht | Woche, Aufnahmen | Teilnehmer,
Divisionen, Spielplan, MotW | Banliste, Nutzung). Entries that do not apply
in the phase stay out (the pure `staffNav`); Nutzung only for admin+.

## Delivery

One commit: the shell and the navigation link to the new pages, and the
dashboard only makes sense once the lists have somewhere to go.

## Tests

- Unit: the todo derivation as one pure function (inputs: the facts the
  cards use today; output: the sorted items with tone), covering every item
  and the empty case; the tile numbers; the navigation entries per phase and
  role.
- Integration: none new (the queries stay).
- Screenshots at 1440 × 900, 1280 × 800 and phone width, light and dark, in
  pre-season, `schedule_hidden` and the running season, with and without
  todos.
