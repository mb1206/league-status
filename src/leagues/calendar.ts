import type { Game, LeagueConfig, Team } from "../domain/types";

// A single game paired with the team/league it belongs to, so a calendar can
// render games from many teams together (logo, opponent, links all need context).
export interface CalendarEntry {
  team: Team;
  league: LeagueConfig;
  game: Game;
}

export function toEntries(team: Team, league: LeagueConfig, games: Game[]): CalendarEntry[] {
  return games.map((game) => ({ team, league, game }));
}
