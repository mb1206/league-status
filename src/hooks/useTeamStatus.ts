import { useQuery } from "@tanstack/react-query";
import type { TeamStatus } from "../domain/types";
import { getLeagueModule } from "../leagues/registry";
import type { FollowedTeam } from "./useFollowedTeams";

export function useTeamStatus(team: FollowedTeam) {
  return useQuery<TeamStatus>({
    queryKey: ["teamStatus", team.leagueId, team.teamId],
    queryFn: async () => {
      const mod = getLeagueModule(team.leagueId);
      // Parallel: team meta/standing and schedule fetch together.
      const [{ team: domainTeam, standing }, games] = await Promise.all([
        mod.adapter.fetchTeam(team.teamId),
        mod.adapter.fetchSchedule(team.teamId),
      ]);
      const now = new Date();
      const { past, upcoming } = mod.derivations.splitGames(games, now);
      return {
        team: domainTeam,
        league: mod.config,
        standing: mod.derivations.standingSummary(standing),
        seasonStatus: mod.derivations.seasonStatus({ games, now }),
        pastGames: past,
        upcomingGames: upcoming,
      };
    },
  });
}
