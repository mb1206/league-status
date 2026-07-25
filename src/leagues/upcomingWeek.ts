import type { Game, LeagueConfig, Team } from "../domain/types";

export interface WeekGame {
  leagueId: string;
  teamId: string;
  teamAbbr: string;
  icon: string;
  opponent: string; // "vs GSW" or "@ MIN"
  date: string; // ISO
}

export interface DayGroup {
  key: string; // "YYYY-MM-DD" local
  label: string; // "TODAY" or uppercase short weekday
  games: WeekGame[];
}

export interface WeekEntry {
  team: Team;
  league: LeagueConfig;
  upcomingGames: Game[];
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function dayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function buildWeek(entries: WeekEntry[], now: Date): DayGroup[] {
  const windowStart = startOfDay(now);
  const windowEnd = new Date(windowStart);
  windowEnd.setDate(windowEnd.getDate() + 7);
  const todayKey = dayKey(windowStart);

  const byDay = new Map<string, DayGroup>();

  for (const entry of entries) {
    for (const g of entry.upcomingGames) {
      const gd = new Date(g.date);
      if (gd < windowStart || gd >= windowEnd) continue;
      const key = dayKey(gd);
      let group = byDay.get(key);
      if (!group) {
        const label =
          key === todayKey
            ? "TODAY"
            : gd.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase();
        group = { key, label, games: [] };
        byDay.set(key, group);
      }
      group.games.push({
        leagueId: entry.team.leagueId,
        teamId: entry.team.id,
        teamAbbr: entry.team.abbreviation,
        icon: entry.league.icon,
        opponent: g.isHome
          ? `vs ${g.awayTeam.abbreviation}`
          : `@ ${g.homeTeam.abbreviation}`,
        date: g.date,
      });
    }
  }

  const groups = [...byDay.values()].sort((a, b) => a.key.localeCompare(b.key));
  for (const group of groups) {
    group.games.sort((a, b) => a.date.localeCompare(b.date));
  }
  return groups;
}
