import { describe, expect, it } from "vitest";
import {
  ALL_REGELWERK_DOCUMENTS,
  regelwerkForSeason,
} from "@/features/regelwerk/content";

describe("regelwerkForSeason", () => {
  it("serves the season it was written for", () => {
    expect(regelwerkForSeason(9)?.seasonNumber).toBe(9);
  });

  // The whole point of the lookup: a season with no published ruleset must not
  // silently fall back to the previous one.
  it("returns null for a season without a document", () => {
    expect(regelwerkForSeason(10)).toBeNull();
    expect(regelwerkForSeason(1)).toBeNull();
  });

  it("has at most one document per season", () => {
    const seasons = ALL_REGELWERK_DOCUMENTS.map((d) => d.seasonNumber);

    expect(new Set(seasons).size).toBe(seasons.length);
  });
});

// The chapter list, the anchors and the scroll-spy all key off `chapter.id`.
// A duplicate or a missing one is a dangling link in a document players are
// told to read, so it is worth a test rather than a review.
describe.each(ALL_REGELWERK_DOCUMENTS.map((d) => [d.seasonNumber, d] as const))(
  "Regelwerk Saison %i",
  (_season, document) => {
    it("has unique, non-empty chapter anchors", () => {
      const ids = document.chapters.map((chapter) => chapter.id);

      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) {
        expect(id).toMatch(/^[a-z][a-z0-9-]*$/);
      }
    });

    it("numbers its chapters 1..n in order", () => {
      expect(document.chapters.map((chapter) => chapter.number)).toEqual(
        document.chapters.map((_chapter, index) => index + 1),
      );
    });

    it("gives every chapter a title and at least one section", () => {
      for (const chapter of document.chapters) {
        expect(chapter.title.length).toBeGreaterThan(0);
        expect(chapter.sections.length).toBeGreaterThan(0);
      }
    });

    it("has unique section titles within a chapter", () => {
      for (const chapter of document.chapters) {
        const titles = chapter.sections.map((section) => section.title);

        expect(new Set(titles).size).toBe(titles.length);
      }
    });

    // Six tiles is a `grid-cols-3` that fills exactly two rows; a seventh would
    // leave a hole, and the emphasis is the anchor date, so it must exist.
    it("has six facts with exactly one emphasised", () => {
      expect(document.facts).toHaveLength(6);
      expect(document.emphasisIndex).toBeGreaterThanOrEqual(0);
      expect(document.emphasisIndex).toBeLessThan(document.facts.length);
    });
  },
);
