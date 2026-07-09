import { Banner } from "./Banner";
import { GameList } from "./GameList";
import { useTeamStatus } from "../hooks/useTeamStatus";
import type { FollowedTeam } from "../hooks/useFollowedTeams";

interface TeamPanelProps {
  team: FollowedTeam;
  onRemove: (team: FollowedTeam) => void;
}

export function TeamPanel({ team, onRemove }: TeamPanelProps) {
  const query = useTeamStatus(team);

  return (
    <section className="team-panel">
      {query.isLoading && (
        <div className="panel-skeleton" data-testid="panel-skeleton">
          Loading team…
        </div>
      )}

      {query.isError && (
        <div className="panel-error">
          <p>Couldn't load this team.</p>
          <button onClick={() => query.refetch()}>Retry</button>
          <button onClick={() => onRemove(team)}>Remove</button>
        </div>
      )}

      {query.isSuccess && query.data && (
        <>
          <div className="panel-header">
            <Banner
              icon={query.data.league.icon}
              leagueName={query.data.league.displayName}
              teamName={query.data.team.name}
              seasonStatus={query.data.seasonStatus}
              standing={query.data.standing}
            />
            <button
              className="panel-remove"
              aria-label={`Remove ${query.data.team.name}`}
              onClick={() => onRemove(team)}
            >
              ×
            </button>
          </div>
          <div className="panel-games">
            <GameList title="Upcoming" games={query.data.upcomingGames} />
            <GameList title="Past" games={query.data.pastGames} />
          </div>
        </>
      )}
    </section>
  );
}
