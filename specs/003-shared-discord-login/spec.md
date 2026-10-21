# Feature Specification: Ein Discord-Login für alle Gemeinde-Seiten

**Feature Directory**: `specs/003-shared-discord-login/`

**Created**: 2026-10-18

**Status**: Implemented 2026-10-20; ships with the rollout (tasks T025, T027)

**Input**: User description: "Unify the Discord login. It should count for vgcgemein.de, not just
buli.vgcgemein.de, so we can later share it with the tours repo." Decided by the maintainer on
2026-10-18: one shared session for the Gemeinde sites, a new session name so everyone signs in once
more after the switch, the session hidden from page scripts and sent only over HTTPS, shared only in
production; every `*.vgcgemein.de` subdomain is operated by the Gemeinde.

## Clarifications

### Session 2026-10-18

- Q: When a player signs out on one site, should that sign them out only in this browser, or on all their devices? → A: Only this browser: every Gemeinde site is signed out there, other devices stay signed in.
- Q: Should the privacy page explicitly say that the sign-in cookie now applies to all Gemeinde sites? → A: Yes, one sentence in the Buli Hub's privacy page, section 6 (Cookies).
- Q: The Tippspiel has no privacy notice of its own (its footer links only to the imprint); what does it get? → A: A link to the Buli Hub's privacy page in its footer, next to the imprint.

## User Scenarios & Testing *(mandatory)*

Today a player who is signed in on the Buli Hub (buli.vgcgemein.de) has to sign in again on the
Tippspiel (tippspiel.vgcgemein.de), although both already know the same Discord account: they share
one account system and one Discord app, so the person is the same user in both. Only the session is
kept per site. This feature makes one sign-in count for every Gemeinde site, so the sites feel like
one product, and prepares the tournament site (gemeinde-tours, turniere.vgcgemein.de) to join later
without another change to the session.

### User Story 1 - Signed in once, signed in everywhere (Priority: P1)

A player signs in with Discord on the Buli Hub. Later they open the Tippspiel and are already
signed in there, with their name in the header, and can enter tips without signing in again. It
works the same in the other direction.

**Why this priority**: it is the feature; everything else protects it.

**Independent Test**: sign in on one site, open the other in the same browser, and see the
signed-in state on its first page load.

**Acceptance Scenarios**:

1. **Given** a player signed in on the Buli Hub, **When** they open the Tippspiel, **Then** the
   Tippspiel shows them signed in on the first page load, as the same person.
2. **Given** a player signed in on the Tippspiel, **When** they open the Buli Hub, **Then** the Buli
   Hub shows them signed in, with the role and Discord identity it would have given them after a
   sign-in there.
3. **Given** a player who has never used the Buli Hub but signed in on the Tippspiel, **When** they
   open the Buli Hub for the first time, **Then** their Buli Hub profile is created and their role
   synced, exactly as after a first sign-in on the Buli Hub itself.
4. **Given** a signed-in player, **When** they press "sign in" on a site that already sees the
   shared session, **Then** no second Discord consent is needed and they land where that site's
   sign-in lands today.

---

### User Story 2 - Signing out ends it everywhere (Priority: P1)

A player signs out on either site. Afterwards neither site shows them signed in in this browser.
Their other devices (a phone, another computer) stay signed in.

**Why this priority**: a shared session that survives sign-out on the other site would surprise
players on shared or borrowed devices; it ships together with Story 1.

**Independent Test**: sign out on one site, reload the other, and see the signed-out state.

**Acceptance Scenarios**:

1. **Given** a player signed in on both sites, **When** they sign out on the Tippspiel, **Then** the
   Buli Hub shows them signed out on the next page load.
2. **Given** a player signed in on both sites, **When** they sign out on the Buli Hub, **Then** the
   Tippspiel shows them signed out on the next page load.
3. **Given** a player signed in on their laptop and their phone, **When** they sign out on the
   laptop, **Then** the phone stays signed in on every site.

---

### User Story 3 - The session stays protected (Priority: P2)

The shared session reaches more sites than before, so it must be harder to steal than today: no
script on any page can read it, and it never travels over an unencrypted connection.

**Why this priority**: it is the condition for sharing the session at all; it has no visible effect.

**Independent Test**: inspect the session in the browser's developer tools on each site.

**Acceptance Scenarios**:

1. **Given** a signed-in player, **When** a script on any page tries to read the session,
   **Then** it cannot.
2. **Given** the production sites, **When** the session is set, **Then** it is only ever sent over
   HTTPS.

---

### User Story 4 - The switch costs one sign-in, nothing more (Priority: P2)

On the day of the switch, players who were signed in see themselves signed out once and sign in
again with Discord. Nothing else is lost: their profile, registrations, team sheets, results and tips
are untouched, because they belong to the account, not to the session.

**Why this priority**: accepted by the maintainer; it only needs to be uneventful.

**Independent Test**: keep a session from before the switch, deploy, and reload.

**Acceptance Scenarios**:

1. **Given** a player signed in before the switch, **When** they open either site after it,
   **Then** they see the normal signed-out state, with no error, and one sign-in restores everything.

---

### Edge Cases

- A player has both sites open in different tabs for longer than a session lasts before it renews:
  neither site signs them out unexpectedly, even when both renew the session around the same time.
- Local development and the staging environment (no Gemeinde domain, its own account system) keep
  today's per-site session; nothing in them changes.
- The Buli Hub's developer sign-in (`/dev` personas) keeps working wherever it works today.
- The Tippspiel's guild check and the Buli Hub's roles, bans and guild-membership checks decide
  exactly what they decide today: a shared session only says who someone is, never what they may do.
- The main site vgcgemein.de and every other Gemeinde subdomain receive the session too; they ignore
  it.
- The tournament site joins in a later feature; it is a static site today and has nothing to read a
  session with.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A sign-in on any production Gemeinde site (the Buli Hub, the Tippspiel) MUST be
  recognised by every other one in the same browser, without a further sign-in.
- **FR-002**: Signing out on any of these sites MUST end the session for all of them in that
  browser, and MUST NOT end the account's sessions on other devices.
- **FR-003**: The session MUST NOT be readable by page scripts and MUST only be sent over HTTPS in
  production.
- **FR-004**: Outside production (local development, staging) the session MUST stay limited to the
  site that created it, as today.
- **FR-005**: Sessions created before the switch MUST NOT be honoured afterwards; affected players
  see the signed-out state without an error and sign in once.
- **FR-006**: When the Buli Hub sees a valid session for an account it has no profile for yet, it
  MUST create the profile and sync the role and identity as it does after a sign-in on the Buli Hub.
- **FR-007**: After a sign-in, each site MUST land where it lands today.
- **FR-008**: Both sites MUST use one identical, documented definition of the shared session (its
  name, the domain it covers in production, its protections), so a further Gemeinde site joins by
  adopting that definition and nothing else about the session.
- **FR-009**: Authorization MUST stay with each site: roles, bans, guild membership and every other
  check keep deciding what they decide today.
- **FR-010**: Using both sites in parallel MUST NOT sign a player out when the session renews.
- **FR-011**: The Buli Hub's privacy page (section 6, Cookies) MUST say that the sign-in cookie
  applies to all VGC Gemeinde sites under vgcgemein.de, so one sign-in is enough.
- **FR-012**: The Tippspiel's footer MUST link to the Buli Hub's privacy page next to its imprint
  link, since the Tippspiel now sets the same sign-in cookie and has no privacy notice of its own.

### Key Entities

- **Account**: the person's Discord-backed identity in the shared account system; already the same
  for the Buli Hub and the Tippspiel. Unchanged.
- **Session**: proof that a browser is signed in to an account. Today one per site; after this
  feature one per browser for all production Gemeinde sites.
- **Buli Hub profile**: the Buli Hub's own record of an account (role, guild membership, display
  identity). Created on first use; unchanged in shape.

## UX & Mockups *(mandatory when users see a change)*

**Status**: Approved 2026-10-18

Two copy changes (FR-011, FR-012), otherwise no visible change: no view, layout or state changes on any site. The
header shows the signed-in or signed-out state it shows today; only the moment when that state
appears changes (after signing in on another site rather than on this one). The one-time sign-out
on the day of the switch shows today's signed-out state.

**Explanation level**: Display page (the privacy page states facts; one sentence, no new
structure).

| View | Route | Who sees it | Mockup file |
|------|-------|-------------|-------------|
| Datenschutzerklärung, section 6 "Cookies" | /datenschutz | public visitors, signed-in users | mockups/datenschutz.html |
| Tippspiel footer (every Tippspiel page) | tippspiel.vgcgemein.de | Tippspiel visitors | mockups/tippspiel-footer.html |

The Buli Hub mockup shows section 6 with the new sentence at desktop and phone width, light and
dark. The Tippspiel mockup shows the footer with the new link at desktop and phone width, light
only (the Tippspiel has no dark mode).

**UX decisions**:

- Section 6 keeps its existing paragraph and gains a second one, verbatim: "Die Anmeldung gilt für
  alle Seiten der VGC Gemeinde unter vgcgemein.de, etwa den Buli Hub und das Tippspiel. Das
  Anmelde-Cookie wird deshalb an diese Seiten übermittelt, damit du dich nur einmal anmelden musst.
  Wenn du dich abmeldest, endet die Sitzung auf all diesen Seiten in diesem Browser."
- The page's "Stand" line moves from "Juli 2026" to "Oktober 2026".
- The Tippspiel footer shows "Impressum" then "Datenschutz", same style as the existing link
  (orange, blue on hover, 12px), opening `https://buli.vgcgemein.de/datenschutz` in a new tab like
  the imprint does.
- The link is a stopgap: the Buli Hub's privacy policy describes the Buli Hub, not what the
  Tippspiel itself processes (tips, its own hosting). A privacy notice of the Tippspiel's own is a
  separate, later change.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In a check of both directions (Buli Hub → Tippspiel, Tippspiel → Buli Hub), a player
  signed in on one site is signed in on the other on the first page load, every time.
- **SC-002**: After signing out on either site, the other site shows the signed-out state on the
  next page load, every time, while a second device stays signed in.
- **SC-003**: On every production site, the browser's developer tools show the session as hidden
  from scripts and HTTPS-only.
- **SC-004**: With both sites open in parallel for two hours (longer than a session lasts before it
  renews), the player is never signed out.
- **SC-005**: Staging and local development behave exactly as before.
- **SC-006**: No player loses data in the switch; the only effect is one sign-in.

## Assumptions

- Every `*.vgcgemein.de` subdomain is operated by the Gemeinde (confirmed by the maintainer,
  2026-10-18); a session for the whole domain reaches only Gemeinde servers.
- The Buli Hub and the Tippspiel already share one account system (the Buli Hub's production
  project) and one Discord app; this feature adds no second sign-in provider.
- Both sites ship the change on the same day, so no player holds a session only one of them reads.
- The Tippspiel's part of the change lands in its own repository (gemeinde-tippspiel) as one commit
  referencing this spec.
- The tournament site (gemeinde-tours) is out of scope; it gets the shared session in a later
  feature, after it gains a server (its constitution, Principle IV).
- Staging has no Gemeinde domain and its own account system, so it cannot and need not share a
  session.
- Out of scope: a privacy notice that covers what the Tippspiel itself processes; FR-012 only links
  the Buli Hub's policy for the shared cookie (UX decisions).
