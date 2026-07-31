import { useEffect } from "react";
import { useAllGames } from "../hooks/useAllGames";
import { GameCalendar } from "./GameCalendar";
import type { FollowedTeam } from "../hooks/useFollowedTeams";

interface CalendarModalProps {
  followed: FollowedTeam[];
  onClose: () => void;
}

// Every followed team's games on one calendar, opened from the "Next 7 Days"
// header. View-only: no bulk export (that stays per-team in SeasonGamesModal).
export function CalendarModal({ followed, onClose }: CalendarModalProps) {
  const entries = useAllGames(followed);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const titleId = "all-teams-calendar-title";
  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div
        className="dialog season-games-dialog calendar"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="season-games-header">
          <h3 id={titleId} className="season-games-heading">
            All teams — calendar
          </h3>
          <button className="dialog-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="season-games-body">
          <GameCalendar entries={entries} />
        </div>
      </div>
    </div>
  );
}
