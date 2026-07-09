export interface EspnPath {
  sport: string;
  league: string;
}

const BASE = "https://site.api.espn.com/apis/site/v2/sports";

export const espnUrls = {
  team: (p: EspnPath, teamId: string) =>
    `${BASE}/${p.sport}/${p.league}/teams/${teamId}`,
  schedule: (p: EspnPath, teamId: string) =>
    `${BASE}/${p.sport}/${p.league}/teams/${teamId}/schedule`,
  teams: (p: EspnPath) => `${BASE}/${p.sport}/${p.league}/teams`,
};

export async function fetchJson<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`ESPN request failed: ${res.status} (${url})`);
  }
  return (await res.json()) as T;
}

// --- Raw ESPN response shapes (only the fields we read) ---

export interface EspnTeamResponse {
  team: {
    id: string;
    displayName: string;
    abbreviation: string;
    logos?: { href: string }[];
    record?: { items?: { summary: string }[] };
    standingSummary?: string;
  };
  standingSummary?: string;
}

export interface EspnCompetitor {
  homeAway: "home" | "away";
  winner?: boolean;
  score?: string | number | { value?: number; displayValue?: string };
  team: { id: string; abbreviation: string };
}

export interface EspnEvent {
  id: string;
  date: string;
  seasonType?: { type: number };
  competitions: {
    competitors: EspnCompetitor[];
    status: { type: { state: "pre" | "in" | "post" } };
  }[];
}

export interface EspnScheduleResponse {
  events: EspnEvent[];
}

export interface EspnTeamsResponse {
  sports: {
    leagues: {
      teams: {
        team: {
          id: string;
          displayName: string;
          abbreviation: string;
          logos?: { href: string }[];
        };
      }[];
    }[];
  }[];
}
