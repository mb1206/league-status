import { describe, expect, it } from "vitest";
import {
  espnTeamUrl,
  redditGameUrl,
  seasonYear,
  youtubeGameHighlightsUrl,
  youtubeGamePreviewUrl,
  youtubeTeamHighlightsUrl,
} from "./externalLinks";
import type { Game, LeagueConfig, Team } from "../domain/types";

const lakers: Team = { id: "13", leagueId: "nba", name: "Los Angeles Lakers", abbreviation: "LAL" };
const nba: LeagueConfig = { id: "nba", sport: "basketball", league: "nba", displayName: "NBA", icon: "🏀", hasPlayoffs: true };
const mls: LeagueConfig = { id: "mls", sport: "soccer", league: "usa.1", displayName: "MLS", icon: "⚽", hasPlayoffs: true };

function game(over: Partial<Game> = {}): Game {
  return {
    id: "g1",
    date: "2026-04-01T02:30:00Z",
    status: "final",
    seasonType: "regular",
    isHome: true,
    result: "W",
    homeTeam: { id: "13", abbreviation: "LAL", score: 112 },
    awayTeam: { id: "2", abbreviation: "BOS", score: 104 },
    ...over,
  };
}

describe("espnTeamUrl", () => {
  it("uses the league path for US leagues", () => {
    expect(espnTeamUrl(lakers, nba)).toBe("https://www.espn.com/nba/team/_/id/13");
  });
  it("uses /soccer/ for soccer leagues instead of the league slug", () => {
    expect(espnTeamUrl(lakers, mls)).toBe("https://www.espn.com/soccer/team/_/id/13");
  });
});

describe("seasonYear", () => {
  it("uses the most recent past game's calendar year", () => {
    const games = [game({ date: "2025-11-10T00:00:00Z" }), game({ date: "2026-03-15T00:00:00Z" })];
    expect(seasonYear(games, new Date("2027-01-01T00:00:00Z"))).toBe(2026);
  });
  it("falls back to now's year when there are no past games", () => {
    expect(seasonYear([], new Date("2026-08-01T00:00:00Z"))).toBe(2026);
  });
});

describe("youtubeTeamHighlightsUrl", () => {
  it("encodes the team + year + highlights query", () => {
    expect(youtubeTeamHighlightsUrl(lakers, 2026)).toBe(
      "https://www.youtube.com/results?search_query=" +
        encodeURIComponent("Los Angeles Lakers 2026 highlights"),
    );
  });
});

describe("youtubeGameHighlightsUrl", () => {
  it("uses the away abbreviation as opponent for a home game", () => {
    const url = youtubeGameHighlightsUrl(lakers, game({ isHome: true }));
    expect(url).toContain(encodeURIComponent("Los Angeles Lakers vs BOS highlights"));
  });
  it("uses the home abbreviation as opponent for an away game", () => {
    const url = youtubeGameHighlightsUrl(lakers, game({ isHome: false, homeTeam: { id: "2", abbreviation: "GSW" }, awayTeam: { id: "13", abbreviation: "LAL" } }));
    expect(url).toContain(encodeURIComponent("Los Angeles Lakers vs GSW highlights"));
  });
});

describe("youtubeGamePreviewUrl", () => {
  it("encodes a preview query (not highlights) for an upcoming game", () => {
    const url = youtubeGamePreviewUrl(lakers, game({ isHome: true, status: "scheduled" }));
    expect(url).toContain(encodeURIComponent("Los Angeles Lakers vs BOS preview"));
    expect(url).not.toContain("highlights");
  });
});

describe("redditGameUrl", () => {
  it("searches all of reddit for the encoded matchup", () => {
    expect(redditGameUrl(lakers, game({ isHome: true }))).toBe(
      "https://www.reddit.com/search/?q=" + encodeURIComponent("Los Angeles Lakers BOS"),
    );
  });
});
