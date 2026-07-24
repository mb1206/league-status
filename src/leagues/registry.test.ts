import { describe, expect, it } from "vitest";
import { LEAGUES, getLeagueModule, listLeagues } from "./registry";

describe("registry", () => {
  it("registers nba, wnba, nfl, mlb, nhl, mls, and epl", () => {
    expect(Object.keys(LEAGUES).sort()).toEqual([
      "epl",
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

  it("epl is a multi-competition soccer league with no playoffs and a primary competition", () => {
    const epl = getLeagueModule("epl");
    expect(epl.config.sport).toBe("soccer");
    expect(epl.config.league).toBe("eng.1");
    expect(epl.config.hasPlayoffs).toBe(false);
    const comps = epl.config.competitions;
    expect(comps).toBeDefined();
    const primary = comps!.filter((c) => c.primary);
    expect(primary).toHaveLength(1);
    expect(primary[0].slug).toBe("eng.1");
    expect(primary[0].shortName).toBe("PL");
    expect(comps).toHaveLength(8);
  });

  it("getLeagueModule returns the module with a working config", () => {
    const nba = getLeagueModule("nba");
    expect(nba.config.sport).toBe("basketball");
    expect(nba.config.icon).toBe("🏀");
    expect(typeof nba.adapter.fetchTeam).toBe("function");
    expect(typeof nba.adapter.fetchSchedule).toBe("function");
  });

  it("throws for an unknown league", () => {
    expect(() => getLeagueModule("cfl")).toThrow("Unknown league");
  });

  it("listLeagues returns configs for the picker", () => {
    expect(listLeagues().map((c) => c.id).sort()).toEqual([
      "epl",
      "mlb",
      "mls",
      "nba",
      "nfl",
      "nhl",
      "wnba",
    ]);
  });
});
