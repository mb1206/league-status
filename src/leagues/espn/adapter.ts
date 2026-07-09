import type { LeagueConfig, Team } from "../../domain/types";
import type { LeagueAdapter } from "../types";
import {
  espnUrls,
  fetchJson,
  type EspnScheduleResponse,
  type EspnTeamResponse,
  type EspnTeamsResponse,
} from "./client";
import { mapGame, mapStanding, mapTeam } from "./mappers";

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

    async searchTeams(query) {
      const res = await fetchJson<EspnTeamsResponse>(espnUrls.teams(config));
      const all: Team[] = (res.sports?.[0]?.leagues?.[0]?.teams ?? []).map(
        (t) => ({
          id: t.team.id,
          leagueId: config.id,
          name: t.team.displayName,
          abbreviation: t.team.abbreviation,
          logoUrl: t.team.logos?.[0]?.href,
        }),
      );
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
