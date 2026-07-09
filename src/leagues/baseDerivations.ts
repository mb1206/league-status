import type { Game, SeasonStatus, Standing } from "../domain/types";
import type { LeagueDerivations, RawStanding, SeasonInput } from "./types";
import { parseStandingSummary } from "./standingText";

export const PLAYOFF_COUNTDOWN_WEEKS = 10;
// If the next game is more than this many weeks away, treat the team as off
// season — the schedule may already list next season's games. This threshold
// sits above any in-season break (All-Star, Olympic) and below any offseason.
export const OFFSEASON_GAP_WEEKS = 6;
const WEEK_MS = 7 * 86400000;
const MAX_GAMES = 3;

function byDateAsc(a: Game, b: Game): number {
  return Date.parse(a.date) - Date.parse(b.date);
}

export function createBaseDerivations(): LeagueDerivations {
  return {
    standingSummary(raw: RawStanding): Standing {
      const parsed = raw.standingSummaryText
        ? parseStandingSummary(raw.standingSummaryText)
        : {};
      return {
        overall: raw.recordSummary,
        summary: raw.standingSummaryText,
        ...parsed,
      };
    },

    splitGames(games: Game[], now: Date) {
      const t = now.getTime();
      const past = games
        .filter((g) => Date.parse(g.date) < t)
        .sort((a, b) => byDateAsc(b, a)) // desc
        .slice(0, MAX_GAMES);
      const upcoming = games
        .filter((g) => Date.parse(g.date) >= t)
        .sort(byDateAsc) // asc
        .slice(0, MAX_GAMES);
      return { past, upcoming };
    },

    seasonStatus({ games, now }: SeasonInput): SeasonStatus {
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

      return { phase: "in_season", label: "IN SEASON" };
    },
  };
}
