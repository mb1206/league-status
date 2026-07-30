import { useMemo, useState } from "react";
import type { Game, LeagueConfig, Team } from "../domain/types";
import { GameList } from "./GameList";
import { buildCalendar, downloadIcs, icsBulkFilename } from "../leagues/ics";

interface SeasonCalendarProps {
  team: Team;
  league: LeagueConfig;
  pastGames: Game[];
  upcomingGames: Game[];
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

export function SeasonCalendar({
  team,
  league,
  pastGames,
  upcomingGames,
  now = new Date(),
}: SeasonCalendarProps) {
  const allGames = useMemo(
    () =>
      [...pastGames, ...upcomingGames].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      ),
    [pastGames, upcomingGames],
  );

  const months = useMemo(() => {
    const set = new Set(allGames.map((g) => ym(new Date(g.date))));
    return [...set].sort();
  }, [allGames]);

  const nowKey = ym(now);
  const initialIndex = useMemo(() => {
    if (months.length === 0) return 0;
    const idx = months.findIndex((k) => k >= nowKey);
    return idx === -1 ? months.length - 1 : idx;
  }, [months, nowKey]);

  const [index, setIndex] = useState(initialIndex);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  if (months.length === 0) {
    return <p className="game-list-empty">No games</p>;
  }

  const monthKey = months[Math.min(index, months.length - 1)];
  const monthGames = allGames.filter((g) => ym(new Date(g.date)) === monthKey);
  const gamesByDay = new Map<string, Game[]>();
  for (const g of monthGames) {
    const k = dayKey(new Date(g.date));
    gamesByDay.set(k, [...(gamesByDay.get(k) ?? []), g]);
  }

  const [y, m] = monthKey.split("-").map(Number);
  const firstWeekday = new Date(y, m - 1, 1).getDay();
  const daysInMonth = new Date(y, m, 0).getDate();
  const todayKey = dayKey(now);

  const cells: (number | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const selectedGames = selectedDay ? (gamesByDay.get(selectedDay) ?? []) : [];
  const hasUpcoming = upcomingGames.length > 0;

  return (
    <div className="season-calendar">
      <div className="season-calendar-nav">
        <button
          className="season-calendar-navbtn"
          aria-label="Previous month"
          disabled={index === 0}
          onClick={() => {
            setSelectedDay(null);
            setIndex((i) => Math.max(0, i - 1));
          }}
        >
          ‹
        </button>
        <span className="season-calendar-month">{monthLabel(monthKey)}</span>
        <button
          className="season-calendar-navbtn"
          aria-label="Next month"
          disabled={index === months.length - 1}
          onClick={() => {
            setSelectedDay(null);
            setIndex((i) => Math.min(months.length - 1, i + 1));
          }}
        >
          ›
        </button>
        {hasUpcoming && (
          <button
            className="season-calendar-bulk"
            onClick={() =>
              downloadIcs(icsBulkFilename(team), buildCalendar(team, league, upcomingGames))
            }
          >
            ➕ Add all upcoming
          </button>
        )}
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
          const games = gamesByDay.get(key) ?? [];
          return (
            <div
              key={key}
              className={`season-calendar-day${key === todayKey ? " today" : ""}`}
            >
              <span className="season-calendar-daynum">{day}</span>
              {games.map((g) => {
                const opp = g.isHome ? g.awayTeam.abbreviation : g.homeTeam.abbreviation;
                const played = g.status === "final";
                return (
                  <button
                    key={g.id}
                    className={`season-calendar-chip${played ? " past" : ""}`}
                    aria-label={`${team.name} ${g.isHome ? "vs" : "@"} ${opp}, ${monthLabel(monthKey)} ${day}`}
                    onClick={() => setSelectedDay(key)}
                  >
                    {g.isHome ? "vs" : "@"} {opp}
                    {played && g.result ? ` ${g.result}` : ""}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {selectedGames.length > 0 && (
        <div className="season-calendar-detail">
          <GameList showTime games={selectedGames} team={team} league={league} />
        </div>
      )}

      <div className="season-calendar-agenda" data-testid="calendar-agenda">
        <GameList showTime games={monthGames} team={team} league={league} />
      </div>
    </div>
  );
}
