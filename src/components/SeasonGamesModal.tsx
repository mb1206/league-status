import { useEffect, useState } from "react";
import type { Game, Team } from "../domain/types";
import { GameList } from "./GameList";

type Tab = "past" | "upcoming";

interface SeasonGamesModalProps {
  team: Team;
  pastGames: Game[];
  upcomingGames: Game[];
  onClose: () => void;
}

export function SeasonGamesModal({
  team,
  pastGames,
  upcomingGames,
  onClose,
}: SeasonGamesModalProps) {
  // Opened via the "View all" button next to Past, so Past is the default tab.
  const [tab, setTab] = useState<Tab>("past");

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
        className="dialog season-games-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="season-games-header">
          <h3 id={titleId} className="season-games-heading">
            {team.name} — all games
          </h3>
          <button className="dialog-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
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
            <GameList games={pastGames} team={team} />
          ) : (
            <GameList showTime games={upcomingGames} team={team} />
          )}
        </div>
      </div>
    </div>
  );
}
