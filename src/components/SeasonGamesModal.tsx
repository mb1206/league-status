import { useEffect, useState } from "react";
import type { Game, LeagueConfig, Team } from "../domain/types";
import { GameList } from "./GameList";
import { GameCalendar } from "./GameCalendar";
import { toEntries } from "../leagues/calendar";
import { buildCalendar, downloadIcs, icsBulkFilename } from "../leagues/ics";

type Tab = "past" | "upcoming";
type View = "list" | "calendar";

interface SeasonGamesModalProps {
  team: Team;
  league: LeagueConfig;
  pastGames: Game[];
  upcomingGames: Game[];
  onClose: () => void;
}

export function SeasonGamesModal({
  team,
  league,
  pastGames,
  upcomingGames,
  onClose,
}: SeasonGamesModalProps) {
  // Opened via the "View all" button next to Past, so Past is the default tab.
  const [tab, setTab] = useState<Tab>("past");
  const [view, setView] = useState<View>("list");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const titleId = "season-games-title";
  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div
        className={`dialog season-games-dialog${view === "calendar" ? " calendar" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="season-games-header">
          <h3 id={titleId} className="season-games-heading">
            {team.logoUrl && (
              <img
                className="season-games-logo"
                src={team.logoUrl}
                alt=""
                aria-hidden
                width={22}
                height={22}
              />
            )}
            {team.name} — all games
          </h3>
          <div className="season-games-view-toggle" role="group" aria-label="View">
            <button
              type="button"
              aria-pressed={view === "list"}
              className={`season-games-view-btn${view === "list" ? " active" : ""}`}
              aria-label="List view"
              onClick={() => setView("list")}
            >
              <svg
                className="season-games-view-icon"
                viewBox="0 0 16 16"
                width="15"
                height="15"
                aria-hidden="true"
              >
                <g fill="currentColor">
                  <rect x="1" y="3" width="14" height="2" rx="1" />
                  <rect x="1" y="7" width="14" height="2" rx="1" />
                  <rect x="1" y="11" width="14" height="2" rx="1" />
                </g>
              </svg>
            </button>
            <button
              type="button"
              aria-pressed={view === "calendar"}
              className={`season-games-view-btn${view === "calendar" ? " active" : ""}`}
              aria-label="Calendar view"
              onClick={() => setView("calendar")}
            >
              📅
            </button>
          </div>
          <button className="dialog-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        {view === "list" ? (
          <>
            <div className="season-games-tabs" role="tablist" aria-label="Filter games">
              <button
                role="tab"
                aria-selected={tab === "past"}
                className={`season-games-tab${tab === "past" ? " active" : ""}`}
                onClick={() => setTab("past")}
              >
                Past
              </button>
              <button
                role="tab"
                aria-selected={tab === "upcoming"}
                className={`season-games-tab${tab === "upcoming" ? " active" : ""}`}
                onClick={() => setTab("upcoming")}
              >
                Upcoming
              </button>
            </div>
            <div className="season-games-body">
              {tab === "past" ? (
                <GameList games={pastGames} team={team} league={league} />
              ) : (
                <GameList showTime games={upcomingGames} team={team} league={league} />
              )}
            </div>
          </>
        ) : (
          <div className="season-games-body">
            <GameCalendar
              entries={toEntries(team, league, [...pastGames, ...upcomingGames])}
              actions={
                upcomingGames.length > 0 ? (
                  <button
                    className="season-calendar-bulk"
                    onClick={() =>
                      downloadIcs(icsBulkFilename(team), buildCalendar(team, league, upcomingGames))
                    }
                  >
                    ➕ Add all upcoming
                  </button>
                ) : undefined
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
