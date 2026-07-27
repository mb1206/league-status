import { useEffect } from "react";
import type { Game, Team } from "../domain/types";
import { GameList } from "./GameList";

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
        <div className="season-games-body">
          <GameList title="Upcoming" showTime games={upcomingGames} team={team} />
          <GameList title="Past" games={pastGames} team={team} />
        </div>
      </div>
    </div>
  );
}
