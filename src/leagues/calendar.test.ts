import { describe, expect, it } from "vitest";
import { toEntries } from "./calendar";
import type { Game, LeagueConfig, Team } from "../domain/types";

const nba: LeagueConfig = {
  id: "nba", sport: "basketball", league: "nba", displayName: "NBA", icon: "🏀", hasPlayoffs: true,
};
const team: Team = { id: "13", leagueId: "nba", name: "Los Angeles Lakers", abbreviation: "LAL" };
const game: Game = {
  id: "g1", date: "2026-10-15T02:30:00Z", status: "final", seasonType: "regular",
  isHome: true, result: "W",
  homeTeam: { id: "13", abbreviation: "LAL", score: 110 },
  awayTeam: { id: "2", abbreviation: "BOS", score: 99 },
};

describe("toEntries", () => {
  it("tags each game with its team and league", () => {
    const entries = toEntries(team, nba, [game]);
    expect(entries).toEqual([{ team, league: nba, game }]);
  });

  it("returns an empty array for no games", () => {
    expect(toEntries(team, nba, [])).toEqual([]);
  });
});
