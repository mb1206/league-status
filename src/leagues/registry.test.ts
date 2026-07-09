import { describe, expect, it } from "vitest";
import { LEAGUES, getLeagueModule, listLeagues } from "./registry";

describe("registry", () => {
  it("registers nba and nfl", () => {
    expect(Object.keys(LEAGUES).sort()).toEqual(["nba", "nfl"]);
  });

  it("getLeagueModule returns the module with a working config", () => {
    const nba = getLeagueModule("nba");
    expect(nba.config.sport).toBe("basketball");
    expect(nba.config.icon).toBe("🏀");
    expect(typeof nba.adapter.fetchTeam).toBe("function");
    expect(typeof nba.derivations.seasonStatus).toBe("function");
  });

  it("throws for an unknown league", () => {
    expect(() => getLeagueModule("mlb")).toThrow("Unknown league");
  });

  it("listLeagues returns configs for the picker", () => {
    expect(listLeagues().map((c) => c.id).sort()).toEqual(["nba", "nfl"]);
  });
});
