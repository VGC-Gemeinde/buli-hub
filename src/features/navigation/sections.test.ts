import { describe, expect, it } from "vitest";
import { activeHref, matchPageSection, sectionRow } from "./sections";

const labels = (groups: ReturnType<typeof sectionRow>) =>
  groups?.map((group) => group.entries.map((entry) => entry.label)) ?? null;

describe("sectionRow", () => {
  it("gives the Liga its pages while a season runs, Favoriten for everyone", () => {
    expect(
      labels(sectionRow("liga", { phase: "regular_season", role: null })),
    ).toEqual([["Übersicht", "Spielplan", "Favoriten"]]);
    expect(
      sectionRow("liga", { phase: "schedule_hidden", role: "staff" }),
    ).toBeNull();
  });

  it("gives the Spieler-Dashboard its overview, plus the registration when it matters", () => {
    expect(
      labels(
        sectionRow("spieler", { phase: "regular_season", role: "player" }),
      ),
    ).toEqual([["Übersicht"]]);
    expect(
      labels(
        sectionRow("spieler", {
          phase: "registration_open",
          role: "player",
          registrationRelevant: true,
        }),
      ),
    ).toEqual([["Übersicht", "Anmeldung"]]);
  });

  it("uses the staff groups for the Staff-Bereich", () => {
    expect(
      labels(sectionRow("staff", { phase: "regular_season", role: "admin" })),
    ).toEqual([
      ["Übersicht"],
      ["Woche", "Aufnahmen"],
      ["Teilnehmer", "Divisionen", "Spielplan", "Match of the Week"],
      ["Banliste", "Nutzung"],
    ]);
    expect(
      sectionRow("staff", { phase: "regular_season", role: null }),
    ).toBeNull();
  });
});

describe("activeHref", () => {
  const liga =
    sectionRow("liga", { phase: "regular_season", role: null }) ?? [];
  const staff =
    sectionRow("staff", { phase: "regular_season", role: "staff" }) ?? [];

  it("marks a section root only on itself", () => {
    expect(activeHref(liga, "/")).toBe("/");
    expect(activeHref(liga, "/spieler/abc")).toBeNull();
    expect(activeHref(staff, "/staff")).toBe("/staff");
    expect(activeHref(staff, "/staff/woche")).toBe("/staff/woche");
  });

  it("marks the dashboard only on itself, not on a player's profile", () => {
    const spieler =
      sectionRow("spieler", { phase: "regular_season", role: null }) ?? [];
    expect(activeHref(spieler, "/spieler")).toBe("/spieler");
    expect(activeHref(spieler, "/spieler/abc")).toBeNull();
  });

  it("marks nothing on a detail page", () => {
    expect(activeHref(liga, "/match/abc")).toBeNull();
    expect(activeHref(staff, "/match/abc")).toBeNull();
    expect(activeHref(staff, "/staff/wochenende")).toBeNull();
  });

  it("tells the public and the staff Spielplan apart", () => {
    expect(activeHref(liga, "/spielplan")).toBe("/spielplan");
    expect(activeHref(staff, "/spielplan")).toBeNull();
    expect(activeHref(staff, "/staff/spielplan")).toBe("/staff/spielplan");
  });

  it("marks Favoriten on its page", () => {
    expect(activeHref(liga, "/favoriten")).toBe("/favoriten");
  });
});

describe("matchPageSection", () => {
  it("follows where the viewer comes from", () => {
    expect(matchPageSection({ isParticipant: true, isStaff: true })).toBe(
      "spieler",
    );
    expect(matchPageSection({ isParticipant: false, isStaff: true })).toBe(
      "staff",
    );
    expect(matchPageSection({ isParticipant: false, isStaff: false })).toBe(
      "liga",
    );
  });
});
