import type { Game, SeasonProgress, SeasonStatus, Standing } from "../domain/types";
import type { RawStanding, SeasonInput } from "./types";
import { parseStandingSummary } from "./standingText";

export const PLAYOFF_COUNTDOWN_WEEKS = 10;
// If the next game is more than this many weeks away, treat the team as off
// season — the schedule may already list next season's games. This threshold
// sits above any in-season break (All-Star, Olympic) and below any offseason.
export const OFFSEASON_GAP_WEEKS = 6;
const WEEK_MS = 7 * 86400000;

function byDateAsc(a: Game, b: Game): number {
  return Date.parse(a.date) - Date.parse(b.date);
}

// Whether a game counts toward the primary/regular season: multi-competition
// leagues tag games with a competition (primary = the league itself); others
// fall back to season type.
export function isPrimaryRegular(g: Game): boolean {
  return g.competition ? g.competition.primary : g.seasonType === "regular";
}

// How far through the season a team is: completed games / total, plus the last
// counted game's date. For multi-competition leagues (competition-tagged games)
// only the primary competition counts, so cup ties don't inflate the league
// season's N%. For single-competition leagues it falls back to season type.
// Undefined when there are no games to count.
export function seasonProgress(games: Game[]): SeasonProgress | undefined {
  const regular = games.filter(isPrimaryRegular);
  if (regular.length === 0) return undefined;
  const total = regular.length;
  const played = regular.filter((g) => g.status === "final").length;
  const endDate = regular.reduce((max, g) => (g.date > max ? g.date : max), regular[0].date);
  return { played, total, percent: Math.round((played / total) * 100), endDate };
}

// Presentation-layer selection: optionally keep only home games, then cap to a
// limit. Kept separate from splitGames so the home filter runs across the full
// schedule (yielding the next/last N *home* games, not home games among the next N).
export function selectGames(
  games: Game[],
  { homeOnly, limit }: { homeOnly: boolean; limit: number },
): Game[] {
  const filtered = homeOnly ? games.filter((g) => g.isHome) : games;
  return filtered.slice(0, limit);
}

export function standingSummary(raw: RawStanding): Standing {
  const parsed = raw.standingSummaryText
    ? parseStandingSummary(raw.standingSummaryText)
    : {};
  return {
    overall: raw.recordSummary,
    summary: raw.standingSummaryText,
    ...parsed,
  };
}

export function splitGames(games: Game[], now: Date) {
  const t = now.getTime();
  const past = games
    .filter((g) => Date.parse(g.date) < t)
    .sort((a, b) => byDateAsc(b, a)); // desc
  const upcoming = games
    .filter((g) => Date.parse(g.date) >= t)
    .sort(byDateAsc); // asc
  return { past, upcoming };
}

export function seasonStatus({ games, now }: SeasonInput): SeasonStatus {
  const t = now.getTime();
  const future = games
    .filter((g) => Date.parse(g.date) >= t)
    .sort(byDateAsc);

  if (future.length === 0) {
    return { phase: "offseason", label: "OFF SEASON" };
  }

  // Next game far in the future → between seasons, not in season.
  const weeksToNext = Math.ceil((Date.parse(future[0].date) - t) / WEEK_MS);
  if (weeksToNext > OFFSEASON_GAP_WEEKS) {
    return { phase: "offseason", label: "OFF SEASON" };
  }

  if (future[0].seasonType === "postseason") {
    return { phase: "playoffs", label: "PLAYOFFS" };
  }

  const firstPost = future.find((g) => g.seasonType === "postseason");
  if (firstPost) {
    const weeks = Math.ceil((Date.parse(firstPost.date) - t) / WEEK_MS);
    if (weeks <= PLAYOFF_COUNTDOWN_WEEKS) {
      const unit = weeks === 1 ? "WEEK" : "WEEKS";
      return {
        phase: "playoffs_upcoming",
        label: `PLAYOFFS IN ${weeks} ${unit}`,
        weeksUntilPlayoffs: weeks,
      };
    }
  }

  return { phase: "in_season", label: "IN SEASON", progress: seasonProgress(games) };
}
