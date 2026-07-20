import { TeamPanel } from "./TeamPanel";
import type { FollowedTeam } from "../hooks/useFollowedTeams";
import { byInSeasonFirst } from "../hooks/useInSeasonLeagues";

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
  // Float in-season teams to the top (stable). Only visible when unfiltered, since
  // a single-league filter leaves every panel with the same in-season state.
  const ordered = [...visible].sort(
    byInSeasonFirst(inSeasonLeagues, (t) => t.leagueId),
  );
  return (
    <div className="team-panel-list">
      {ordered.map((t) => (
        <TeamPanel key={`${t.leagueId}:${t.teamId}`} team={t} onRemove={onRemove} />
      ))}
    </div>
  );
}
