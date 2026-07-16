import type { LeagueConfig } from "../../domain/types";
import type { LeagueAdapter } from "../types";
import {
  espnUrls,
  fetchJson,
  type EspnScheduleResponse,
  type EspnStandingsResponse,
  type EspnTeamResponse,
} from "./client";
import { mapGame, mapStanding, mapStandings, mapTeam } from "./mappers";
import { TEAMS_BY_LEAGUE } from "../teamsData";

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
        return (res.events ?? []).map((e) => mapGame(e, teamId));
      }

      // Multi-competition leagues (e.g. Premier League): fetch every competition's
      // schedule in parallel, tag each fixture with its competition, and drop any
      // competition that errors or returns no events. Merge and sort by date.
      const perCompetition = await Promise.all(
        config.competitions.map(async (competition) => {
          try {
            const res = await fetchJson<EspnScheduleResponse>(
              espnUrls.schedule(
                { sport: config.sport, league: competition.slug },
                teamId,
              ),
            );
            return (res.events ?? []).map((e) => mapGame(e, teamId, competition));
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
