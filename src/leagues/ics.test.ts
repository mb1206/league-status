import { describe, expect, it } from "vitest";
import { buildCalendar, buildEvent, durationHours, icsBulkFilename, icsFilename } from "./ics";
import type { Game, LeagueConfig, Team } from "../domain/types";

const nba: LeagueConfig = {
  id: "nba", sport: "basketball", league: "nba", displayName: "NBA", icon: "🏀", hasPlayoffs: true,
};
const epl: LeagueConfig = {
  id: "epl", sport: "soccer", league: "eng.1", displayName: "Premier League", icon: "⚽", hasPlayoffs: false,
};
const team: Team = { id: "13", leagueId: "nba", name: "Los Angeles Lakers", abbreviation: "LAL" };

const homeGame: Game = {
  id: "g1", date: "2026-10-21T02:30:00Z", status: "scheduled", seasonType: "regular",
  isHome: true, homeTeam: { id: "13", abbreviation: "LAL" }, awayTeam: { id: "2", abbreviation: "BOS" },
};
const awayGame: Game = {
  id: "g2", date: "2026-10-24T00:00:00Z", status: "scheduled", seasonType: "regular",
  isHome: false, homeTeam: { id: "2", abbreviation: "BOS" }, awayTeam: { id: "13", abbreviation: "LAL" },
};
const NOW = new Date("2026-09-01T00:00:00Z");

describe("durationHours", () => {
  it("returns the per-sport duration and a 2h fallback", () => {
    expect(durationHours("basketball")).toBe(2.5);
    expect(durationHours("football")).toBe(3.5);
    expect(durationHours("soccer")).toBe(2);
    expect(durationHours("curling")).toBe(2);
  });
});

describe("buildEvent", () => {
  it("emits UTC start/end with the sport duration and a home vs summary", () => {
    const ev = buildEvent(team, nba, homeGame, NOW);
    expect(ev).toContain("BEGIN:VEVENT");
    expect(ev).toContain("END:VEVENT");
    expect(ev).toContain("UID:g1@league-status");
    expect(ev).toContain("DTSTART:20261021T023000Z");
    expect(ev).toContain("DTEND:20261021T050000Z"); // +2.5h
    expect(ev).toContain("SUMMARY:🏀 Los Angeles Lakers vs BOS");
  });

  it("uses '@' for away games", () => {
    expect(buildEvent(team, nba, awayGame, NOW)).toContain("SUMMARY:🏀 Los Angeles Lakers @ BOS");
  });

  it("badges a non-primary competition in the summary", () => {
    const ucl: Game = { ...homeGame, competition: { shortName: "UCL", name: "UEFA Champions League", primary: false } };
    expect(buildEvent(team, epl, ucl, NOW)).toContain("SUMMARY:⚽ Los Angeles Lakers vs BOS (UCL)");
  });

  it("puts the preview, discussion and ESPN links in the description", () => {
    const ev = buildEvent(team, nba, homeGame, NOW);
    const desc = ev.split(/\r\n/).join("").match(/DESCRIPTION:(.*?)END:VEVENT/)?.[1] ?? "";
    expect(desc).toContain("youtube.com");
    expect(desc).toContain("reddit.com");
    expect(desc).toContain("espn.com");
  });
});

describe("buildCalendar", () => {
  it("wraps events in a VCALENDAR and includes each game", () => {
    const cal = buildCalendar(team, nba, [homeGame, awayGame], NOW);
    expect(cal.startsWith("BEGIN:VCALENDAR")).toBe(true);
    expect(cal.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    expect(cal).toContain("UID:g1@league-status");
    expect(cal).toContain("UID:g2@league-status");
    expect(cal).toContain("\r\n"); // CRLF line endings
  });
});

describe("filenames", () => {
  it("slugs the team, opponent and date for a single game", () => {
    expect(icsFilename(team, homeGame)).toBe("los-angeles-lakers-vs-bos-2026-10-21.ics");
    expect(icsFilename(team, awayGame)).toBe("los-angeles-lakers-at-bos-2026-10-24.ics");
  });
  it("names the bulk file after the team", () => {
    expect(icsBulkFilename(team)).toBe("los-angeles-lakers-upcoming.ics");
  });
});
