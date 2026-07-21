import { describe, expect, it } from "vitest";
import { CLUBS, MATCH_SITUATIONS, NARRATIVE_ARCS, STORY_EVENTS, validateContent } from "./index";

describe("content pack", () => {
  it("contains the complete V1 world", () => {
    expect(validateContent()).toEqual({ clubs: 144, events: 120, arcs: 16, situations: 40 });
    for (const country of ["FR", "EN", "ES", "IT", "DE", "BR"]) {
      expect(CLUBS.filter((club) => club.country === country && club.division === 1)).toHaveLength(12);
      expect(CLUBS.filter((club) => club.country === country && club.division === 2)).toHaveLength(12);
    }
  });

  it("keeps French and English in strict parity", () => {
    for (const event of STORY_EVENTS) {
      expect(event.title.fr.trim()).not.toBe("");
      expect(event.title.en.trim()).not.toBe("");
      expect(event.body.fr.trim()).not.toBe("");
      expect(event.body.en.trim()).not.toBe("");
      for (const choice of event.choices) {
        expect(choice.label.fr.trim()).not.toBe("");
        expect(choice.label.en.trim()).not.toBe("");
      }
    }
    for (const arc of NARRATIVE_ARCS) expect(arc.chapters.every((chapter) => chapter.fr && chapter.en)).toBe(true);
    for (const situation of MATCH_SITUATIONS) expect(situation.objective.fr && situation.objective.en).toBeTruthy();
  });

  it("provides eight situations for each gameplay family", () => {
    for (const family of ["finisher", "creator", "support", "defender", "keeper"]) {
      expect(MATCH_SITUATIONS.filter((item) => item.family === family)).toHaveLength(8);
    }
  });
});
