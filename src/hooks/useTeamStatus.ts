import { useQuery } from "@tanstack/react-query";
import type { TeamStatus } from "../domain/types";
import { getLeagueModule } from "../leagues/registry";
import { seasonStatus, splitGames, standingSummary } from "../leagues/baseDerivations";
import type { FollowedTeam } from "./useFollowedTeams";

// Query options shared by useTeamStatus and useQueries callers, so both hit the
// same cache entry per team.
export function teamStatusQuery(team: FollowedTeam) {
  return {
    queryKey: ["teamStatus", team.leagueId, team.teamId],
    queryFn: async (): Promise<TeamStatus> => {
      const mod = getLeagueModule(team.leagueId);
      // Parallel: team meta/standing and schedule fetch together.
      const [{ team: domainTeam, standing }, games] = await Promise.all([
        mod.adapter.fetchTeam(team.teamId),
        mod.adapter.fetchSchedule(team.teamId),
      ]);
      const now = new Date();
      const { past, upcoming } = splitGames(games, now);
      return {
        team: domainTeam,
        league: mod.config,
        standing: standingSummary(standing),
        seasonStatus: seasonStatus({ games, now }),
        pastGames: past,
        upcomingGames: upcoming,
      };
    },
  };
}

export function useTeamStatus(team: FollowedTeam) {
  return useQuery<TeamStatus>(teamStatusQuery(team));
}
