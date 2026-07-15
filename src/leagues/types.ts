import type {
  DivisionStanding,
  Game,
  LeagueConfig,
  Standing,
  SeasonStatus,
  Team,
} from "../domain/types";

// Raw standing as the adapter extracts it, before derivation parses it.
export interface RawStanding {
  recordSummary: string; // "53-29"
  standingSummaryText?: string; // "1st in Pacific Division"
}

export interface SeasonInput {
  games: Game[]; // full season schedule, mapped to domain Games
  now: Date;
}

export interface LeagueAdapter {
  fetchTeam(teamId: string): Promise<{ team: Team; standing: RawStanding }>;
  fetchSchedule(teamId: string): Promise<Game[]>;
  fetchStandings(): Promise<DivisionStanding[]>;
  searchTeams(query: string): Promise<Team[]>;
}

export interface LeagueDerivations {
  seasonStatus(input: SeasonInput): SeasonStatus;
  standingSummary(raw: RawStanding): Standing;
  splitGames(games: Game[], now: Date): { past: Game[]; upcoming: Game[] };
}

export interface LeagueModule {
  config: LeagueConfig;
  adapter: LeagueAdapter;
  derivations: LeagueDerivations;
}
