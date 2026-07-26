import { useQueries } from "@tanstack/react-query";
import { teamStatusQuery } from "./useTeamStatus";
import { buildWeek, type DayGroup, type WeekEntry } from "../leagues/upcomingWeek";
import type { FollowedTeam } from "./useFollowedTeams";

// Reads every followed team's (cache-shared) status and returns the next 7 days
// of games grouped by day. Keyed by the same query as useTeamStatus, so it adds
// no extra fetches.
export function useUpcomingWeek(followed: FollowedTeam[]): DayGroup[] {
  const results = useQueries({ queries: followed.map(teamStatusQuery) });
  const entries: WeekEntry[] = results
    .map((r) => r.data)
    .filter((d): d is NonNullable<typeof d> => d !== undefined)
    .map((d) => ({ team: d.team, league: d.league, upcomingGames: d.upcomingGames }));
  return buildWeek(entries, new Date());
}
