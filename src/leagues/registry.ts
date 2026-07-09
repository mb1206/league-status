import type { LeagueConfig } from "../domain/types";
import type { LeagueModule } from "./types";
import { createEspnAdapter } from "./espn/adapter";
import { createBaseDerivations } from "./baseDerivations";

function espnModule(config: LeagueConfig): LeagueModule {
  return {
    config,
    adapter: createEspnAdapter(config),
    derivations: createBaseDerivations(),
  };
}

const nbaModule = espnModule({
  id: "nba",
  sport: "basketball",
  league: "nba",
  displayName: "NBA",
  icon: "🏀",
});

const wnbaModule = espnModule({
  id: "wnba",
  sport: "basketball",
  league: "wnba",
  displayName: "WNBA",
  icon: "🏀",
});

const nflModule = espnModule({
  id: "nfl",
  sport: "football",
  league: "nfl",
  displayName: "NFL",
  icon: "🏈",
});

export const LEAGUES: Record<string, LeagueModule> = {
  nba: nbaModule,
  wnba: wnbaModule,
  nfl: nflModule,
};

export function getLeagueModule(leagueId: string): LeagueModule {
  const mod = LEAGUES[leagueId];
  if (!mod) throw new Error(`Unknown league: ${leagueId}`);
  return mod;
}

export function listLeagues(): LeagueConfig[] {
  return Object.values(LEAGUES).map((m) => m.config);
}
