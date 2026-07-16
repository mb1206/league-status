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

// Premier League clubs play across several competitions; a followed team's
// schedule merges fixtures from all of them, each badged. Standing and season
// progress still come from the league itself (the `primary` competition).
const premierLeagueModule = espnModule({
  id: "epl",
  sport: "soccer",
  league: "eng.1",
  displayName: "Premier League",
  icon: "⚽",
  hasPlayoffs: false,
  competitions: [
    { slug: "eng.1", shortName: "PL", name: "Premier League", primary: true },
    { slug: "eng.fa", shortName: "FA CUP", name: "FA Cup" },
    { slug: "eng.league_cup", shortName: "CARABAO", name: "Carabao Cup" },
    { slug: "uefa.champions", shortName: "UCL", name: "UEFA Champions League" },
    { slug: "uefa.europa", shortName: "UEL", name: "UEFA Europa League" },
    { slug: "uefa.europa.conf", shortName: "UECL", name: "UEFA Europa Conference League" },
    { slug: "eng.charity", shortName: "SHIELD", name: "Community Shield" },
    { slug: "fifa.cwc", shortName: "CWC", name: "FIFA Club World Cup" },
  ],
});

export const LEAGUES: Record<string, LeagueModule> = {
  nba: nbaModule,
  wnba: wnbaModule,
  nfl: nflModule,
  mlb: mlbModule,
  nhl: nhlModule,
  mls: mlsModule,
  epl: premierLeagueModule,
};

export function getLeagueModule(leagueId: string): LeagueModule {
  const mod = LEAGUES[leagueId];
  if (!mod) throw new Error(`Unknown league: ${leagueId}`);
  return mod;
}

export function listLeagues(): LeagueConfig[] {
  return Object.values(LEAGUES).map((m) => m.config);
}
