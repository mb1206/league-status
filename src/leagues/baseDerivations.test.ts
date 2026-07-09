import { describe, expect, it } from "vitest";
import {
  createBaseDerivations,
  PLAYOFF_COUNTDOWN_WEEKS,
  OFFSEASON_GAP_WEEKS,
} from "./baseDerivations";
import type { Game } from "../domain/types";

const d = createBaseDerivations();
const NOW = new Date("2026-01-15T00:00:00Z");

function game(partial: Partial<Game>): Game {
  return {
    id: "x",
    date: "2026-01-10T00:00:00Z",
    status: "scheduled",
    seasonType: "regular",
    isHome: true,
    homeTeam: { id: "13", abbreviation: "LAL" },
    awayTeam: { id: "2", abbreviation: "BOS" },
    ...partial,
  };
}

function daysFromNow(n: number): string {
  return new Date(NOW.getTime() + n * 86400000).toISOString();
}

describe("standingSummary", () => {
  it("combines record and parsed standing text", () => {
    expect(
      d.standingSummary({
        recordSummary: "53-29",
        standingSummaryText: "1st in Pacific Division",
      }),
    ).toEqual({
      overall: "53-29",
      summary: "1st in Pacific Division",
      divisionRank: 1,
      divisionName: "Pacific",
    });
  });
});

describe("splitGames", () => {
  it("returns most-recent past (desc) and soonest upcoming (asc), max 3 each", () => {
    const games = [
      game({ id: "p1", date: daysFromNow(-5), status: "final" }),
      game({ id: "p2", date: daysFromNow(-1), status: "final" }),
      game({ id: "p3", date: daysFromNow(-10), status: "final" }),
      game({ id: "p4", date: daysFromNow(-20), status: "final" }),
      game({ id: "u1", date: daysFromNow(2) }),
      game({ id: "u2", date: daysFromNow(1) }),
      game({ id: "u3", date: daysFromNow(9) }),
      game({ id: "u4", date: daysFromNow(20) }),
    ];
    const { past, upcoming } = d.splitGames(games, NOW);
    expect(past.map((g) => g.id)).toEqual(["p2", "p1", "p3"]);
    expect(upcoming.map((g) => g.id)).toEqual(["u2", "u1", "u3"]);
  });
});

describe("seasonStatus", () => {
  it("OFF_SEASON when there are no future games", () => {
    const games = [game({ date: daysFromNow(-3), status: "final" })];
    expect(d.seasonStatus({ games, now: NOW }).phase).toBe("offseason");
  });

  it("OFF_SEASON when the next game is beyond the gap (next season already scheduled, e.g. NFL in July)", () => {
    const games = [
      game({ date: daysFromNow(66), seasonType: "regular" }), // ~9.4 weeks out
      game({ date: daysFromNow(73), seasonType: "regular" }),
    ];
    expect(d.seasonStatus({ games, now: NOW }).phase).toBe("offseason");
  });

  it("IN_SEASON when the next game is within the gap (e.g. a bye/break)", () => {
    const games = [game({ date: daysFromNow(20), seasonType: "regular" })];
    expect(d.seasonStatus({ games, now: NOW }).phase).toBe("in_season");
  });

  it("offseason gap boundary: exactly the gap is in-season, one week beyond is offseason", () => {
    const atGap = [
      game({ date: daysFromNow(7 * OFFSEASON_GAP_WEEKS), seasonType: "regular" }),
    ];
    expect(d.seasonStatus({ games: atGap, now: NOW }).phase).toBe("in_season");
    const beyond = [
      game({ date: daysFromNow(7 * (OFFSEASON_GAP_WEEKS + 1)), seasonType: "regular" }),
    ];
    expect(d.seasonStatus({ games: beyond, now: NOW }).phase).toBe("offseason");
  });

  it("IN_SEASON when next game is regular and playoffs not near", () => {
    const games = [game({ date: daysFromNow(2), seasonType: "regular" })];
    const s = d.seasonStatus({ games, now: NOW });
    expect(s.phase).toBe("in_season");
    expect(s.label).toBe("IN SEASON");
  });

  it("PLAYOFFS when the next game is postseason", () => {
    const games = [game({ date: daysFromNow(1), seasonType: "postseason" })];
    expect(d.seasonStatus({ games, now: NOW }).label).toBe("PLAYOFFS");
  });

  it("PLAYOFFS_UPCOMING with weeks when a postseason game is within the cap", () => {
    const games = [
      game({ id: "r", date: daysFromNow(2), seasonType: "regular" }),
      game({ id: "p", date: daysFromNow(21), seasonType: "postseason" }),
    ];
    const s = d.seasonStatus({ games, now: NOW });
    expect(s.phase).toBe("playoffs_upcoming");
    expect(s.weeksUntilPlayoffs).toBe(3);
    expect(s.label).toBe("PLAYOFFS IN 3 WEEKS");
  });

  it("boundary: exactly 10 weeks shows countdown, 11 weeks does not", () => {
    const at10 = [
      game({ date: daysFromNow(2), seasonType: "regular" }),
      game({ date: daysFromNow(7 * PLAYOFF_COUNTDOWN_WEEKS), seasonType: "postseason" }),
    ];
    expect(d.seasonStatus({ games: at10, now: NOW }).phase).toBe(
      "playoffs_upcoming",
    );
    const at11 = [
      game({ date: daysFromNow(2), seasonType: "regular" }),
      game({ date: daysFromNow(7 * (PLAYOFF_COUNTDOWN_WEEKS + 1)), seasonType: "postseason" }),
    ];
    expect(d.seasonStatus({ games: at11, now: NOW }).phase).toBe("in_season");
  });

  it("singular week label for 1 week out", () => {
    const games = [
      game({ date: daysFromNow(2), seasonType: "regular" }),
      game({ date: daysFromNow(5), seasonType: "postseason" }),
    ];
    expect(d.seasonStatus({ games, now: NOW }).label).toBe(
      "PLAYOFFS IN 1 WEEK",
    );
  });
});
