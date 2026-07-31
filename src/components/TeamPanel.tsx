import { useState } from "react";
import { Banner } from "./Banner";
import { GameList } from "./GameList";
import { LinkIcons } from "./LinkIcons";
import { SeasonGamesModal } from "./SeasonGamesModal";
import { ConfirmDialog } from "./ConfirmDialog";
import type { LinkChip } from "./LinkIcons";
import { useTeamStatus } from "../hooks/useTeamStatus";
import { useLeagueStandings } from "../hooks/useLeagueStandings";
import { selectGames } from "../leagues/baseDerivations";
import { findDivision } from "../leagues/divisions";
import { espnTeamUrl, seasonYear, youtubeTeamHighlightsUrl } from "../leagues/externalLinks";
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
  const [showAll, setShowAll] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const teamId = query.data?.team.id;
  const division =
    standings.data && teamId ? findDivision(standings.data, teamId) : undefined;

  return (
    <section className="team-panel" id={`team-${team.leagueId}-${team.teamId}`}>
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
              hasPlayoffs={query.data.league.hasPlayoffs}
              teamName={query.data.team.name}
              division={division}
              currentTeamId={query.data.team.id}
              seasonStatus={query.data.seasonStatus}
              standing={query.data.standing}
              links={
                <LinkIcons
                  className="team-links"
                  links={[
                    {
                      kind: "espn",
                      href: espnTeamUrl(query.data.team, query.data.league),
                      label: `${query.data.team.name} on ESPN`,
                    },
                    {
                      kind: "youtube",
                      href: youtubeTeamHighlightsUrl(
                        query.data.team,
                        seasonYear(query.data.pastGames, new Date()),
                      ),
                      label: `${query.data.team.name} season highlights on YouTube`,
                    },
                  ] satisfies LinkChip[]}
                />
              }
            />
            <button
              className="panel-remove"
              aria-label={`Remove ${query.data.team.name}`}
              onClick={() => setConfirmRemove(true)}
            >
              ×
            </button>
          </div>
          <div className="panel-games">
            <GameList
              title="Past"
              team={query.data.team}
              games={selectGames(query.data.pastGames, {
                homeOnly,
                limit: PAST_GAMES,
              })}
              action={
                <button className="view-all" onClick={() => setShowAll(true)}>
                  View all
                </button>
              }
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
          {showAll && (
            <SeasonGamesModal
              team={query.data.team}
              league={query.data.league}
              pastGames={query.data.pastGames}
              upcomingGames={query.data.upcomingGames}
              onClose={() => setShowAll(false)}
            />
          )}
          {confirmRemove && (
            <ConfirmDialog
              message={`Are you sure you want to remove ${query.data.team.name} from your roster?`}
              onConfirm={() => {
                setConfirmRemove(false);
                onRemove(team);
              }}
              onCancel={() => setConfirmRemove(false)}
            />
          )}
        </>
      )}
    </section>
  );
}
