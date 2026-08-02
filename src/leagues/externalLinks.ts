import type { Game, LeagueConfig, Team } from "../domain/types";

const YOUTUBE = "https://www.youtube.com/results?search_query=";
const REDDIT = "https://www.reddit.com/search/?q=";

function opponentAbbr(game: Game): string {
  return game.isHome ? game.awayTeam.abbreviation : game.homeTeam.abbreviation;
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function espnTeamUrl(team: Team, league: LeagueConfig): string {
  const nameSlug = slug(team.name);
  // ESPN soccer only resolves id-based team URLs; the name form dead-ends to the
  // soccer homepage.
  if (league.sport === "soccer") {
    return `https://www.espn.com/soccer/team/_/id/${team.id}/${nameSlug}`;
  }
  // US leagues use the name-based path (abbreviation + slug). The id-based form
  // leads to dead links when navigating around espn.com.
  return `https://www.espn.com/${league.league}/team/_/name/${team.abbreviation.toLowerCase()}/${nameSlug}`;
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
