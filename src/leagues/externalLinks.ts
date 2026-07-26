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

export function youtubeGameHighlightsUrl(team: Team, game: Game): string {
  const date = new Date(game.date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return YOUTUBE + encodeURIComponent(`${team.name} vs ${opponentAbbr(game)} highlights ${date}`);
}

export function redditGameUrl(team: Team, game: Game): string {
  return REDDIT + encodeURIComponent(`${team.name} ${opponentAbbr(game)}`);
}
