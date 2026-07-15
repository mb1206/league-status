import type { DivisionStanding } from "../domain/types";

// The group (division or conference) whose standings include the given team.
export function findDivision(
  groups: DivisionStanding[],
  teamId: string,
): DivisionStanding | undefined {
  return groups.find((g) => g.entries.some((e) => e.teamId === teamId));
}
