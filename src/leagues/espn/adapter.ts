import type { Competition, Game, LeagueConfig } from "../../domain/types";
import type { LeagueAdapter } from "../types";
import {
  espnUrls,
  fetchJson,
  type EspnEvent,
  type EspnPath,
  type EspnScheduleResponse,
  type EspnStandingsResponse,
  type EspnTeamResponse,
} from "./client";
import { mapGame, mapStanding, mapStandings, mapTeam } from "./mappers";
import { TEAMS_BY_LEAGUE } from "../teamsData";
import {
  currentSoccerSeasonYear,
  monthlyChunks,
  seasonWindow,
} from "./seasonWindow";

function eventHasTeam(event: EspnEvent, teamId: string): boolean {
  return (
    event.competitions[0]?.competitors.some((c) => c.team.id === teamId) ?? false
  );
}

// Season-start gap: ESPN's team-schedule endpoint returns no events for a
// not-yet-underway soccer season even though fixtures exist. Backfill from the
// league scoreboard across the season window (monthly chunks; the endpoint caps
// at 100 events/response), keep only the followed team's fixtures, and tag them
// with the primary competition. Self-heals once ESPN populates the schedule.
async function fetchScoreboardGames(
  path: EspnPath,
  teamId: string,
  competition: Competition,
  seasonYear: number | undefined,
): Promise<Game[]> {
  const year = seasonYear ?? currentSoccerSeasonYear(new Date());
  const { start, end } = seasonWindow(year);
  const chunks = monthlyChunks(start, end);
  const perChunk = await Promise.all(
    chunks.map(async (c) => {
      try {
        const res = await fetchJson<EspnScheduleResponse>(
          espnUrls.scoreboard(path, `${c.start}-${c.end}`),
        );
        return res.events ?? [];
      } catch {
        return [];
      }
    }),
  );
  const byId = new Map<string, EspnEvent>();
  for (const e of perChunk.flat()) {
    if (!byId.has(e.id) && eventHasTeam(e, teamId)) byId.set(e.id, e);
  }
  return [...byId.values()]
    .map((e) => mapGame(e, teamId, competition))
    .filter((g): g is Game => g !== undefined);
}

export function createEspnAdapter(config: LeagueConfig): LeagueAdapter {
  return {
    async fetchTeam(teamId) {
      const res = await fetchJson<EspnTeamResponse>(
        espnUrls.team(config, teamId),
      );
      return { team: mapTeam(res, config.id), standing: mapStanding(res) };
    },

    async fetchSchedule(teamId) {
      // Single-competition (US) leagues: one schedule fetch, no competition tag.
      if (!config.competitions) {
        const res = await fetchJson<EspnScheduleResponse>(
          espnUrls.schedule(config, teamId),
        );
        return (res.events ?? [])
          .map((e) => mapGame(e, teamId))
          .filter((g): g is Game => g !== undefined);
      }

      // Multi-competition leagues (e.g. Premier League): fetch every competition's
      // schedule in parallel, tag each fixture with its competition, and merge/sort
      // by date. A competition that errors or returns no events drops out — except
      // the primary competition, which backfills from the scoreboard when its
      // schedule is empty (see fetchScoreboardGames).
      const perCompetition = await Promise.all(
        config.competitions.map(async (competition) => {
          try {
            const res = await fetchJson<EspnScheduleResponse>(
              espnUrls.schedule(
                { sport: config.sport, league: competition.slug },
                teamId,
              ),
            );
            const events = res.events ?? [];
            if (events.length === 0 && competition.primary) {
              return await fetchScoreboardGames(
                { sport: config.sport, league: competition.slug },
                teamId,
                competition,
                res.season?.year,
              );
            }
            return events
              .map((e) => mapGame(e, teamId, competition))
              .filter((g): g is Game => g !== undefined);
          } catch {
            return [];
          }
        }),
      );
      return perCompetition
        .flat()
        .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
    },

    async fetchStandings() {
      const res = await fetchJson<EspnStandingsResponse>(
        espnUrls.standings(config),
      );
      return mapStandings(res);
    },

    // ESPN's /teams list endpoint is not CORS-enabled, so we search bundled
    // reference data (regenerate with scripts/generate-teams.mjs) instead of
    // fetching. Rosters are small and stable, so this stays fresh enough.
    async searchTeams(query) {
      const all = TEAMS_BY_LEAGUE[config.id] ?? [];
      const q = query.trim().toLowerCase();
      if (!q) return all;
      return all.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.abbreviation.toLowerCase().includes(q),
      );
    },
  };
}
