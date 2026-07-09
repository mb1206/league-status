import type {
  Game,
  GameStatus,
  SeasonType,
  Team,
  GameTeamRef,
} from "../../domain/types";
import type { RawStanding } from "../types";
import type {
  EspnCompetitor,
  EspnEvent,
  EspnTeamResponse,
} from "./client";

export function parseScore(
  raw: EspnCompetitor["score"],
): number | undefined {
  if (raw == null) return undefined;
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const n = Number(raw);
    return Number.isNaN(n) ? undefined : n;
  }
  return raw.value;
}

const ORDINAL = /^(\d+)(?:st|nd|rd|th)\s+in\s+(.+)$/i;

export function parseStandingSummary(text: string): {
  divisionRank?: number;
  divisionName?: string;
} {
  const m = text.trim().match(ORDINAL);
  if (!m) return {};
  const divisionName = m[2].replace(/\s+Division$/i, "").trim();
  return { divisionRank: Number(m[1]), divisionName };
}

export function mapTeam(res: EspnTeamResponse, leagueId: string): Team {
  return {
    id: res.team.id,
    leagueId,
    name: res.team.displayName,
    abbreviation: res.team.abbreviation,
    logoUrl: res.team.logos?.[0]?.href,
  };
}

export function mapStanding(res: EspnTeamResponse): RawStanding {
  return {
    recordSummary: res.team.record?.items?.[0]?.summary ?? "",
    standingSummaryText: res.standingSummary,
  };
}

function mapSeasonType(type: number | undefined): SeasonType {
  if (type === 3) return "postseason";
  if (type === 1) return "preseason";
  return "regular";
}

function mapStatus(state: "pre" | "in" | "post"): GameStatus {
  if (state === "in") return "in_progress";
  if (state === "post") return "final";
  return "scheduled";
}

function toRef(c: EspnCompetitor): GameTeamRef {
  return {
    id: c.team.id,
    abbreviation: c.team.abbreviation,
    score: parseScore(c.score),
  };
}

export function mapGame(event: EspnEvent, followedTeamId: string): Game {
  const comp = event.competitions[0];
  const home = comp.competitors.find((c) => c.homeAway === "home")!;
  const away = comp.competitors.find((c) => c.homeAway === "away")!;
  const mine = comp.competitors.find((c) => c.team.id === followedTeamId);
  const status = mapStatus(comp.status.type.state);

  let result: "W" | "L" | undefined;
  if (status === "final" && mine?.winner !== undefined) {
    result = mine.winner ? "W" : "L";
  }

  return {
    id: event.id,
    date: event.date,
    status,
    seasonType: mapSeasonType(event.seasonType?.type),
    homeTeam: toRef(home),
    awayTeam: toRef(away),
    isHome: mine?.homeAway === "home",
    result,
  };
}
