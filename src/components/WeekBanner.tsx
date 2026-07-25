import type { DayGroup } from "../leagues/upcomingWeek";

interface WeekBannerProps {
  groups: DayGroup[];
  activeLeague?: string | null;
}

function timeText(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function WeekBanner({ groups, activeLeague = null }: WeekBannerProps) {
  // Respect the sport filter, but only when the active league actually has games
  // here; a stale filter falls back to showing everything.
  const hasActive =
    activeLeague !== null &&
    groups.some((g) => g.games.some((game) => game.leagueId === activeLeague));
  const filtered = hasActive
    ? groups
        .map((g) => ({ ...g, games: g.games.filter((game) => game.leagueId === activeLeague) }))
        .filter((g) => g.games.length > 0)
    : groups;

  const empty = filtered.every((g) => g.games.length === 0);

  return (
    <section className="week-banner" aria-label="Games in the next 7 days">
      <h2 className="week-banner-title">Next 7 Days</h2>
      {empty ? (
        <p className="week-banner-empty">No games in the next 7 days.</p>
      ) : (
        <div className="week-strip">
          {filtered.map((group) => (
            <div key={group.key} className="week-day">
              <div className="week-day-label">{group.label}</div>
              <div className="week-day-games">
                {group.games.map((game, i) => (
                  <a
                    key={`${game.leagueId}:${game.teamId}:${i}`}
                    className="week-card"
                    href={`#team-${game.leagueId}-${game.teamId}`}
                    aria-label={`${game.teamAbbr} ${game.opponent}`}
                  >
                    <span className="week-card-team">
                      <span aria-hidden>{game.icon}</span> {game.teamAbbr}
                    </span>
                    <span className="week-card-opp">{game.opponent}</span>
                    <span className="week-card-time">{timeText(game.date)}</span>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
