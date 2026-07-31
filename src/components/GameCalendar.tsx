import { useMemo, useState, type ReactNode } from "react";
import type { Game } from "../domain/types";
import { LinkIcons } from "./LinkIcons";
import { gameLinks } from "./gameLinks";
import type { CalendarEntry } from "../leagues/calendar";

interface GameCalendarProps {
  entries: CalendarEntry[];
  actions?: ReactNode;
  now?: Date;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function ym(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function dayKey(d: Date): string {
  return `${ym(d)}-${String(d.getDate()).padStart(2, "0")}`;
}
function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}
function scoreText(g: Game): string {
  if (g.homeTeam.score == null || g.awayTeam.score == null) return "";
  const mine = g.isHome ? g.homeTeam.score : g.awayTeam.score;
  const theirs = g.isHome ? g.awayTeam.score : g.homeTeam.score;
  return `${mine}–${theirs}`;
}

export function GameCalendar({ entries, actions, now = new Date() }: GameCalendarProps) {
  const sorted = useMemo(
    () =>
      [...entries].sort(
        (a, b) => new Date(a.game.date).getTime() - new Date(b.game.date).getTime(),
      ),
    [entries],
  );

  const months = useMemo(() => {
    const set = new Set(sorted.map((e) => ym(new Date(e.game.date))));
    return [...set].sort();
  }, [sorted]);

  // Show a per-game team badge only when the calendar spans more than one team;
  // in the single-team modal that would be redundant noise.
  const multiTeam = useMemo(
    () => new Set(sorted.map((e) => `${e.team.leagueId}:${e.team.id}`)).size > 1,
    [sorted],
  );

  const nowKey = ym(now);
  const initialIndex = useMemo(() => {
    if (months.length === 0) return 0;
    const idx = months.findIndex((k) => k >= nowKey);
    return idx === -1 ? months.length - 1 : idx;
  }, [months, nowKey]);

  const [index, setIndex] = useState(initialIndex);

  if (months.length === 0) {
    return <p className="game-list-empty">No games</p>;
  }

  const monthKey = months[Math.min(index, months.length - 1)];
  const monthEntries = sorted.filter((e) => ym(new Date(e.game.date)) === monthKey);
  const entriesByDay = new Map<string, CalendarEntry[]>();
  for (const e of monthEntries) {
    const k = dayKey(new Date(e.game.date));
    entriesByDay.set(k, [...(entriesByDay.get(k) ?? []), e]);
  }

  const [y, m] = monthKey.split("-").map(Number);
  const firstWeekday = new Date(y, m - 1, 1).getDay();
  const daysInMonth = new Date(y, m, 0).getDate();
  const todayKey = dayKey(now);

  const cells: (number | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="season-calendar">
      <div className="season-calendar-nav">
        <button
          className="season-calendar-navbtn"
          aria-label="Previous month"
          disabled={index === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
        >
          ‹
        </button>
        <span className="season-calendar-month">{monthLabel(monthKey)}</span>
        <button
          className="season-calendar-navbtn"
          aria-label="Next month"
          disabled={index === months.length - 1}
          onClick={() => setIndex((i) => Math.min(months.length - 1, i + 1))}
        >
          ›
        </button>
        {actions && <div className="season-calendar-actions">{actions}</div>}
      </div>

      <div className="season-calendar-grid" role="grid">
        {WEEKDAYS.map((w) => (
          <div key={w} className="season-calendar-weekday">
            {w}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day == null) return <div key={`b${i}`} className="season-calendar-day empty" />;
          const key = `${monthKey}-${String(day).padStart(2, "0")}`;
          const dayEntries = entriesByDay.get(key) ?? [];
          return (
            <div key={key} className={`season-calendar-day${key === todayKey ? " today" : ""}`}>
              <span className="season-calendar-daynum">{day}</span>
              {dayEntries.map(({ team, league, game: g }) => {
                const opp = g.isHome ? g.awayTeam.abbreviation : g.homeTeam.abbreviation;
                const played = g.status === "final";
                const score = scoreText(g);
                return (
                  <div
                    key={`${team.leagueId}:${team.id}:${g.id}`}
                    className={`season-calendar-game${played ? " past" : ""}`}
                  >
                    <span className="season-calendar-gameopp">
                      {multiTeam &&
                        (team.logoUrl ? (
                          <img
                            className="season-calendar-gamelogo"
                            src={team.logoUrl}
                            alt={team.abbreviation}
                            width={14}
                            height={14}
                          />
                        ) : (
                          <span className="season-calendar-gameicon" aria-hidden>
                            {league.icon}
                          </span>
                        ))}
                      {g.isHome ? "vs" : "@"} {opp}
                    </span>
                    {played && (g.result || score) && (
                      <span className="season-calendar-gamescore">
                        {g.result && <span className={`result-${g.result}`}>{g.result}</span>}
                        {score && <span className="season-calendar-gamenums">{score}</span>}
                      </span>
                    )}
                    <LinkIcons
                      className="season-calendar-gamelinks"
                      links={gameLinks(team, g, league)}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
