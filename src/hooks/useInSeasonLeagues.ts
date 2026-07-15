import { useQueries } from "@tanstack/react-query";
import type { TeamStatus } from "../domain/types";
import { teamStatusQuery } from "./useTeamStatus";
import type { FollowedTeam } from "./useFollowedTeams";

// League ids that have at least one followed team currently out of the offseason.
export function collectInSeasonLeagues(
  statuses: (TeamStatus | undefined)[],
): Set<string> {
  const leagues = new Set<string>();
  for (const s of statuses) {
    if (s && s.seasonStatus.phase !== "offseason") leagues.add(s.league.id);
  }
  return leagues;
}

// Reads the (cache-shared) status of every followed team and reports which leagues
// are in season. Keyed by the same query as useTeamStatus, so no extra fetches.
export function useInSeasonLeagues(followed: FollowedTeam[]): Set<string> {
  const results = useQueries({ queries: followed.map(teamStatusQuery) });
  return collectInSeasonLeagues(results.map((r) => r.data));
}
