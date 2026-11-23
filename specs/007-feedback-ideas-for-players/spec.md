# Feature Specification: Feedback ideas for players

**Feature Directory**: `specs/007-feedback-ideas-for-players/`

**Created**: 2026-11-23

**Status**: Shipped 2026-11-23

**Input**: User description: "Lass uns das Feedback Formular bitte zusätzlich für die Spieler
öffnen." Read against the feedback intake as built (`docs/plans/feedback.md`,
`docs/plans/feedback-attachments.md`): the dialog is already open to every signed-in user, but
only for reporting an error. Submitting an idea is limited to staff and above, and only they see
the switch between "Fehler" and "Idee". The request is therefore understood as: players may
submit ideas too.

## Clarifications

### Session 2026-11-23

- Q: Who may submit ideas from now on: every signed-in user, or only players registered for or
  placed in the current season? → A: Every signed-in user, as for error reports.

## User Scenarios & Testing *(mandatory)*

The feedback dialog ("Feedback geben" in the user menu, "Feedback" in the footer) takes two kinds
of report: an error ("Etwas funktioniert nicht oder sieht falsch aus.") and an idea ("Ein
Vorschlag, was der Hub zusätzlich können sollte."). Since it was built, a player has only ever
seen the error form: no switch, no hint that ideas exist. A player with a suggestion either files
it as an error or takes it to Discord, where it arrives without the context the dialog captures.

This feature gives every signed-in user the dialog staff already have. Nothing else about the
intake changes: one stored report, then one thread in the feedback forum with its tag; no list of
ideas inside the hub.

### User Story 1 - A player submits an idea (Priority: P1)

A signed-in player opens the feedback dialog, sees the choice between "Fehler" and "Idee", picks
"Idee", writes a title and a description, optionally adds screenshots, and sends it. The idea
lands in the feedback forum as an idea, tagged as such, with the same context an error report
carries.

**Why this priority**: It is the feature.

**Independent Test**: Signed in as the player persona, open the dialog from the user menu and from
the footer, choose "Idee", submit, and find a stored idea report and (with the forum configured) a
thread titled "[Idee] …" that names the reporter with the role Spieler.

**Acceptance Scenarios**:

1. **Given** a signed-in player, **When** they open the feedback dialog from the user menu or the
   footer, **Then** the switch between "Fehler" and "Idee" is shown, with "Fehler" preselected.
2. **Given** a player who chose "Idee" and filled in a valid title and description, **When** they
   send it, **Then** the report is stored as an idea and the success state appears.
3. **Given** a configured feedback forum, **When** a player's idea is stored, **Then** a forum
   thread titled "[Idee] …" is created with the idea tag and the context block.
4. **Given** a player who leaves the switch on "Fehler", **When** they send the report, **Then**
   everything behaves as before this feature.

---

### User Story 2 - Staff are not affected (Priority: P2)

A staff member, admin or dev opens the dialog and finds it exactly as before: the same switch, the
same form, the same outcome.

**Why this priority**: The change removes a restriction; it must not cost those who already had
the full dialog anything.

**Independent Test**: Signed in as the staff persona, the dialog looks and behaves as before this
feature, for both kinds.

**Acceptance Scenarios**:

1. **Given** a signed-in staff member, **When** they open the dialog, **Then** it shows the switch
   and both kinds can be submitted, as before.

### Edge Cases

- A signed-out visitor: still sees no entry point and cannot submit either kind.
- The rate limit: five reports per user per hour, errors and ideas counted together. A player's
  sixth report within the hour is refused with the existing message, whatever its kind.
- A signed-in user who is not (or no longer) a member of the Discord server has the role Spieler
  and may submit ideas, as they may already report errors.
- A banned account (Banliste): the ban blocks season entry only; feedback of both kinds stays
  available.
- The forum sits on a server the player cannot open: the success state shows no thread link, as
  for error reports today. The player gets the thanks and nothing to follow.
- Discord is unreachable or the forum is not configured: the idea is stored anyway and the success
  state degrades as it does for errors, including the note about screenshots that did not arrive.
- Phone width: the two options stack, as they do for staff today.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every signed-in user MUST be able to submit an idea through the feedback dialog,
  regardless of role.
- **FR-002**: The dialog MUST show the switch between "Fehler" and "Idee" to every signed-in user,
  from both entry points, with "Fehler" preselected.
- **FR-003**: The server MUST accept an idea from a player; the role restriction on ideas is
  removed there as well as in the dialog.
- **FR-004**: A signed-out request MUST still be refused for both kinds, and signed-out visitors
  MUST still see no entry point.
- **FR-005**: The rate limit MUST stay as it is: five reports per user per hour, both kinds
  counted together.
- **FR-006**: An idea from a player MUST be handled exactly like one from staff: stored first,
  then one forum thread with the "[Idee]" title prefix, the idea tag, the context block (which
  names the reporter's role) and any screenshots.
- **FR-007**: The hub MUST still show no list of ideas or reports to anyone.
- **FR-008**: The copy of the dialog MUST stay as it is; no explanation is added for players.

### Key Entities

- **Feedback report**: unchanged. One stored report with its kind (error or idea), the reporter
  and their role at the time, and the forum thread it produced.

## UX & Mockups *(mandatory when users see a change)*

**Status**: Approved 2026-11-23

**Explanation level**: Flow page: the dialog guides. Its existing copy already does (the
description line, the two option texts, the placeholders that change with the kind), so nothing is
added for players.

| View | Route | Who sees it | Mockup file |
|------|-------|-------------|-------------|
| Feedback dialog | every page (user menu "Feedback geben", footer "Feedback") | Signed-in users, registered players and participants, staff, admins | [mockups/feedback-dialog.html](mockups/feedback-dialog.html) |

The mockup shows phone (390px) and desktop in light and dark, with a state switch: opened with
"Fehler" preselected, "Idee" chosen, an idea filled in, sent (no thread link, the forum sits on
the staff server), rate limit reached, and for comparison the dialog players had before.

**UX decisions**:

- Players get the dialog staff already have, unchanged: the same switch, description line,
  placeholders and success state. No new visual state.
- The variant without the switch disappears, and with it the description "Etwas funktioniert
  nicht? …"; every signed-in user reads "Melde einen Fehler oder schlage eine Idee vor. Beides
  landet direkt bei den Organisatoren."
- "Fehler" stays preselected.
- On a phone the two options stack, which makes the form about 160px taller for players than
  before; the body scrolls and "Absenden" stays pinned, as it does for staff today.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A player can submit an idea from any page in the same number of steps as staff: open
  the dialog, choose "Idee", fill in two fields, send.
- **SC-002**: Every one of the four roles can submit both kinds; no signed-in user is refused an
  idea for their role.
- **SC-003**: No user can file more than five reports of any kind within one hour.
- **SC-004**: For staff, admins and devs the dialog is indistinguishable from before this feature.

## Assumptions

- "Spieler" means every signed-in user (the role Spieler, which every account without a staff
  role has), not only those registered for or placed in the current season; confirmed by the
  maintainer on 2026-11-23. Error reports already work this way.
- The shared rate limit of five per hour is enough protection for the forum. Ideas need no cap of
  their own.
- The forum stays where it is. While it sits on the staff server, players cannot see or follow
  their thread; that is accepted, as it is for error reports. Moving the forum is a deployment
  decision, not part of this feature.
- No schema change and no change to the Discord messages: ideas, their title prefix and their tag
  already exist.
- `docs/plans/feedback.md` receives the backlink note when this ships, since its rule "Idee
  einreichen: staff" is superseded.
