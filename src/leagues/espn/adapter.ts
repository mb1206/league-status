import type { LeagueConfig } from "../../domain/types";
import type { LeagueAdapter } from "../types";
import {
  espnUrls,
  fetchJson,
  type EspnScheduleResponse,
  type EspnTeamResponse,
} from "./client";
import { mapGame, mapStanding, mapTeam } from "./mappers";
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
      const res = await fetchJson<EspnScheduleResponse>(
        espnUrls.schedule(config, teamId),
      );
      return (res.events ?? []).map((e) => mapGame(e, teamId));
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
