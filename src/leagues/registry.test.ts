import { describe, expect, it } from "vitest";
import { LEAGUES, getLeagueModule, listLeagues } from "./registry";

describe("registry", () => {
  it("registers nba, wnba, nfl, and mlb", () => {
    expect(Object.keys(LEAGUES).sort()).toEqual(["mlb", "nba", "nfl", "wnba"]);
  });

  it("mlb is a config-only add on the ESPN baseball adapter", () => {
    const mlb = getLeagueModule("mlb");
    expect(mlb.config.sport).toBe("baseball");
    expect(mlb.config.league).toBe("mlb");
    expect(mlb.config.icon).toBe("⚾");
    expect(typeof mlb.adapter.fetchSchedule).toBe("function");
  });

  it("wnba shares the ESPN basketball adapter + base derivations (config-only add)", () => {
    const wnba = getLeagueModule("wnba");
    expect(wnba.config.sport).toBe("basketball");
    expect(wnba.config.league).toBe("wnba");
    expect(typeof wnba.adapter.fetchSchedule).toBe("function");
  });

  it("getLeagueModule returns the module with a working config", () => {
    const nba = getLeagueModule("nba");
    expect(nba.config.sport).toBe("basketball");
    expect(nba.config.icon).toBe("🏀");
    expect(typeof nba.adapter.fetchTeam).toBe("function");
    expect(typeof nba.derivations.seasonStatus).toBe("function");
  });

  it("throws for an unknown league", () => {
    expect(() => getLeagueModule("nhl")).toThrow("Unknown league");
  });

  it("listLeagues returns configs for the picker", () => {
    expect(listLeagues().map((c) => c.id).sort()).toEqual(["mlb", "nba", "nfl", "wnba"]);
  });
});
