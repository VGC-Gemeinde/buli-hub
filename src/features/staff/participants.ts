// The Teilnehmer page (docs/plans/staff-dashboard.md): everyone registered in
// the season as one list. Registration, Discord membership, placement, drop
// and replacement are all "who is in, and in what state", so one pure
// function turns the facts into the tags a row shows and the filters it
// falls under.

export type ParticipantFacts = {
  // profiles.guild_member: null = never checked, false = confirmed gone.
  guildMember: boolean | null;
  // The group, once placed.
  groupName: string | null;
  dropped: boolean;
  // Either side of an accepted replacement, or an offer still open for the
  // player's dropped slot.
  replacement: {
    kind: "replacing" | "replaced" | "offered";
    otherName: string;
  } | null;
};

export type ParticipantFilter =
  | "all"
  | "not_on_server"
  | "unchecked"
  | "dropped";

export type ParticipantTag = {
  label: string;
  tone: "problem" | "muted" | "neutral";
  title?: string;
};

export function participantTags(facts: ParticipantFacts): ParticipantTag[] {
  const tags: ParticipantTag[] = [];
  if (facts.guildMember === false) {
    tags.push({ label: "Nicht auf dem Server", tone: "problem" });
  } else if (facts.guildMember === null) {
    tags.push({
      label: "Nicht geprüft",
      tone: "muted",
      title:
        "Die Mitgliedschaft auf dem Discord-Server wurde noch nie geprüft, meist fehlt die Discord-ID.",
    });
  }
  if (facts.dropped) {
    tags.push({ label: "Drop", tone: "problem" });
  }
  if (facts.replacement?.kind === "replacing") {
    tags.push({
      label: "Ersatz",
      tone: "neutral",
      title: `Ersatz für ${facts.replacement.otherName}`,
    });
  }
  if (facts.replacement?.kind === "replaced") {
    tags.push({
      label: "Ersetzt",
      tone: "muted",
      title: `Ersetzt durch ${facts.replacement.otherName}`,
    });
  }
  if (facts.replacement?.kind === "offered") {
    tags.push({
      label: "Ersatz angefragt",
      tone: "muted",
      title: `Angebot an ${facts.replacement.otherName}`,
    });
  }
  return tags;
}

export function matchesFilter(
  facts: ParticipantFacts,
  filter: ParticipantFilter,
): boolean {
  switch (filter) {
    case "all":
      return true;
    case "not_on_server":
      // A dropped player who left is nothing to clarify any more, the same
      // rule as the membership warning (docs/plans/discord-membership.md).
      return facts.guildMember === false && !facts.dropped;
    case "unchecked":
      return facts.guildMember === null && !facts.dropped;
    case "dropped":
      return facts.dropped;
  }
}

export function filterCounts(
  rows: readonly ParticipantFacts[],
): Record<ParticipantFilter, number> {
  const filters: ParticipantFilter[] = [
    "all",
    "not_on_server",
    "unchecked",
    "dropped",
  ];
  return Object.fromEntries(
    filters.map((filter) => [
      filter,
      rows.filter((row) => matchesFilter(row, filter)).length,
    ]),
  ) as Record<ParticipantFilter, number>;
}
