import { describe, expect, it } from "vitest";
import { buildWeek, type WeekEntry } from "./upcomingWeek";
import type { Game, LeagueConfig, Team } from "../domain/types";

const lakers: Team = { id: "13", leagueId: "nba", name: "Los Angeles Lakers", abbreviation: "LAL" };
const nba: LeagueConfig = { id: "nba", sport: "basketball", league: "nba", displayName: "NBA", icon: "🏀", hasPlayoffs: true };

function game(over: Partial<Game> = {}): Game {
  return {
    id: "g",
    date: "2026-07-25T23:30:00Z",
    status: "scheduled",
    seasonType: "regular",
    isHome: true,
    homeTeam: { id: "13", abbreviation: "LAL" },
    awayTeam: { id: "2", abbreviation: "GSW" },
    ...over,
  };
}

function entry(upcomingGames: Game[]): WeekEntry {
  return { team: lakers, league: nba, upcomingGames };
}

// Fixed "now": Sat Jul 25 2026, local midday.
const now = new Date(2026, 6, 25, 12, 0, 0);

describe("buildWeek", () => {
  it("includes a game today and excludes games outside the 7-day window", () => {
    const groups = buildWeek(
      [
        entry([
          game({ id: "today", date: new Date(2026, 6, 25, 19, 0).toISOString() }),
          game({ id: "in6", date: new Date(2026, 6, 31, 19, 0).toISOString() }),
          game({ id: "in8", date: new Date(2026, 7, 2, 19, 0).toISOString() }), // > 7 days
          game({ id: "past", date: new Date(2026, 6, 24, 19, 0).toISOString() }), // before window
        ]),
      ],
      now,
    );
    const ids = groups.flatMap((g) => g.games.map((wg) => wg.date));
    expect(ids).toContain(new Date(2026, 6, 25, 19, 0).toISOString());
    expect(ids).toContain(new Date(2026, 6, 31, 19, 0).toISOString());
    expect(ids).not.toContain(new Date(2026, 7, 2, 19, 0).toISOString());
    expect(ids).not.toContain(new Date(2026, 6, 24, 19, 0).toISOString());
  });

  it("labels today's group TODAY and others by uppercase weekday", () => {
    const groups = buildWeek(
      [
        entry([
          game({ id: "today", date: new Date(2026, 6, 25, 19, 0).toISOString() }),
          game({ id: "mon", date: new Date(2026, 6, 27, 19, 0).toISOString() }),
        ]),
      ],
      now,
    );
    expect(groups[0].label).toBe("TODAY");
    expect(groups[1].label).toBe("MON"); // Jul 27 2026 is a Monday
  });

  it("orders days ascending and games within a day by time", () => {
    const groups = buildWeek(
      [
        entry([
          game({ id: "late", date: new Date(2026, 6, 25, 21, 0).toISOString() }),
          game({ id: "early", date: new Date(2026, 6, 25, 17, 0).toISOString() }),
          game({ id: "tomorrow", date: new Date(2026, 6, 26, 12, 0).toISOString() }),
        ]),
      ],
      now,
    );
    expect(groups.map((g) => g.key)).toEqual(["2026-07-25", "2026-07-26"]);
    expect(groups[0].games.map((g) => g.date)).toEqual([
      new Date(2026, 6, 25, 17, 0).toISOString(),
      new Date(2026, 6, 25, 21, 0).toISOString(),
    ]);
  });

  it("formats opponent by home/away", () => {
    const groups = buildWeek(
      [
        entry([
          game({ isHome: true, awayTeam: { id: "2", abbreviation: "GSW" } }),
          game({ id: "away", isHome: false, homeTeam: { id: "9", abbreviation: "MIN" }, date: new Date(2026, 6, 26, 19, 0).toISOString() }),
        ]),
      ],
      now,
    );
    const opps = groups.flatMap((g) => g.games.map((wg) => wg.opponent));
    expect(opps).toContain("vs GSW");
    expect(opps).toContain("@ MIN");
  });

  it("carries the followed team's ids for the scroll target", () => {
    const groups = buildWeek([entry([game()])], now);
    const wg = groups[0].games[0];
    expect(wg.leagueId).toBe("nba");
    expect(wg.teamId).toBe("13");
    expect(wg.teamAbbr).toBe("LAL");
    expect(wg.icon).toBe("🏀");
  });
});
