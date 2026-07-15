import { describe, expect, it } from "vitest";
import { LEAGUES, getLeagueModule, listLeagues } from "./registry";

describe("registry", () => {
  it("registers nba, wnba, nfl, mlb, nhl, and mls", () => {
    expect(Object.keys(LEAGUES).sort()).toEqual([
      "mlb",
      "mls",
      "nba",
      "nfl",
      "nhl",
      "wnba",
    ]);
  });

  it("mlb is a config-only add on the ESPN baseball adapter", () => {
    const mlb = getLeagueModule("mlb");
    expect(mlb.config.sport).toBe("baseball");
    expect(mlb.config.league).toBe("mlb");
    expect(mlb.config.icon).toBe("⚾");
    expect(typeof mlb.adapter.fetchSchedule).toBe("function");
  });

  it("nhl and mls are config-only adds on their ESPN sport adapters", () => {
    const nhl = getLeagueModule("nhl");
    expect(nhl.config.sport).toBe("hockey");
    expect(nhl.config.league).toBe("nhl");
    const mls = getLeagueModule("mls");
    expect(mls.config.sport).toBe("soccer");
    expect(mls.config.league).toBe("usa.1");
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
    expect(() => getLeagueModule("cfl")).toThrow("Unknown league");
  });

  it("listLeagues returns configs for the picker", () => {
    expect(listLeagues().map((c) => c.id).sort()).toEqual([
      "mlb",
      "mls",
      "nba",
      "nfl",
      "nhl",
      "wnba",
    ]);
  });
});
