import { describe, expect, it } from "vitest";
import {
  selectGames,
  seasonProgress,
  seasonStatus,
  splitGames,
  standingSummary,
  PLAYOFF_COUNTDOWN_WEEKS,
  OFFSEASON_GAP_WEEKS,
} from "./baseDerivations";
import type { Game } from "../domain/types";

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
      standingSummary({
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
  it("returns all past (most-recent first) and all upcoming (soonest first), uncapped", () => {
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
    const { past, upcoming } = splitGames(games, NOW);
    expect(past.map((g) => g.id)).toEqual(["p2", "p1", "p3", "p4"]);
    expect(upcoming.map((g) => g.id)).toEqual(["u2", "u1", "u3", "u4"]);
  });
});

describe("selectGames", () => {
  const games = [
    game({ id: "a", isHome: true }),
    game({ id: "b", isHome: false }),
    game({ id: "c", isHome: true }),
    game({ id: "d", isHome: false }),
    game({ id: "e", isHome: true }),
  ];

  it("caps to the limit, preserving order", () => {
    expect(
      selectGames(games, { homeOnly: false, limit: 3 }).map((g) => g.id),
    ).toEqual(["a", "b", "c"]);
  });

  it("keeps only home games before capping when homeOnly is set", () => {
    expect(
      selectGames(games, { homeOnly: true, limit: 3 }).map((g) => g.id),
    ).toEqual(["a", "c", "e"]);
  });

  it("returns fewer than the limit when not enough home games exist", () => {
    const twoHome = [game({ id: "a", isHome: true }), game({ id: "b", isHome: false })];
    expect(
      selectGames(twoHome, { homeOnly: true, limit: 3 }).map((g) => g.id),
    ).toEqual(["a"]);
  });
});

describe("seasonProgress", () => {
  it("computes played/total/percent and the season end date from regular games", () => {
    const games = [
      game({ id: "a", seasonType: "regular", status: "final", date: daysFromNow(-10) }),
      game({ id: "b", seasonType: "regular", status: "final", date: daysFromNow(-5) }),
      game({ id: "c", seasonType: "regular", status: "scheduled", date: daysFromNow(5) }),
      game({ id: "d", seasonType: "regular", status: "scheduled", date: daysFromNow(20) }),
      game({ id: "pre", seasonType: "preseason", status: "final", date: daysFromNow(-30) }),
    ];
    expect(seasonProgress(games)).toEqual({
      played: 2,
      total: 4,
      percent: 50,
      endDate: daysFromNow(20),
    });
  });

  it("returns undefined when there are no regular-season games", () => {
    expect(seasonProgress([game({ seasonType: "preseason" })])).toBeUndefined();
  });

  it("counts only primary-competition games when games are competition-tagged", () => {
    const pl = (primary: boolean) => ({
      shortName: primary ? "PL" : "UCL",
      name: primary ? "Premier League" : "UEFA Champions League",
      primary,
    });
    const games = [
      // Two league games (one played), plus a cup game that must NOT be counted.
      game({ id: "l1", status: "final", date: daysFromNow(-10), competition: pl(true) }),
      game({ id: "l2", status: "scheduled", date: daysFromNow(20), competition: pl(true) }),
      game({ id: "cup", status: "final", date: daysFromNow(-5), competition: pl(false) }),
    ];
    expect(seasonProgress(games)).toEqual({
      played: 1,
      total: 2,
      percent: 50,
      endDate: daysFromNow(20),
    });
  });
});

describe("seasonStatus", () => {
  it("attaches season progress when in season", () => {
    const games = [
      game({ seasonType: "regular", status: "final", date: daysFromNow(-5) }),
      game({ seasonType: "regular", status: "scheduled", date: daysFromNow(2) }),
    ];
    const s = seasonStatus({ games, now: NOW });
    expect(s.phase).toBe("in_season");
    expect(s.progress).toEqual({
      played: 1,
      total: 2,
      percent: 50,
      endDate: daysFromNow(2),
    });
  });

  it("OFF_SEASON when there are no future games", () => {
    const games = [game({ date: daysFromNow(-3), status: "final" })];
    expect(seasonStatus({ games, now: NOW }).phase).toBe("offseason");
  });

  it("OFF_SEASON when the next game is beyond the gap (next season already scheduled, e.g. NFL in July)", () => {
    const games = [
      game({ date: daysFromNow(66), seasonType: "regular" }), // ~9.4 weeks out
      game({ date: daysFromNow(73), seasonType: "regular" }),
    ];
    expect(seasonStatus({ games, now: NOW }).phase).toBe("offseason");
  });

  it("IN_SEASON when the next game is within the gap (e.g. a bye/break)", () => {
    const games = [game({ date: daysFromNow(20), seasonType: "regular" })];
    expect(seasonStatus({ games, now: NOW }).phase).toBe("in_season");
  });

  it("offseason gap boundary: exactly the gap is in-season, one week beyond is offseason", () => {
    const atGap = [
      game({ date: daysFromNow(7 * OFFSEASON_GAP_WEEKS), seasonType: "regular" }),
    ];
    expect(seasonStatus({ games: atGap, now: NOW }).phase).toBe("in_season");
    const beyond = [
      game({ date: daysFromNow(7 * (OFFSEASON_GAP_WEEKS + 1)), seasonType: "regular" }),
    ];
    expect(seasonStatus({ games: beyond, now: NOW }).phase).toBe("offseason");
  });

  it("IN_SEASON when next game is regular and playoffs not near", () => {
    const games = [game({ date: daysFromNow(2), seasonType: "regular" })];
    const s = seasonStatus({ games, now: NOW });
    expect(s.phase).toBe("in_season");
    expect(s.label).toBe("IN SEASON");
  });

  it("PLAYOFFS when the next game is postseason", () => {
    const games = [game({ date: daysFromNow(1), seasonType: "postseason" })];
    expect(seasonStatus({ games, now: NOW }).label).toBe("PLAYOFFS");
  });

  it("PLAYOFFS_UPCOMING with weeks when a postseason game is within the cap", () => {
    const games = [
      game({ id: "r", date: daysFromNow(2), seasonType: "regular" }),
      game({ id: "p", date: daysFromNow(21), seasonType: "postseason" }),
    ];
    const s = seasonStatus({ games, now: NOW });
    expect(s.phase).toBe("playoffs_upcoming");
    expect(s.weeksUntilPlayoffs).toBe(3);
    expect(s.label).toBe("PLAYOFFS IN 3 WEEKS");
  });

  it("boundary: exactly 10 weeks shows countdown, 11 weeks does not", () => {
    const at10 = [
      game({ date: daysFromNow(2), seasonType: "regular" }),
      game({ date: daysFromNow(7 * PLAYOFF_COUNTDOWN_WEEKS), seasonType: "postseason" }),
    ];
    expect(seasonStatus({ games: at10, now: NOW }).phase).toBe(
      "playoffs_upcoming",
    );
    const at11 = [
      game({ date: daysFromNow(2), seasonType: "regular" }),
      game({ date: daysFromNow(7 * (PLAYOFF_COUNTDOWN_WEEKS + 1)), seasonType: "postseason" }),
    ];
    expect(seasonStatus({ games: at11, now: NOW }).phase).toBe("in_season");
  });

  it("singular week label for 1 week out", () => {
    const games = [
      game({ date: daysFromNow(2), seasonType: "regular" }),
      game({ date: daysFromNow(5), seasonType: "postseason" }),
    ];
    expect(seasonStatus({ games, now: NOW }).label).toBe(
      "PLAYOFFS IN 1 WEEK",
    );
  });
});
