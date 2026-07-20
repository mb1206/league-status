import { describe, expect, it } from "vitest";
import { byInSeasonFirst, collectInSeasonLeagues } from "./useInSeasonLeagues";
import type { TeamStatus } from "../domain/types";

function status(leagueId: string, phase: TeamStatus["seasonStatus"]["phase"]): TeamStatus {
  return {
    team: { id: "1", leagueId, name: "T", abbreviation: "T" },
    league: { id: leagueId, sport: "x", league: leagueId, displayName: leagueId, icon: "•", hasPlayoffs: true },
    standing: { overall: "0-0" },
    seasonStatus: { phase, label: "" },
    pastGames: [],
    upcomingGames: [],
  };
}

describe("collectInSeasonLeagues", () => {
  it("includes leagues with any non-offseason team", () => {
    const set = collectInSeasonLeagues([
      status("nba", "in_season"),
      status("nfl", "offseason"),
      status("mlb", "playoffs"),
    ]);
    expect([...set].sort()).toEqual(["mlb", "nba"]);
  });

  it("treats a league as in-season if at least one of its teams is", () => {
    const set = collectInSeasonLeagues([
      status("nba", "offseason"),
      status("nba", "playoffs_upcoming"),
    ]);
    expect(set.has("nba")).toBe(true);
  });

  it("ignores undefined (still-loading) statuses", () => {
    const set = collectInSeasonLeagues([undefined, status("nba", "in_season")]);
    expect([...set]).toEqual(["nba"]);
  });
});

describe("byInSeasonFirst", () => {
  it("sorts in-season items before out-of-season ones", () => {
    const inSeason = new Set(["nba", "mlb"]);
    const items = [{ id: "nfl" }, { id: "nba" }, { id: "nhl" }, { id: "mlb" }];
    const ordered = [...items].sort(byInSeasonFirst(inSeason, (c) => c.id));
    expect(ordered.map((c) => c.id)).toEqual(["nba", "mlb", "nfl", "nhl"]);
  });

  it("is stable among same-state items and works with a leagueId key", () => {
    const inSeason = new Set(["nba"]);
    const items = [
      { leagueId: "nfl", teamId: "a" },
      { leagueId: "nba", teamId: "b" },
      { leagueId: "nfl", teamId: "c" },
      { leagueId: "nba", teamId: "d" },
    ];
    const ordered = [...items].sort(byInSeasonFirst(inSeason, (t) => t.leagueId));
    // in-season first, original relative order preserved within each group
    expect(ordered.map((t) => t.teamId)).toEqual(["b", "d", "a", "c"]);
  });
});
