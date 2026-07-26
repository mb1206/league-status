import { describe, expect, it } from "vitest";
import { seasonWindow, monthlyChunks, currentSoccerSeasonYear } from "./seasonWindow";

describe("seasonWindow", () => {
  it("spans Aug 1 of the year to Jun 30 of the next", () => {
    expect(seasonWindow(2026)).toEqual({ start: "20260801", end: "20270630" });
  });
});

describe("monthlyChunks", () => {
  it("splits a full season into 11 per-month inclusive ranges", () => {
    const chunks = monthlyChunks("20260801", "20270630");
    expect(chunks).toHaveLength(11);
    expect(chunks[0]).toEqual({ start: "20260801", end: "20260831" });
    expect(chunks[1]).toEqual({ start: "20260901", end: "20260930" });
    expect(chunks[chunks.length - 1]).toEqual({ start: "20270601", end: "20270630" });
  });

  it("handles a range that starts and ends mid-month", () => {
    const chunks = monthlyChunks("20260815", "20260910");
    expect(chunks).toEqual([
      { start: "20260815", end: "20260831" },
      { start: "20260901", end: "20260910" },
    ]);
  });
});

describe("currentSoccerSeasonYear", () => {
  it("returns the current year in the second half of the calendar", () => {
    expect(currentSoccerSeasonYear(new Date("2026-07-26T00:00:00Z"))).toBe(2026);
    expect(currentSoccerSeasonYear(new Date("2026-11-01T00:00:00Z"))).toBe(2026);
  });
  it("returns the prior year in the first half of the calendar", () => {
    expect(currentSoccerSeasonYear(new Date("2027-03-01T00:00:00Z"))).toBe(2026);
  });
});
