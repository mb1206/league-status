import { TeamPanel } from "./TeamPanel";
import type { FollowedTeam } from "../hooks/useFollowedTeams";

interface TeamPanelListProps {
  teams: FollowedTeam[];
  onRemove: (team: FollowedTeam) => void;
}

export function TeamPanelList({ teams, onRemove }: TeamPanelListProps) {
  if (teams.length === 0) {
    return <p className="empty-state">No teams yet — add a team to get started.</p>;
  }
  return (
    <div className="team-panel-list">
      {teams.map((t) => (
        <TeamPanel key={`${t.leagueId}:${t.teamId}`} team={t} onRemove={onRemove} />
      ))}
    </div>
  );
}
