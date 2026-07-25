import { TeamPanel } from "./TeamPanel";
import type { FollowedTeam } from "../hooks/useFollowedTeams";
import { byInSeasonFirst } from "../hooks/useInSeasonLeagues";
import { leagueRank } from "../leagues/registry";

interface TeamPanelListProps {
  teams: FollowedTeam[];
  activeLeague?: string | null;
  inSeasonLeagues?: Set<string>;
  onRemove: (team: FollowedTeam) => void;
}

export function TeamPanelList({
  teams,
  activeLeague = null,
  inSeasonLeagues = new Set(),
  onRemove,
}: TeamPanelListProps) {
  if (teams.length === 0) {
    return <p className="empty-state">No teams yet — add a team to get started.</p>;
  }
  // Only apply the filter when the active league is actually followed; a stale
  // filter (e.g. after removing that sport's last team) falls back to showing all.
  const visible =
    activeLeague !== null && teams.some((t) => t.leagueId === activeLeague)
      ? teams.filter((t) => t.leagueId === activeLeague)
      : teams;
  // Float in-season teams to the top, then group by sport (registry order) so a
  // team lands next to its league-mates no matter when it was added. Sort is
  // stable, so same-league teams keep their relative (add) order.
  const bySeason = byInSeasonFirst<FollowedTeam>(inSeasonLeagues, (t) => t.leagueId);
  const ordered = [...visible].sort(
    (a, b) => bySeason(a, b) || leagueRank(a.leagueId) - leagueRank(b.leagueId),
  );
  return (
    <div className="team-panel-list">
      {ordered.map((t) => (
        <TeamPanel key={`${t.leagueId}:${t.teamId}`} team={t} onRemove={onRemove} />
      ))}
    </div>
  );
}
