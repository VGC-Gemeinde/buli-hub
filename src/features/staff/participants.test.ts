import { describe, expect, it } from "vitest";
import {
  filterCounts,
  matchesFilter,
  type ParticipantFacts,
  participantTags,
} from "./participants";

const member: ParticipantFacts = {
  guildMember: true,
  groupName: "Division 1a",
  dropped: false,
  replacement: null,
};

describe("participantTags", () => {
  it("tags nothing for an ordinary member", () => {
    expect(participantTags(member)).toEqual([]);
  });

  it("names membership problems", () => {
    expect(participantTags({ ...member, guildMember: false })).toEqual([
      { label: "Nicht auf dem Server", tone: "problem" },
    ]);
    expect(participantTags({ ...member, guildMember: null })[0]).toMatchObject({
      label: "Nicht geprüft",
      tone: "muted",
    });
  });

  it("names drops and both sides of a replacement", () => {
    expect(
      participantTags({
        ...member,
        dropped: true,
        replacement: { kind: "replaced", otherName: "Ni2" },
      }).map((tag) => tag.label),
    ).toEqual(["Drop", "Ersetzt"]);
    expect(
      participantTags({
        ...member,
        replacement: { kind: "replacing", otherName: "Anton" },
      }),
    ).toEqual([
      { label: "Ersatz", tone: "neutral", title: "Ersatz für Anton" },
    ]);
    expect(
      participantTags({
        ...member,
        dropped: true,
        replacement: { kind: "offered", otherName: "Ari" },
      }).map((tag) => tag.label),
    ).toEqual(["Drop", "Ersatz angefragt"]);
  });
});

describe("filters", () => {
  const rows: ParticipantFacts[] = [
    member,
    { ...member, guildMember: false },
    { ...member, guildMember: false, dropped: true },
    { ...member, guildMember: null },
    { ...member, dropped: true },
  ];

  it("leaves dropped players out of the membership filters", () => {
    expect(matchesFilter(rows[1], "not_on_server")).toBe(true);
    expect(matchesFilter(rows[2], "not_on_server")).toBe(false);
  });

  it("counts every filter", () => {
    expect(filterCounts(rows)).toEqual({
      all: 5,
      not_on_server: 1,
      unchecked: 1,
      dropped: 2,
    });
  });
});
