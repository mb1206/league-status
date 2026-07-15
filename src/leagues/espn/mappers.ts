import type {
  Game,
  GameStatus,
  SeasonType,
  Team,
  GameTeamRef,
} from "../../domain/types";
import type { DivisionEntry, DivisionStanding } from "../../domain/types";
import type { RawStanding } from "../types";
import type {
  EspnCompetitor,
  EspnEvent,
  EspnStandingsEntry,
  EspnStandingsGroup,
  EspnStandingsResponse,
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
    standingSummaryText: res.team.standingSummary ?? res.standingSummary,
  };
}

function mapStandingsEntry(e: EspnStandingsEntry): DivisionEntry {
  return {
    teamId: e.team.id,
    name: e.team.displayName,
    abbreviation: e.team.abbreviation,
    logoUrl: e.team.logos?.[0]?.href,
    record: e.stats?.find((s) => s.name === "overall")?.displayValue ?? "",
  };
}

// Walk the conference→division tree, collecting the leaf groups that actually hold
// team entries. Leagues with sub-divisions (NBA/NFL) yield divisions; leagues that
// group only by conference (WNBA) yield conferences.
function collectLeafGroups(group: EspnStandingsGroup): DivisionStanding[] {
  if (group.children?.length) return group.children.flatMap(collectLeafGroups);
  if (group.standings?.entries.length) {
    return [{ name: group.name, entries: group.standings.entries.map(mapStandingsEntry) }];
  }
  return [];
}

export function mapStandings(res: EspnStandingsResponse): DivisionStanding[] {
  return (res.children ?? []).flatMap(collectLeafGroups);
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
