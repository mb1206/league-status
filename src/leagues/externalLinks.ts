import type { Game, LeagueConfig, Team } from "../domain/types";

const YOUTUBE = "https://www.youtube.com/results?search_query=";
const REDDIT = "https://www.reddit.com/search/?q=";

function opponentAbbr(game: Game): string {
  return game.isHome ? game.awayTeam.abbreviation : game.homeTeam.abbreviation;
}

export function espnTeamUrl(team: Team, league: LeagueConfig): string {
  const path = league.sport === "soccer" ? "soccer" : league.league;
  return `https://www.espn.com/${path}/team/_/id/${team.id}`;
}

export function seasonYear(pastGames: Game[], now: Date): number {
  if (pastGames.length > 0) {
    const latest = pastGames.reduce((a, b) =>
      new Date(b.date) > new Date(a.date) ? b : a,
    );
    return new Date(latest.date).getFullYear();
  }
  return now.getFullYear();
}

export function youtubeTeamHighlightsUrl(team: Team, year: number): string {
  return YOUTUBE + encodeURIComponent(`${team.name} ${year} highlights`);
}

// Highlights for a game that has been played; a preview for one that hasn't.
// Both encode "{team} vs {opp} {kind} {date}" as a YouTube search.
function youtubeGameQueryUrl(team: Team, game: Game, kind: "highlights" | "preview"): string {
  const date = new Date(game.date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return YOUTUBE + encodeURIComponent(`${team.name} vs ${opponentAbbr(game)} ${kind} ${date}`);
}

export function youtubeGameHighlightsUrl(team: Team, game: Game): string {
  return youtubeGameQueryUrl(team, game, "highlights");
}

export function youtubeGamePreviewUrl(team: Team, game: Game): string {
  return youtubeGameQueryUrl(team, game, "preview");
}

export function redditGameUrl(team: Team, game: Game): string {
  return REDDIT + encodeURIComponent(`${team.name} ${opponentAbbr(game)}`);
}
