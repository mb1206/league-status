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
  hasPlayoffs: true,
});

const wnbaModule = espnModule({
  id: "wnba",
  sport: "basketball",
  league: "wnba",
  displayName: "WNBA",
  icon: "🏀",
  hasPlayoffs: true,
});

const nflModule = espnModule({
  id: "nfl",
  sport: "football",
  league: "nfl",
  displayName: "NFL",
  icon: "🏈",
  hasPlayoffs: true,
});

const mlbModule = espnModule({
  id: "mlb",
  sport: "baseball",
  league: "mlb",
  displayName: "MLB",
  icon: "⚾",
  hasPlayoffs: true,
});

const nhlModule = espnModule({
  id: "nhl",
  sport: "hockey",
  league: "nhl",
  displayName: "NHL",
  icon: "🏒",
  hasPlayoffs: true,
});

const mlsModule = espnModule({
  id: "mls",
  sport: "soccer",
  league: "usa.1",
  displayName: "MLS",
  icon: "⚽",
  hasPlayoffs: true,
});

export const LEAGUES: Record<string, LeagueModule> = {
  nba: nbaModule,
  wnba: wnbaModule,
  nfl: nflModule,
  mlb: mlbModule,
  nhl: nhlModule,
  mls: mlsModule,
};

export function getLeagueModule(leagueId: string): LeagueModule {
  const mod = LEAGUES[leagueId];
  if (!mod) throw new Error(`Unknown league: ${leagueId}`);
  return mod;
}

export function listLeagues(): LeagueConfig[] {
  return Object.values(LEAGUES).map((m) => m.config);
}
