import { useQuery } from "@tanstack/react-query";
import type { DivisionStanding } from "../domain/types";
import { getLeagueModule } from "../leagues/registry";

// Standings are league-wide, so this is keyed by league only — every followed team
// in the same league shares one fetch.
export function useLeagueStandings(leagueId: string) {
  return useQuery<DivisionStanding[]>({
    queryKey: ["standings", leagueId],
    queryFn: () => getLeagueModule(leagueId).adapter.fetchStandings(),
  });
}
