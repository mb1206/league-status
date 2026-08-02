import { useQueries } from "@tanstack/react-query";
import { teamStatusQuery } from "./useTeamStatus";
import { toEntries, type CalendarEntry } from "../leagues/calendar";
import type { FollowedTeam } from "./useFollowedTeams";

// Reads every followed team's (cache-shared) status and flattens all past +
// upcoming games into a single tagged list for the all-teams calendar. Keyed by
// the same query as useTeamStatus, so it adds no extra fetches.
export function useAllGames(followed: FollowedTeam[]): CalendarEntry[] {
  const results = useQueries({ queries: followed.map(teamStatusQuery) });
  return results
    .map((r) => r.data)
    .filter((d): d is NonNullable<typeof d> => d !== undefined)
    .flatMap((d) => toEntries(d.team, d.league, [...d.pastGames, ...d.upcomingGames]));
}
