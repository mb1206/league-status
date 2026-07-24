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

// Comparator factory that floats in-season items to the front while preserving
// the relative order of same-state items (stable). `getLeagueId` extracts the
// league id from an item, so this works for both team panels (`.leagueId`) and
// league configs (`.id`).
export function byInSeasonFirst<T>(
  inSeasonLeagues: Set<string>,
  getLeagueId: (item: T) => string,
): (a: T, b: T) => number {
  return (a, b) =>
    Number(inSeasonLeagues.has(getLeagueId(b))) -
    Number(inSeasonLeagues.has(getLeagueId(a)));
}

// Reads the (cache-shared) status of every followed team and reports which leagues
// are in season. Keyed by the same query as useTeamStatus, so no extra fetches.
export function useInSeasonLeagues(followed: FollowedTeam[]): Set<string> {
  const results = useQueries({ queries: followed.map(teamStatusQuery) });
  return collectInSeasonLeagues(results.map((r) => r.data));
}
