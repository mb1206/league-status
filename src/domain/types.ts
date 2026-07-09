export interface LeagueConfig {
  id: string; // "nba"
  sport: string; // ESPN sport path: "basketball"
  league: string; // ESPN league path: "nba"
  displayName: string; // "NBA"
  icon: string; // "🏀"
}

export interface Team {
  id: string;
  leagueId: string;
  name: string; // "Los Angeles Lakers"
  abbreviation: string; // "LAL"
  logoUrl?: string;
}

export interface GameTeamRef {
  id: string;
  abbreviation: string;
  score?: number;
}

export type GameStatus = "scheduled" | "in_progress" | "final";
export type SeasonType = "preseason" | "regular" | "postseason";

export interface Game {
  id: string;
  date: string; // ISO
  status: GameStatus;
  seasonType: SeasonType;
  homeTeam: GameTeamRef;
  awayTeam: GameTeamRef;
  isHome: boolean; // relative to followed team
  result?: "W" | "L"; // when final, relative to followed team
}

export interface Standing {
  overall: string; // "53-29"
  summary?: string; // raw ESPN text: "1st in Pacific Division"
  divisionRank?: number; // 1
  divisionName?: string; // "Pacific"
}

export type SeasonPhase =
  | "offseason"
  | "in_season"
  | "playoffs_upcoming"
  | "playoffs";

export interface SeasonStatus {
  phase: SeasonPhase;
  label: string; // "PLAYOFFS IN 3 WEEKS"
  weeksUntilPlayoffs?: number;
}

export interface TeamStatus {
  team: Team;
  league: LeagueConfig;
  standing: Standing;
  seasonStatus: SeasonStatus;
  pastGames: Game[];
  upcomingGames: Game[];
}
