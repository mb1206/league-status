import type { Game } from "../domain/types";

interface GameListProps {
  title: string;
  games: Game[];
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

function dateText(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function GameList({ title, games }: GameListProps) {
  return (
    <div className="game-list">
      <h4 className="game-list-title">{title}</h4>
      {games.length === 0 ? (
        <p className="game-list-empty">No games</p>
      ) : (
        <ul>
          {games.map((g) => (
            <li key={g.id} className="game-row">
              <span className="game-opp">{opponent(g)}</span>
              {g.result && <span className={`game-result result-${g.result}`}>{g.result}</span>}
              <span className="game-score">{scoreText(g)}</span>
              <span className="game-date">{dateText(g.date)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
