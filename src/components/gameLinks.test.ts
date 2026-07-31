import { describe, expect, it } from "vitest";
import { gameLinks } from "./gameLinks";
import type { Game, LeagueConfig, Team } from "../domain/types";

const nba: LeagueConfig = {
  id: "nba", sport: "basketball", league: "nba", displayName: "NBA", icon: "🏀", hasPlayoffs: true,
};
const team: Team = { id: "13", leagueId: "nba", name: "Los Angeles Lakers", abbreviation: "LAL" };
const base = {
  seasonType: "regular" as const, isHome: true,
  homeTeam: { id: "13", abbreviation: "LAL" }, awayTeam: { id: "2", abbreviation: "BOS" },
};
const upcoming: Game = { ...base, id: "u", date: "2026-10-21T02:30:00Z", status: "scheduled" };
const final: Game = { ...base, id: "f", date: "2026-04-01T02:30:00Z", status: "final", result: "W" };

describe("gameLinks", () => {
  it("returns youtube + reddit and no '+' without a league", () => {
    const kinds = gameLinks(team, upcoming).map((c) => c.kind);
    expect(kinds).toEqual(["youtube", "reddit"]);
  });

  it("adds an '+' ics chip for an upcoming game when a league is given", () => {
    const chips = gameLinks(team, upcoming, nba);
    expect(chips.map((c) => c.kind)).toEqual(["youtube", "reddit", "ics"]);
    const ics = chips.find((c) => c.kind === "ics")!;
    expect(ics.onClick).toBeTypeOf("function");
    expect(ics.label).toContain("calendar");
  });

  it("never adds a '+' for a final game, even with a league", () => {
    expect(gameLinks(team, final, nba).map((c) => c.kind)).toEqual(["youtube", "reddit"]);
  });
});
