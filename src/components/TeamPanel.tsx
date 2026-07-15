import { useState } from "react";
import { Banner } from "./Banner";
import { GameList } from "./GameList";
import { useTeamStatus } from "../hooks/useTeamStatus";
import { useLeagueStandings } from "../hooks/useLeagueStandings";
import { selectGames } from "../leagues/baseDerivations";
import { findDivision } from "../leagues/divisions";
import type { FollowedTeam } from "../hooks/useFollowedTeams";

const PAST_GAMES = 3;
const UPCOMING_GAMES = 6;

interface TeamPanelProps {
  team: FollowedTeam;
  onRemove: (team: FollowedTeam) => void;
}

export function TeamPanel({ team, onRemove }: TeamPanelProps) {
  const query = useTeamStatus(team);
  const standings = useLeagueStandings(team.leagueId);
  const [homeOnly, setHomeOnly] = useState(false);

  const teamId = query.data?.team.id;
  const division =
    standings.data && teamId ? findDivision(standings.data, teamId) : undefined;

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
              logoUrl={query.data.team.logoUrl}
              leagueName={query.data.league.displayName}
              hasPlayoffs={query.data.league.hasPlayoffs}
              teamName={query.data.team.name}
              division={division}
              currentTeamId={query.data.team.id}
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
            <GameList
              title="Past"
              games={selectGames(query.data.pastGames, {
                homeOnly,
                limit: PAST_GAMES,
              })}
            />
            <div className="panel-divider" aria-hidden />
            <GameList
              title="Upcoming"
              showTime
              twoColumn
              games={selectGames(query.data.upcomingGames, {
                homeOnly,
                limit: UPCOMING_GAMES,
              })}
              action={
                <label className="home-only-toggle">
                  <span className="switch">
                    <input
                      type="checkbox"
                      checked={homeOnly}
                      onChange={(e) => setHomeOnly(e.target.checked)}
                    />
                    <span className="switch-slider" aria-hidden />
                  </span>
                  Home only
                </label>
              }
            />
          </div>
        </>
      )}
    </section>
  );
}
