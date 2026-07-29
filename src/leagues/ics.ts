import type { Game, LeagueConfig, Team } from "../domain/types";
import { espnTeamUrl, redditGameUrl, youtubeGamePreviewUrl } from "./externalLinks";

const DURATION_HOURS: Record<string, number> = {
  basketball: 2.5,
  football: 3.5,
  soccer: 2,
  baseball: 3,
  hockey: 2.5,
};
const DEFAULT_DURATION_HOURS = 2;

export function durationHours(sport: string): number {
  return DURATION_HOURS[sport] ?? DEFAULT_DURATION_HOURS;
}

// ISO instant -> "YYYYMMDDTHHMMSSZ" (UTC basic format).
function formatUtc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

// RFC 5545 text escaping for property values.
function escapeText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

// Fold long content lines: continuations start with a single space.
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let rest = line;
  chunks.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 0) {
    chunks.push(" " + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  return chunks.join("\r\n");
}

function opponentAbbr(game: Game): string {
  return game.isHome ? game.awayTeam.abbreviation : game.homeTeam.abbreviation;
}

function summary(team: Team, league: LeagueConfig, game: Game): string {
  const vs = game.isHome ? "vs" : "@";
  const badge =
    game.competition && !game.competition.primary ? ` (${game.competition.shortName})` : "";
  return `${league.icon} ${team.name} ${vs} ${opponentAbbr(game)}${badge}`;
}

function description(team: Team, league: LeagueConfig, game: Game): string {
  return [
    `Preview: ${youtubeGamePreviewUrl(team, game)}`,
    `Discussion: ${redditGameUrl(team, game)}`,
    `ESPN: ${espnTeamUrl(team, league)}`,
  ].join("\n");
}

export function buildEvent(team: Team, league: LeagueConfig, game: Game, now: Date = new Date()): string {
  const start = new Date(game.date);
  const end = new Date(start.getTime() + durationHours(league.sport) * 3_600_000);
  return [
    "BEGIN:VEVENT",
    `UID:${game.id}@league-status`,
    `DTSTAMP:${formatUtc(now)}`,
    `DTSTART:${formatUtc(start)}`,
    `DTEND:${formatUtc(end)}`,
    `SUMMARY:${escapeText(summary(team, league, game))}`,
    `DESCRIPTION:${escapeText(description(team, league, game))}`,
    "END:VEVENT",
  ]
    .map(foldLine)
    .join("\r\n");
}

export function buildCalendar(team: Team, league: LeagueConfig, games: Game[], now: Date = new Date()): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//league-status//EN",
    "CALSCALE:GREGORIAN",
    ...games.map((g) => buildEvent(team, league, g, now)),
    "END:VCALENDAR",
  ].join("\r\n");
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function icsFilename(team: Team, game: Game): string {
  const date = new Date(game.date).toISOString().slice(0, 10);
  const vs = game.isHome ? "vs" : "at";
  return `${slug(team.name)}-${vs}-${slug(opponentAbbr(game))}-${date}.ics`;
}

export function icsBulkFilename(team: Team): string {
  return `${slug(team.name)}-upcoming.ics`;
}

export function downloadIcs(filename: string, ics: string): void {
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
