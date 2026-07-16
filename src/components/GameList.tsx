import type { ReactNode } from "react";
import type { Game } from "../domain/types";

interface GameListProps {
  title: string;
  games: Game[];
  showTime?: boolean;
  twoColumn?: boolean;
  action?: ReactNode;
}

function opponent(g: Game): string {
  const opp = g.isHome ? g.awayTeam : g.homeTeam;
  return `${g.isHome ? "vs" : "@"} ${opp.abbreviation}`;
}

function scoreText(g: Game): string {
  if (g.homeTeam.score == null || g.awayTeam.score == null) return "";
  const mine = g.isHome ? g.homeTeam.score : g.awayTeam.score;
  const theirs = g.isHome ? g.awayTeam.score : g.homeTeam.score;
  return `${mine}–${theirs}`;
}

function dateText(iso: string, showTime: boolean): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  if (!showTime) return date;
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return `${date} · ${time}`;
}

export function GameList({
  title,
  games,
  showTime = false,
  twoColumn = false,
  action,
}: GameListProps) {
  return (
    <div className="game-list">
      <div className="game-list-header">
        <h4 className="game-list-title">{title}</h4>
        {action}
      </div>
      {games.length === 0 ? (
        <p className="game-list-empty">No games</p>
      ) : (
        <ul className={twoColumn ? "two-column" : undefined}>
          {games.map((g) => (
            <li key={g.id} className="game-row">
              <span className="game-opp">{opponent(g)}</span>
              {g.competition && (
                <span className="game-comp" title={g.competition.name}>
                  {g.competition.shortName}
                </span>
              )}
              {g.result && <span className={`game-result result-${g.result}`}>{g.result}</span>}
              <span className="game-score">{scoreText(g)}</span>
              <span className="game-date">{dateText(g.date, showTime)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
