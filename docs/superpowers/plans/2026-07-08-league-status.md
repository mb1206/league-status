# League Status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A static web dashboard that shows, for each followed sports team, a season-status banner (standing + phase) plus upcoming and past games — starting with the NBA, architected to extend to more leagues.

**Architecture:** UI talks only to a normalized domain model. A per-league `LeagueModule` (config + ESPN adapter + pure derivations) sits behind a registry. Each `TeamPanel` fetches its own data in parallel via TanStack Query; no page-level suspense, per-panel loading/error isolation.

**Tech Stack:** React 19 + TypeScript + Vite, TanStack Query, Vitest + @testing-library/react, deploy to GitHub Pages via `gh-pages`.

---

## Confirmed ESPN Endpoints (verified live 2026-07-08)

Base: `https://site.api.espn.com/apis/site/v2/sports/{sport}/{league}`

| Purpose | URL | Key paths |
|---|---|---|
| Team + standing | `/teams/{teamId}` | `team.id`, `team.displayName`, `team.abbreviation`, `team.logos[0].href`, `team.record.items[0].summary` (`"53-29"`), `standingSummary` (`"1st in Pacific Division"`) |
| Schedule | `/teams/{teamId}/schedule` | `events[].id`, `events[].date`, `events[].seasonType.type` (2=regular, 3=post), `events[].competitions[0].competitors[].{homeAway, team.id, team.abbreviation, score, winner}`, `events[].competitions[0].status.type.state` (`pre`/`in`/`post`) |
| Teams list | `/teams` | `sports[0].leagues[0].teams[].team.{id, displayName, shortDisplayName, abbreviation, logos[0].href}` |

NBA: `sport=basketball`, `league=nba`. NFL: `sport=football`, `league=nfl`.

---

## File Structure

```
src/
  domain/types.ts            # normalized domain interfaces (Team, Game, Standing, SeasonStatus, TeamStatus)
  leagues/
    types.ts                 # LeagueConfig, LeagueModule, LeagueAdapter, LeagueDerivations, SeasonInput, RawStanding
    espn/
      client.ts              # URL builders + fetchJson + ESPN raw response types
      mappers.ts             # pure: parseScore, parseStandingSummary, mapTeam, mapStanding, mapGame
      adapter.ts             # createEspnAdapter(config): LeagueAdapter
    baseDerivations.ts       # createBaseDerivations(): default splitGames/standingSummary/seasonStatus
    registry.ts              # nbaModule, nflModule, LEAGUES, getLeagueModule
  hooks/
    useFollowedTeams.ts      # localStorage-backed followed-teams list
    useTeamStatus.ts         # TanStack Query per team → TeamStatus
  components/
    App.tsx
    Header.tsx
    AddTeamDialog.tsx
    TeamPanelList.tsx
    TeamPanel.tsx
    Banner.tsx
    GameList.tsx
  main.tsx                   # QueryClientProvider + render
  index.css
```

---

## Task 0: Scaffold project

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `vitest.setup.ts`

- [ ] **Step 1: Scaffold Vite React-TS and install deps**

Run from the project root (`/Users/meredithburkle/Source/league-status`):

```bash
npm create vite@latest . -- --template react-ts
npm install
npm install @tanstack/react-query
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event gh-pages
```

If `npm create vite` refuses because the directory is non-empty, run it in a temp dir and copy files in, preserving the existing `docs/` and `.git/`.

- [ ] **Step 2: Configure Vite for tests + GitHub Pages base**

Replace `vite.config.ts` with:

```ts
/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/league-status/", // GitHub Pages project path
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./vitest.setup.ts",
  },
});
```

- [ ] **Step 3: Add test setup file**

Create `vitest.setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: Add scripts to package.json**

Ensure `package.json` `scripts` contains:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:run": "vitest run",
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  }
}
```

- [ ] **Step 5: Verify it builds and tests run**

Run: `npm run build && npm run test:run`
Expected: build succeeds; Vitest reports "no tests found" (exit 0) or passes.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite React-TS app with Vitest and TanStack Query"
```

---

## Task 1: Domain and league types

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/leagues/types.ts`

- [ ] **Step 1: Write the domain types**

Create `src/domain/types.ts`:

```ts
export interface LeagueConfig {
  id: string; // "nba"
  sport: string; // ESPN sport path: "basketball"
  league: string; // ESPN league path: "nba"
  displayName: string; // "NBA"
  icon: string; // "🏀"
}

export interface Team {
  id: string;
  leagueId: string;
  name: string; // "Los Angeles Lakers"
  abbreviation: string; // "LAL"
  logoUrl?: string;
}

export interface GameTeamRef {
  id: string;
  abbreviation: string;
  score?: number;
}

export type GameStatus = "scheduled" | "in_progress" | "final";
export type SeasonType = "preseason" | "regular" | "postseason";

export interface Game {
  id: string;
  date: string; // ISO
  status: GameStatus;
  seasonType: SeasonType;
  homeTeam: GameTeamRef;
  awayTeam: GameTeamRef;
  isHome: boolean; // relative to followed team
  result?: "W" | "L"; // when final, relative to followed team
}

export interface Standing {
  overall: string; // "53-29"
  summary?: string; // raw ESPN text: "1st in Pacific Division"
  divisionRank?: number; // 1
  divisionName?: string; // "Pacific"
}

export type SeasonPhase =
  | "offseason"
  | "in_season"
  | "playoffs_upcoming"
  | "playoffs";

export interface SeasonStatus {
  phase: SeasonPhase;
  label: string; // "PLAYOFFS IN 3 WEEKS"
  weeksUntilPlayoffs?: number;
}

export interface TeamStatus {
  team: Team;
  league: LeagueConfig;
  standing: Standing;
  seasonStatus: SeasonStatus;
  pastGames: Game[];
  upcomingGames: Game[];
}
```

- [ ] **Step 2: Write the league (port) types**

Create `src/leagues/types.ts`:

```ts
import type {
  Game,
  LeagueConfig,
  Standing,
  SeasonStatus,
  Team,
} from "../domain/types";

// Raw standing as the adapter extracts it, before derivation parses it.
export interface RawStanding {
  recordSummary: string; // "53-29"
  standingSummaryText?: string; // "1st in Pacific Division"
}

export interface SeasonInput {
  games: Game[]; // full season schedule, mapped to domain Games
  now: Date;
}

export interface LeagueAdapter {
  fetchTeam(teamId: string): Promise<{ team: Team; standing: RawStanding }>;
  fetchSchedule(teamId: string): Promise<Game[]>;
  searchTeams(query: string): Promise<Team[]>;
}

export interface LeagueDerivations {
  seasonStatus(input: SeasonInput): SeasonStatus;
  standingSummary(raw: RawStanding): Standing;
  splitGames(games: Game[], now: Date): { past: Game[]; upcoming: Game[] };
}

export interface LeagueModule {
  config: LeagueConfig;
  adapter: LeagueAdapter;
  derivations: LeagueDerivations;
}
```

- [ ] **Step 3: Verify it typechecks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/domain/types.ts src/leagues/types.ts
git commit -m "feat: add domain and league port types"
```

---

## Task 2: ESPN client (URL builders + fetch)

**Files:**
- Create: `src/leagues/espn/client.ts`
- Test: `src/leagues/espn/client.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/leagues/espn/client.test.ts`:

```ts
import { describe, expect, it, vi, afterEach } from "vitest";
import { espnUrls, fetchJson } from "./client";

const cfg = { sport: "basketball", league: "nba" };

describe("espnUrls", () => {
  it("builds team, schedule, and teams-list urls", () => {
    const base =
      "https://site.api.espn.com/apis/site/v2/sports/basketball/nba";
    expect(espnUrls.team(cfg, "13")).toBe(`${base}/teams/13`);
    expect(espnUrls.schedule(cfg, "13")).toBe(`${base}/teams/13/schedule`);
    expect(espnUrls.teams(cfg)).toBe(`${base}/teams`);
  });
});

describe("fetchJson", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns parsed json on ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ a: 1 }) }),
    );
    await expect(fetchJson("http://x")).resolves.toEqual({ a: 1 });
  });

  it("throws on non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500 }),
    );
    await expect(fetchJson("http://x")).rejects.toThrow("500");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/leagues/espn/client.test.ts`
Expected: FAIL — cannot find module `./client`.

- [ ] **Step 3: Write the implementation**

Create `src/leagues/espn/client.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/leagues/espn/client.test.ts`
Expected: PASS (5 assertions).

- [ ] **Step 5: Commit**

```bash
git add src/leagues/espn/client.ts src/leagues/espn/client.test.ts
git commit -m "feat: add ESPN client url builders and fetchJson"
```

---

## Task 3: Mappers (raw ESPN → domain)

**Files:**
- Create: `src/leagues/espn/mappers.ts`
- Test: `src/leagues/espn/mappers.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/leagues/espn/mappers.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  parseScore,
  parseStandingSummary,
  mapTeam,
  mapStanding,
  mapGame,
} from "./mappers";
import type { EspnEvent, EspnTeamResponse } from "./client";

describe("parseScore", () => {
  it("handles number, string, object, and missing", () => {
    expect(parseScore(112)).toBe(112);
    expect(parseScore("104")).toBe(104);
    expect(parseScore({ value: 98 })).toBe(98);
    expect(parseScore(undefined)).toBeUndefined();
  });
});

describe("parseStandingSummary", () => {
  it("parses rank and division, stripping 'Division'", () => {
    expect(parseStandingSummary("1st in Pacific Division")).toEqual({
      divisionRank: 1,
      divisionName: "Pacific",
    });
  });
  it("parses NFL-style without 'Division'", () => {
    expect(parseStandingSummary("2nd in NFC West")).toEqual({
      divisionRank: 2,
      divisionName: "NFC West",
    });
  });
  it("returns empty object when unparseable", () => {
    expect(parseStandingSummary("")).toEqual({});
  });
});

const teamResponse: EspnTeamResponse = {
  team: {
    id: "13",
    displayName: "Los Angeles Lakers",
    abbreviation: "LAL",
    logos: [{ href: "https://logo/lal.png" }],
    record: { items: [{ summary: "53-29" }] },
  },
  standingSummary: "1st in Pacific Division",
};

describe("mapTeam", () => {
  it("maps team meta into domain Team", () => {
    expect(mapTeam(teamResponse, "nba")).toEqual({
      id: "13",
      leagueId: "nba",
      name: "Los Angeles Lakers",
      abbreviation: "LAL",
      logoUrl: "https://logo/lal.png",
    });
  });
});

describe("mapStanding", () => {
  it("extracts record summary and standing text", () => {
    expect(mapStanding(teamResponse)).toEqual({
      recordSummary: "53-29",
      standingSummaryText: "1st in Pacific Division",
    });
  });
});

const finalEvent: EspnEvent = {
  id: "401",
  date: "2026-04-01T02:30Z",
  seasonType: { type: 2 },
  competitions: [
    {
      status: { type: { state: "post" } },
      competitors: [
        {
          homeAway: "home",
          winner: true,
          score: { value: 112 },
          team: { id: "13", abbreviation: "LAL" },
        },
        {
          homeAway: "away",
          winner: false,
          score: { value: 104 },
          team: { id: "2", abbreviation: "BOS" },
        },
      ],
    },
  ],
};

describe("mapGame", () => {
  it("maps a final home win relative to followed team 13", () => {
    const g = mapGame(finalEvent, "13");
    expect(g).toMatchObject({
      id: "401",
      status: "final",
      seasonType: "regular",
      isHome: true,
      result: "W",
      homeTeam: { id: "13", abbreviation: "LAL", score: 112 },
      awayTeam: { id: "2", abbreviation: "BOS", score: 104 },
    });
  });

  it("marks postseason and away loss relative to team 2", () => {
    const post: EspnEvent = {
      ...finalEvent,
      seasonType: { type: 3 },
    };
    const g = mapGame(post, "2");
    expect(g.seasonType).toBe("postseason");
    expect(g.isHome).toBe(false);
    expect(g.result).toBe("L");
  });

  it("has no result for a scheduled game", () => {
    const scheduled: EspnEvent = {
      id: "500",
      date: "2026-11-01T02:30Z",
      seasonType: { type: 2 },
      competitions: [
        {
          status: { type: { state: "pre" } },
          competitors: [
            { homeAway: "home", team: { id: "13", abbreviation: "LAL" } },
            { homeAway: "away", team: { id: "9", abbreviation: "GSW" } },
          ],
        },
      ],
    };
    const g = mapGame(scheduled, "13");
    expect(g.status).toBe("scheduled");
    expect(g.result).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/leagues/espn/mappers.test.ts`
Expected: FAIL — cannot find module `./mappers`.

- [ ] **Step 3: Write the implementation**

Create `src/leagues/espn/mappers.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/leagues/espn/mappers.test.ts`
Expected: PASS (all groups).

- [ ] **Step 5: Commit**

```bash
git add src/leagues/espn/mappers.ts src/leagues/espn/mappers.test.ts
git commit -m "feat: add ESPN → domain mappers"
```

---

## Task 4: ESPN adapter factory

**Files:**
- Create: `src/leagues/espn/adapter.ts`
- Test: `src/leagues/espn/adapter.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/leagues/espn/adapter.test.ts`:

```ts
import { describe, expect, it, vi, afterEach } from "vitest";
import { createEspnAdapter } from "./adapter";
import type { LeagueConfig } from "../../domain/types";

const config: LeagueConfig = {
  id: "nba",
  sport: "basketball",
  league: "nba",
  displayName: "NBA",
  icon: "🏀",
};

function mockFetchOnce(payload: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, json: async () => payload }),
  );
}

describe("createEspnAdapter", () => {
  afterEach(() => vi.restoreAllMocks());

  it("fetchTeam returns mapped team and raw standing", async () => {
    mockFetchOnce({
      team: {
        id: "13",
        displayName: "Los Angeles Lakers",
        abbreviation: "LAL",
        logos: [{ href: "https://logo/lal.png" }],
        record: { items: [{ summary: "53-29" }] },
      },
      standingSummary: "1st in Pacific Division",
    });
    const adapter = createEspnAdapter(config);
    const { team, standing } = await adapter.fetchTeam("13");
    expect(team.name).toBe("Los Angeles Lakers");
    expect(team.leagueId).toBe("nba");
    expect(standing).toEqual({
      recordSummary: "53-29",
      standingSummaryText: "1st in Pacific Division",
    });
  });

  it("fetchSchedule maps events relative to the followed team", async () => {
    mockFetchOnce({
      events: [
        {
          id: "401",
          date: "2026-04-01T02:30Z",
          seasonType: { type: 2 },
          competitions: [
            {
              status: { type: { state: "post" } },
              competitors: [
                {
                  homeAway: "home",
                  winner: true,
                  score: { value: 112 },
                  team: { id: "13", abbreviation: "LAL" },
                },
                {
                  homeAway: "away",
                  winner: false,
                  score: { value: 104 },
                  team: { id: "2", abbreviation: "BOS" },
                },
              ],
            },
          ],
        },
      ],
    });
    const adapter = createEspnAdapter(config);
    const games = await adapter.fetchSchedule("13");
    expect(games).toHaveLength(1);
    expect(games[0]).toMatchObject({ isHome: true, result: "W" });
  });

  it("searchTeams filters the teams list case-insensitively", async () => {
    mockFetchOnce({
      sports: [
        {
          leagues: [
            {
              teams: [
                {
                  team: {
                    id: "13",
                    displayName: "Los Angeles Lakers",
                    abbreviation: "LAL",
                    logos: [{ href: "https://logo/lal.png" }],
                  },
                },
                {
                  team: {
                    id: "2",
                    displayName: "Boston Celtics",
                    abbreviation: "BOS",
                    logos: [{ href: "https://logo/bos.png" }],
                  },
                },
              ],
            },
          ],
        },
      ],
    });
    const adapter = createEspnAdapter(config);
    const results = await adapter.searchTeams("laker");
    expect(results).toHaveLength(1);
    expect(results[0].abbreviation).toBe("LAL");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/leagues/espn/adapter.test.ts`
Expected: FAIL — cannot find module `./adapter`.

- [ ] **Step 3: Write the implementation**

Create `src/leagues/espn/adapter.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/leagues/espn/adapter.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/leagues/espn/adapter.ts src/leagues/espn/adapter.test.ts
git commit -m "feat: add ESPN adapter factory"
```

---

## Task 5: Base derivations (splitGames, standingSummary, seasonStatus)

**Files:**
- Create: `src/leagues/baseDerivations.ts`
- Test: `src/leagues/baseDerivations.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/leagues/baseDerivations.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createBaseDerivations, PLAYOFF_COUNTDOWN_WEEKS } from "./baseDerivations";
import type { Game } from "../domain/types";

const d = createBaseDerivations();
const NOW = new Date("2026-01-15T00:00:00Z");

function game(partial: Partial<Game>): Game {
  return {
    id: "x",
    date: "2026-01-10T00:00:00Z",
    status: "scheduled",
    seasonType: "regular",
    isHome: true,
    homeTeam: { id: "13", abbreviation: "LAL" },
    awayTeam: { id: "2", abbreviation: "BOS" },
    ...partial,
  };
}

function daysFromNow(n: number): string {
  return new Date(NOW.getTime() + n * 86400000).toISOString();
}

describe("standingSummary", () => {
  it("combines record and parsed standing text", () => {
    expect(
      d.standingSummary({
        recordSummary: "53-29",
        standingSummaryText: "1st in Pacific Division",
      }),
    ).toEqual({
      overall: "53-29",
      summary: "1st in Pacific Division",
      divisionRank: 1,
      divisionName: "Pacific",
    });
  });
});

describe("splitGames", () => {
  it("returns most-recent past (desc) and soonest upcoming (asc), max 3 each", () => {
    const games = [
      game({ id: "p1", date: daysFromNow(-5), status: "final" }),
      game({ id: "p2", date: daysFromNow(-1), status: "final" }),
      game({ id: "p3", date: daysFromNow(-10), status: "final" }),
      game({ id: "p4", date: daysFromNow(-20), status: "final" }),
      game({ id: "u1", date: daysFromNow(2) }),
      game({ id: "u2", date: daysFromNow(1) }),
      game({ id: "u3", date: daysFromNow(9) }),
      game({ id: "u4", date: daysFromNow(20) }),
    ];
    const { past, upcoming } = d.splitGames(games, NOW);
    expect(past.map((g) => g.id)).toEqual(["p2", "p1", "p3"]);
    expect(upcoming.map((g) => g.id)).toEqual(["u2", "u1", "u3"]);
  });
});

describe("seasonStatus", () => {
  it("OFF_SEASON when there are no future games", () => {
    const games = [game({ date: daysFromNow(-3), status: "final" })];
    expect(d.seasonStatus({ games, now: NOW }).phase).toBe("offseason");
  });

  it("IN_SEASON when next game is regular and playoffs not near", () => {
    const games = [game({ date: daysFromNow(2), seasonType: "regular" })];
    const s = d.seasonStatus({ games, now: NOW });
    expect(s.phase).toBe("in_season");
    expect(s.label).toBe("IN SEASON");
  });

  it("PLAYOFFS when the next game is postseason", () => {
    const games = [game({ date: daysFromNow(1), seasonType: "postseason" })];
    expect(d.seasonStatus({ games, now: NOW }).label).toBe("PLAYOFFS");
  });

  it("PLAYOFFS_UPCOMING with weeks when a postseason game is within the cap", () => {
    const games = [
      game({ id: "r", date: daysFromNow(2), seasonType: "regular" }),
      game({ id: "p", date: daysFromNow(21), seasonType: "postseason" }),
    ];
    const s = d.seasonStatus({ games, now: NOW });
    expect(s.phase).toBe("playoffs_upcoming");
    expect(s.weeksUntilPlayoffs).toBe(3);
    expect(s.label).toBe("PLAYOFFS IN 3 WEEKS");
  });

  it("boundary: exactly 10 weeks shows countdown, 11 weeks does not", () => {
    const at10 = [
      game({ date: daysFromNow(2), seasonType: "regular" }),
      game({ date: daysFromNow(7 * PLAYOFF_COUNTDOWN_WEEKS), seasonType: "postseason" }),
    ];
    expect(d.seasonStatus({ games: at10, now: NOW }).phase).toBe(
      "playoffs_upcoming",
    );
    const at11 = [
      game({ date: daysFromNow(2), seasonType: "regular" }),
      game({ date: daysFromNow(7 * (PLAYOFF_COUNTDOWN_WEEKS + 1)), seasonType: "postseason" }),
    ];
    expect(d.seasonStatus({ games: at11, now: NOW }).phase).toBe("in_season");
  });

  it("singular week label for 1 week out", () => {
    const games = [
      game({ date: daysFromNow(2), seasonType: "regular" }),
      game({ date: daysFromNow(5), seasonType: "postseason" }),
    ];
    expect(d.seasonStatus({ games, now: NOW }).label).toBe(
      "PLAYOFFS IN 1 WEEK",
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/leagues/baseDerivations.test.ts`
Expected: FAIL — cannot find module `./baseDerivations`.

- [ ] **Step 3: Write the implementation**

Create `src/leagues/baseDerivations.ts`:

```ts
import type { Game, SeasonStatus, Standing } from "../domain/types";
import type { LeagueDerivations, RawStanding, SeasonInput } from "./types";
import { parseStandingSummary } from "./espn/mappers";

export const PLAYOFF_COUNTDOWN_WEEKS = 10;
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/leagues/baseDerivations.test.ts`
Expected: PASS (all groups).

- [ ] **Step 5: Commit**

```bash
git add src/leagues/baseDerivations.ts src/leagues/baseDerivations.test.ts
git commit -m "feat: add base league derivations with season-phase logic"
```

---

## Task 6: League registry (NBA + NFL)

**Files:**
- Create: `src/leagues/registry.ts`
- Test: `src/leagues/registry.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/leagues/registry.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { LEAGUES, getLeagueModule, listLeagues } from "./registry";

describe("registry", () => {
  it("registers nba and nfl", () => {
    expect(Object.keys(LEAGUES).sort()).toEqual(["nba", "nfl"]);
  });

  it("getLeagueModule returns the module with a working config", () => {
    const nba = getLeagueModule("nba");
    expect(nba.config.sport).toBe("basketball");
    expect(nba.config.icon).toBe("🏀");
    expect(typeof nba.adapter.fetchTeam).toBe("function");
    expect(typeof nba.derivations.seasonStatus).toBe("function");
  });

  it("throws for an unknown league", () => {
    expect(() => getLeagueModule("mlb")).toThrow("Unknown league");
  });

  it("listLeagues returns configs for the picker", () => {
    expect(listLeagues().map((c) => c.id).sort()).toEqual(["nba", "nfl"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/leagues/registry.test.ts`
Expected: FAIL — cannot find module `./registry`.

- [ ] **Step 3: Write the implementation**

Create `src/leagues/registry.ts`:

```ts
import type { LeagueConfig } from "../domain/types";
import type { LeagueModule } from "./types";
import { createEspnAdapter } from "./espn/adapter";
import { createBaseDerivations } from "./baseDerivations";

function espnModule(config: LeagueConfig): LeagueModule {
  return {
    config,
    adapter: createEspnAdapter(config),
    derivations: createBaseDerivations(),
  };
}

const nbaModule = espnModule({
  id: "nba",
  sport: "basketball",
  league: "nba",
  displayName: "NBA",
  icon: "🏀",
});

const nflModule = espnModule({
  id: "nfl",
  sport: "football",
  league: "nfl",
  displayName: "NFL",
  icon: "🏈",
});

export const LEAGUES: Record<string, LeagueModule> = {
  nba: nbaModule,
  nfl: nflModule,
};

export function getLeagueModule(leagueId: string): LeagueModule {
  const mod = LEAGUES[leagueId];
  if (!mod) throw new Error(`Unknown league: ${leagueId}`);
  return mod;
}

export function listLeagues(): LeagueConfig[] {
  return Object.values(LEAGUES).map((m) => m.config);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/leagues/registry.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/leagues/registry.ts src/leagues/registry.test.ts
git commit -m "feat: add league registry seeded with NBA and NFL"
```

---

## Task 7: useFollowedTeams hook (localStorage)

**Files:**
- Create: `src/hooks/useFollowedTeams.ts`
- Test: `src/hooks/useFollowedTeams.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/hooks/useFollowedTeams.test.ts`:

```ts
import { describe, expect, it, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useFollowedTeams } from "./useFollowedTeams";

describe("useFollowedTeams", () => {
  beforeEach(() => localStorage.clear());

  it("starts empty and adds a team", () => {
    const { result } = renderHook(() => useFollowedTeams());
    expect(result.current.followed).toEqual([]);
    act(() => result.current.add({ leagueId: "nba", teamId: "13" }));
    expect(result.current.followed).toEqual([
      { leagueId: "nba", teamId: "13" },
    ]);
  });

  it("does not add duplicates", () => {
    const { result } = renderHook(() => useFollowedTeams());
    act(() => result.current.add({ leagueId: "nba", teamId: "13" }));
    act(() => result.current.add({ leagueId: "nba", teamId: "13" }));
    expect(result.current.followed).toHaveLength(1);
  });

  it("removes a team", () => {
    const { result } = renderHook(() => useFollowedTeams());
    act(() => result.current.add({ leagueId: "nba", teamId: "13" }));
    act(() => result.current.remove({ leagueId: "nba", teamId: "13" }));
    expect(result.current.followed).toEqual([]);
  });

  it("persists to localStorage", () => {
    const { result } = renderHook(() => useFollowedTeams());
    act(() => result.current.add({ leagueId: "nba", teamId: "13" }));
    expect(localStorage.getItem("league-status:followed")).toContain("13");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/hooks/useFollowedTeams.test.ts`
Expected: FAIL — cannot find module `./useFollowedTeams`.

- [ ] **Step 3: Write the implementation**

Create `src/hooks/useFollowedTeams.ts`:

```ts
import { useCallback, useEffect, useState } from "react";

export interface FollowedTeam {
  leagueId: string;
  teamId: string;
}

const STORAGE_KEY = "league-status:followed";

function load(): FollowedTeam[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as FollowedTeam[]) : [];
  } catch {
    return [];
  }
}

function sameTeam(a: FollowedTeam, b: FollowedTeam): boolean {
  return a.leagueId === b.leagueId && a.teamId === b.teamId;
}

export function useFollowedTeams() {
  const [followed, setFollowed] = useState<FollowedTeam[]>(load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(followed));
  }, [followed]);

  const add = useCallback((team: FollowedTeam) => {
    setFollowed((prev) =>
      prev.some((t) => sameTeam(t, team)) ? prev : [...prev, team],
    );
  }, []);

  const remove = useCallback((team: FollowedTeam) => {
    setFollowed((prev) => prev.filter((t) => !sameTeam(t, team)));
  }, []);

  return { followed, add, remove };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/hooks/useFollowedTeams.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useFollowedTeams.ts src/hooks/useFollowedTeams.test.ts
git commit -m "feat: add useFollowedTeams localStorage hook"
```

---

## Task 8: useTeamStatus hook (parallel fetch → TeamStatus)

**Files:**
- Create: `src/hooks/useTeamStatus.ts`
- Test: `src/hooks/useTeamStatus.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/hooks/useTeamStatus.test.tsx`:

```tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useTeamStatus } from "./useTeamStatus";
import * as registry from "../leagues/registry";
import type { LeagueModule } from "../leagues/types";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const fakeModule = {
  config: { id: "nba", sport: "basketball", league: "nba", displayName: "NBA", icon: "🏀" },
  adapter: {
    fetchTeam: vi.fn(),
    fetchSchedule: vi.fn(),
    searchTeams: vi.fn(),
  },
  derivations: {
    standingSummary: vi.fn(() => ({ overall: "53-29" })),
    splitGames: vi.fn(() => ({ past: [], upcoming: [] })),
    seasonStatus: vi.fn(() => ({ phase: "in_season", label: "IN SEASON" })),
  },
} as unknown as LeagueModule;

describe("useTeamStatus", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("fetches team and schedule in parallel and assembles TeamStatus", async () => {
    const team = { id: "13", leagueId: "nba", name: "Lakers", abbreviation: "LAL" };
    (fakeModule.adapter.fetchTeam as ReturnType<typeof vi.fn>).mockResolvedValue({
      team,
      standing: { recordSummary: "53-29" },
    });
    (fakeModule.adapter.fetchSchedule as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    vi.spyOn(registry, "getLeagueModule").mockReturnValue(fakeModule);

    const { result } = renderHook(
      () => useTeamStatus({ leagueId: "nba", teamId: "13" }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.team.name).toBe("Lakers");
    expect(result.current.data?.seasonStatus.label).toBe("IN SEASON");
    expect(fakeModule.adapter.fetchTeam).toHaveBeenCalledWith("13");
    expect(fakeModule.adapter.fetchSchedule).toHaveBeenCalledWith("13");
  });

  it("surfaces errors (isError) when a fetch rejects", async () => {
    (fakeModule.adapter.fetchTeam as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("boom"),
    );
    (fakeModule.adapter.fetchSchedule as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    vi.spyOn(registry, "getLeagueModule").mockReturnValue(fakeModule);

    const { result } = renderHook(
      () => useTeamStatus({ leagueId: "nba", teamId: "13" }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/hooks/useTeamStatus.test.tsx`
Expected: FAIL — cannot find module `./useTeamStatus`.

- [ ] **Step 3: Write the implementation**

Create `src/hooks/useTeamStatus.ts`:

```ts
import { useQuery } from "@tanstack/react-query";
import type { TeamStatus } from "../domain/types";
import { getLeagueModule } from "../leagues/registry";
import type { FollowedTeam } from "./useFollowedTeams";

export function useTeamStatus(team: FollowedTeam) {
  return useQuery<TeamStatus>({
    queryKey: ["teamStatus", team.leagueId, team.teamId],
    queryFn: async () => {
      const mod = getLeagueModule(team.leagueId);
      // Parallel: team meta/standing and schedule fetch together.
      const [{ team: domainTeam, standing }, games] = await Promise.all([
        mod.adapter.fetchTeam(team.teamId),
        mod.adapter.fetchSchedule(team.teamId),
      ]);
      const now = new Date();
      const { past, upcoming } = mod.derivations.splitGames(games, now);
      return {
        team: domainTeam,
        league: mod.config,
        standing: mod.derivations.standingSummary(standing),
        seasonStatus: mod.derivations.seasonStatus({ games, now }),
        pastGames: past,
        upcomingGames: upcoming,
      };
    },
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/hooks/useTeamStatus.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useTeamStatus.ts src/hooks/useTeamStatus.test.tsx
git commit -m "feat: add useTeamStatus hook with parallel fetch"
```

---

## Task 9: Presentational components (Banner, GameList)

**Files:**
- Create: `src/components/Banner.tsx`, `src/components/GameList.tsx`
- Test: `src/components/Banner.test.tsx`, `src/components/GameList.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/Banner.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Banner } from "./Banner";

describe("Banner", () => {
  it("shows league icon, team name, phase label, standing and record", () => {
    render(
      <Banner
        icon="🏀"
        leagueName="NBA"
        teamName="Los Angeles Lakers"
        seasonStatus={{ phase: "playoffs_upcoming", label: "PLAYOFFS IN 3 WEEKS", weeksUntilPlayoffs: 3 }}
        standing={{ overall: "53-29", summary: "1st in Pacific Division", divisionRank: 1, divisionName: "Pacific" }}
      />,
    );
    expect(screen.getByText("Los Angeles Lakers")).toBeInTheDocument();
    expect(screen.getByText("PLAYOFFS IN 3 WEEKS")).toBeInTheDocument();
    expect(screen.getByText(/1st in Pacific Division/)).toBeInTheDocument();
    expect(screen.getByText(/53-29/)).toBeInTheDocument();
  });

  it("applies a phase-specific data attribute for styling", () => {
    const { container } = render(
      <Banner
        icon="🏀"
        leagueName="NBA"
        teamName="Lakers"
        seasonStatus={{ phase: "offseason", label: "OFF SEASON" }}
        standing={{ overall: "0-0" }}
      />,
    );
    expect(container.querySelector('[data-phase="offseason"]')).not.toBeNull();
  });
});
```

Create `src/components/GameList.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { GameList } from "./GameList";
import type { Game } from "../domain/types";

const past: Game = {
  id: "1",
  date: "2026-04-01T02:30Z",
  status: "final",
  seasonType: "regular",
  isHome: true,
  result: "W",
  homeTeam: { id: "13", abbreviation: "LAL", score: 112 },
  awayTeam: { id: "2", abbreviation: "BOS", score: 104 },
};

describe("GameList", () => {
  it("renders a past game with opponent, W/L, and score", () => {
    render(<GameList title="Past" games={[past]} />);
    expect(screen.getByText("Past")).toBeInTheDocument();
    expect(screen.getByText(/BOS/)).toBeInTheDocument();
    expect(screen.getByText(/W/)).toBeInTheDocument();
    expect(screen.getByText(/112.?104/)).toBeInTheDocument();
  });

  it("shows an empty message when there are no games", () => {
    render(<GameList title="Upcoming" games={[]} />);
    expect(screen.getByText(/no games/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:run -- src/components/Banner.test.tsx src/components/GameList.test.tsx`
Expected: FAIL — cannot find modules.

- [ ] **Step 3: Write the implementations**

Create `src/components/Banner.tsx`:

```tsx
import type { SeasonStatus, Standing } from "../domain/types";

interface BannerProps {
  icon: string;
  leagueName: string;
  teamName: string;
  seasonStatus: SeasonStatus;
  standing: Standing;
}

export function Banner({
  icon,
  leagueName,
  teamName,
  seasonStatus,
  standing,
}: BannerProps) {
  const standingText = standing.summary ?? "";
  return (
    <div className="banner" data-phase={seasonStatus.phase}>
      <span className="banner-team">
        <span aria-hidden>{icon}</span> {teamName}
        <span className="banner-league"> · {leagueName}</span>
      </span>
      <span className="banner-status">{seasonStatus.label}</span>
      <span className="banner-standing">
        {[standingText, standing.overall].filter(Boolean).join(" · ")}
      </span>
    </div>
  );
}
```

Create `src/components/GameList.tsx`:

```tsx
import type { Game } from "../domain/types";

interface GameListProps {
  title: string;
  games: Game[];
}

function opponent(g: Game): string {
  const opp = g.isHome ? g.awayTeam : g.homeTeam;
  return `${g.isHome ? "vs" : "@"} ${opp.abbreviation}`;
}

function scoreText(g: Game): string {
  if (g.homeTeam.score == null || g.awayTeam.score == null) return "";
  const mine = g.isHome ? g.homeTeam.score : g.awayTeam.score;
  const theirs = g.isHome ? g.awayTeam.score : g.homeTeam.score;
  return `${mine}–${theirs}`;
}

function dateText(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function GameList({ title, games }: GameListProps) {
  return (
    <div className="game-list">
      <h4 className="game-list-title">{title}</h4>
      {games.length === 0 ? (
        <p className="game-list-empty">No games</p>
      ) : (
        <ul>
          {games.map((g) => (
            <li key={g.id} className="game-row">
              <span className="game-opp">{opponent(g)}</span>
              {g.result && <span className={`game-result result-${g.result}`}>{g.result}</span>}
              <span className="game-score">{scoreText(g)}</span>
              <span className="game-date">{dateText(g.date)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:run -- src/components/Banner.test.tsx src/components/GameList.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/Banner.tsx src/components/GameList.tsx src/components/Banner.test.tsx src/components/GameList.test.tsx
git commit -m "feat: add Banner and GameList presentational components"
```

---

## Task 10: TeamPanel (loading / data / error+retry)

**Files:**
- Create: `src/components/TeamPanel.tsx`
- Test: `src/components/TeamPanel.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/TeamPanel.test.tsx`:

```tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TeamPanel } from "./TeamPanel";
import * as hook from "../hooks/useTeamStatus";
import type { TeamStatus } from "../domain/types";

const team = { leagueId: "nba", teamId: "13" };

function mockStatus(overrides: Partial<ReturnType<typeof hook.useTeamStatus>>) {
  vi.spyOn(hook, "useTeamStatus").mockReturnValue(
    overrides as ReturnType<typeof hook.useTeamStatus>,
  );
}

const sample: TeamStatus = {
  team: { id: "13", leagueId: "nba", name: "Los Angeles Lakers", abbreviation: "LAL" },
  league: { id: "nba", sport: "basketball", league: "nba", displayName: "NBA", icon: "🏀" },
  standing: { overall: "53-29", summary: "1st in Pacific Division" },
  seasonStatus: { phase: "in_season", label: "IN SEASON" },
  pastGames: [],
  upcomingGames: [],
};

describe("TeamPanel", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("shows a skeleton while loading", () => {
    mockStatus({ isLoading: true, isError: false });
    render(<TeamPanel team={team} onRemove={() => {}} />);
    expect(screen.getByTestId("panel-skeleton")).toBeInTheDocument();
  });

  it("renders banner and game lists on success", () => {
    mockStatus({ isLoading: false, isError: false, isSuccess: true, data: sample });
    render(<TeamPanel team={team} onRemove={() => {}} />);
    expect(screen.getByText("Los Angeles Lakers")).toBeInTheDocument();
    expect(screen.getByText("IN SEASON")).toBeInTheDocument();
  });

  it("shows an error card with a working Retry button", async () => {
    const refetch = vi.fn();
    mockStatus({ isLoading: false, isError: true, error: new Error("boom"), refetch });
    render(<TeamPanel team={team} onRemove={() => {}} />);
    expect(screen.getByText(/couldn't load/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(refetch).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/components/TeamPanel.test.tsx`
Expected: FAIL — cannot find module `./TeamPanel`.

- [ ] **Step 3: Write the implementation**

Create `src/components/TeamPanel.tsx`:

```tsx
import { Banner } from "./Banner";
import { GameList } from "./GameList";
import { useTeamStatus } from "../hooks/useTeamStatus";
import type { FollowedTeam } from "../hooks/useFollowedTeams";

interface TeamPanelProps {
  team: FollowedTeam;
  onRemove: (team: FollowedTeam) => void;
}

export function TeamPanel({ team, onRemove }: TeamPanelProps) {
  const query = useTeamStatus(team);

  return (
    <section className="team-panel">
      {query.isLoading && (
        <div className="panel-skeleton" data-testid="panel-skeleton">
          Loading team…
        </div>
      )}

      {query.isError && (
        <div className="panel-error">
          <p>Couldn't load this team.</p>
          <button onClick={() => query.refetch()}>Retry</button>
          <button onClick={() => onRemove(team)}>Remove</button>
        </div>
      )}

      {query.isSuccess && query.data && (
        <>
          <div className="panel-header">
            <Banner
              icon={query.data.league.icon}
              leagueName={query.data.league.displayName}
              teamName={query.data.team.name}
              seasonStatus={query.data.seasonStatus}
              standing={query.data.standing}
            />
            <button
              className="panel-remove"
              aria-label={`Remove ${query.data.team.name}`}
              onClick={() => onRemove(team)}
            >
              ×
            </button>
          </div>
          <div className="panel-games">
            <GameList title="Upcoming" games={query.data.upcomingGames} />
            <GameList title="Past" games={query.data.pastGames} />
          </div>
        </>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/components/TeamPanel.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/TeamPanel.tsx src/components/TeamPanel.test.tsx
git commit -m "feat: add TeamPanel with loading, error, and success states"
```

---

## Task 11: AddTeamDialog (search across leagues)

**Files:**
- Create: `src/components/AddTeamDialog.tsx`
- Test: `src/components/AddTeamDialog.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/AddTeamDialog.test.tsx`:

```tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddTeamDialog } from "./AddTeamDialog";
import * as registry from "../leagues/registry";
import type { LeagueModule } from "../leagues/types";

function moduleWith(id: string, results: unknown[]): LeagueModule {
  return {
    config: { id, sport: "x", league: id, displayName: id.toUpperCase(), icon: "🏀" },
    adapter: {
      fetchTeam: vi.fn(),
      fetchSchedule: vi.fn(),
      searchTeams: vi.fn().mockResolvedValue(results),
    },
    derivations: {} as LeagueModule["derivations"],
  } as unknown as LeagueModule;
}

describe("AddTeamDialog", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("searches every league in parallel and calls onAdd with the pick", async () => {
    const nba = moduleWith("nba", [
      { id: "13", leagueId: "nba", name: "Los Angeles Lakers", abbreviation: "LAL" },
    ]);
    const nfl = moduleWith("nfl", []);
    vi.spyOn(registry, "listLeagues").mockReturnValue([nba.config, nfl.config]);
    vi.spyOn(registry, "getLeagueModule").mockImplementation((leagueId) =>
      leagueId === "nba" ? nba : nfl,
    );

    const onAdd = vi.fn();
    render(<AddTeamDialog onAdd={onAdd} onClose={() => {}} />);

    await userEvent.type(screen.getByRole("textbox"), "laker");
    await waitFor(() =>
      expect(screen.getByText(/Los Angeles Lakers/)).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByText(/Los Angeles Lakers/));
    expect(onAdd).toHaveBeenCalledWith({ leagueId: "nba", teamId: "13" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/components/AddTeamDialog.test.tsx`
Expected: FAIL — cannot find module `./AddTeamDialog`.

- [ ] **Step 3: Write the implementation**

Create `src/components/AddTeamDialog.tsx`:

```tsx
import { useEffect, useMemo, useState } from "react";
import type { Team } from "../domain/types";
import type { FollowedTeam } from "../hooks/useFollowedTeams";
import { getLeagueModule, listLeagues } from "../leagues/registry";

interface AddTeamDialogProps {
  onAdd: (team: FollowedTeam) => void;
  onClose: () => void;
}

export function AddTeamDialog({ onAdd, onClose }: AddTeamDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Team[]>([]);
  const leagues = useMemo(() => listLeagues(), []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    // Search every league in parallel; ignore leagues that error.
    Promise.all(
      leagues.map((c) =>
        getLeagueModule(c.id)
          .adapter.searchTeams(q)
          .catch(() => [] as Team[]),
      ),
    ).then((lists) => {
      if (!cancelled) setResults(lists.flat());
    });
    return () => {
      cancelled = true;
    };
  }, [query, leagues]);

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          type="text"
          placeholder="Search teams…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <ul className="search-results">
          {results.map((t) => (
            <li key={`${t.leagueId}:${t.id}`}>
              <button
                onClick={() => {
                  onAdd({ leagueId: t.leagueId, teamId: t.id });
                  onClose();
                }}
              >
                {t.logoUrl && <img src={t.logoUrl} alt="" width={20} height={20} />}
                {t.name} <span className="result-league">{t.leagueId.toUpperCase()}</span>
              </button>
            </li>
          ))}
        </ul>
        <button className="dialog-close" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
```

Note: the test clicks the result before `onClose` unmounts anything it asserts on, and `onAdd` fires first — assertion holds.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/components/AddTeamDialog.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/AddTeamDialog.tsx src/components/AddTeamDialog.test.tsx
git commit -m "feat: add AddTeamDialog with parallel cross-league search"
```

---

## Task 12: Header, TeamPanelList, App wiring + failure isolation

**Files:**
- Create: `src/components/Header.tsx`, `src/components/TeamPanelList.tsx`
- Modify: `src/App.tsx` (replace scaffold)
- Test: `src/components/App.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/App.test.tsx`:

```tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "../App";
import * as followed from "../hooks/useFollowedTeams";
import * as statusHook from "../hooks/useTeamStatus";
import type { TeamStatus } from "../domain/types";

function renderApp() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>,
  );
}

function statusFor(name: string): TeamStatus {
  return {
    team: { id: name, leagueId: "nba", name, abbreviation: name.slice(0, 3).toUpperCase() },
    league: { id: "nba", sport: "basketball", league: "nba", displayName: "NBA", icon: "🏀" },
    standing: { overall: "10-5" },
    seasonStatus: { phase: "in_season", label: "IN SEASON" },
    pastGames: [],
    upcomingGames: [],
  };
}

describe("App", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("shows an empty state when no teams are followed", () => {
    vi.spyOn(followed, "useFollowedTeams").mockReturnValue({
      followed: [],
      add: vi.fn(),
      remove: vi.fn(),
    });
    renderApp();
    expect(screen.getByText(/add a team/i)).toBeInTheDocument();
  });

  it("isolates failure: one panel errors while another renders", () => {
    vi.spyOn(followed, "useFollowedTeams").mockReturnValue({
      followed: [
        { leagueId: "nba", teamId: "Lakers" },
        { leagueId: "nba", teamId: "Celtics" },
      ],
      add: vi.fn(),
      remove: vi.fn(),
    });
    vi.spyOn(statusHook, "useTeamStatus").mockImplementation((team) => {
      if (team.teamId === "Lakers") {
        return { isLoading: false, isError: true, refetch: vi.fn() } as ReturnType<
          typeof statusHook.useTeamStatus
        >;
      }
      return {
        isLoading: false,
        isError: false,
        isSuccess: true,
        data: statusFor("Celtics"),
      } as ReturnType<typeof statusHook.useTeamStatus>;
    });

    renderApp();
    expect(screen.getByText(/couldn't load/i)).toBeInTheDocument();
    expect(screen.getByText("Celtics")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/components/App.test.tsx`
Expected: FAIL — Header/TeamPanelList/App not wired.

- [ ] **Step 3: Write the implementations**

Create `src/components/Header.tsx`:

```tsx
interface HeaderProps {
  onAddClick: () => void;
}

export function Header({ onAddClick }: HeaderProps) {
  return (
    <header className="app-header">
      <h1>My Teams</h1>
      <button className="add-team-btn" onClick={onAddClick}>
        + Add team
      </button>
    </header>
  );
}
```

Create `src/components/TeamPanelList.tsx`:

```tsx
import { TeamPanel } from "./TeamPanel";
import type { FollowedTeam } from "../hooks/useFollowedTeams";

interface TeamPanelListProps {
  teams: FollowedTeam[];
  onRemove: (team: FollowedTeam) => void;
}

export function TeamPanelList({ teams, onRemove }: TeamPanelListProps) {
  if (teams.length === 0) {
    return <p className="empty-state">No teams yet — add a team to get started.</p>;
  }
  return (
    <div className="team-panel-list">
      {teams.map((t) => (
        <TeamPanel key={`${t.leagueId}:${t.teamId}`} team={t} onRemove={onRemove} />
      ))}
    </div>
  );
}
```

Replace `src/App.tsx` with:

```tsx
import { useState } from "react";
import { Header } from "./components/Header";
import { TeamPanelList } from "./components/TeamPanelList";
import { AddTeamDialog } from "./components/AddTeamDialog";
import { useFollowedTeams } from "./hooks/useFollowedTeams";

export default function App() {
  const { followed, add, remove } = useFollowedTeams();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="app">
      <Header onAddClick={() => setDialogOpen(true)} />
      <main>
        <TeamPanelList teams={followed} onRemove={remove} />
      </main>
      {dialogOpen && (
        <AddTeamDialog onAdd={add} onClose={() => setDialogOpen(false)} />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/components/App.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/Header.tsx src/components/TeamPanelList.tsx src/App.tsx src/components/App.test.tsx
git commit -m "feat: wire Header, TeamPanelList, and App with failure isolation"
```

---

## Task 13: main.tsx (QueryClient) + styling + full suite

**Files:**
- Modify: `src/main.tsx`
- Modify: `src/index.css`

- [ ] **Step 1: Wire the QueryClientProvider**

Replace `src/main.tsx` with:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, refetchOnWindowFocus: false, retry: 1 },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
```

- [ ] **Step 2: Add lo-fi styling (Option A stacked panels)**

Replace `src/index.css` with:

```css
:root {
  --bg: #0f1115;
  --panel: #1a1d24;
  --line: #2a2f3a;
  --text: #e7e9ee;
  --muted: #9aa3b2;
  --accent: #4f8cff;
  --win: #3ecf8e;
  --loss: #ff6b6b;
  font-family: system-ui, -apple-system, sans-serif;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); }
.app { max-width: 900px; margin: 0 auto; padding: 16px; }
.app-header {
  display: flex; align-items: center; justify-content: space-between;
  padding-bottom: 12px; border-bottom: 1px solid var(--line);
}
.add-team-btn, .panel-error button {
  background: var(--accent); color: white; border: none;
  padding: 8px 14px; border-radius: 8px; cursor: pointer;
}
.empty-state { color: var(--muted); text-align: center; padding: 48px 0; }
.team-panel-list { display: flex; flex-direction: column; gap: 16px; margin-top: 16px; }
.team-panel { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; overflow: hidden; }
.panel-skeleton { padding: 24px; color: var(--muted); }
.panel-error { padding: 20px; display: flex; gap: 10px; align-items: center; }
.panel-error button { background: var(--line); }
.panel-header { position: relative; }
.panel-remove {
  position: absolute; top: 8px; right: 10px; background: none; border: none;
  color: var(--muted); font-size: 20px; cursor: pointer;
}
.banner {
  display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px 16px;
  padding: 16px; border-bottom: 1px solid var(--line);
}
.banner[data-phase="playoffs"], .banner[data-phase="playoffs_upcoming"] { background: linear-gradient(90deg, rgba(79,140,255,0.15), transparent); }
.banner[data-phase="offseason"] { opacity: 0.7; }
.banner-team { font-weight: 700; font-size: 18px; }
.banner-league { color: var(--muted); font-weight: 400; }
.banner-status { font-weight: 700; letter-spacing: 0.05em; color: var(--accent); }
.banner-standing { color: var(--muted); margin-left: auto; }
.panel-games { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 16px; }
@media (max-width: 560px) { .panel-games { grid-template-columns: 1fr; } }
.game-list-title { margin: 0 0 8px; color: var(--muted); text-transform: uppercase; font-size: 12px; letter-spacing: 0.08em; }
.game-list ul { list-style: none; margin: 0; padding: 0; }
.game-row { display: grid; grid-template-columns: 1fr auto auto; gap: 8px; padding: 6px 0; border-bottom: 1px solid var(--line); font-size: 14px; }
.game-date { color: var(--muted); grid-column: 1 / -1; font-size: 12px; }
.result-W { color: var(--win); font-weight: 700; }
.result-L { color: var(--loss); font-weight: 700; }
.game-list-empty { color: var(--muted); font-size: 14px; }
.dialog-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: flex-start; justify-content: center; padding-top: 10vh; }
.dialog { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 16px; width: 400px; max-width: 90vw; }
.dialog input { width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--line); background: var(--bg); color: var(--text); }
.search-results { list-style: none; margin: 12px 0; padding: 0; max-height: 300px; overflow: auto; }
.search-results button { width: 100%; text-align: left; background: none; border: none; color: var(--text); padding: 8px; cursor: pointer; display: flex; align-items: center; gap: 8px; border-radius: 6px; }
.search-results button:hover { background: var(--line); }
.result-league { color: var(--muted); font-size: 12px; margin-left: auto; }
```

- [ ] **Step 3: Run the full suite + build + lint**

Run: `npm run test:run && npm run build && npm run lint`
Expected: all tests pass, build succeeds, lint clean. If ESLint flags the non-null assertion in `main.tsx`, that matches the Vite default template and is acceptable.

- [ ] **Step 4: Commit**

```bash
git add src/main.tsx src/index.css
git commit -m "feat: wire QueryClient and add lo-fi stacked-panel styling"
```

---

## Task 14: Manual verification + deploy config

**Files:**
- Create: `README.md`

- [ ] **Step 1: Run the app and verify against live ESPN data**

Run: `npm run dev`
Then in the browser: click **+ Add team**, search "Lakers", add it. Confirm a panel appears with a status banner (phase + record), plus Upcoming and Past game lists populated from live ESPN data. Add a second team (e.g., an NFL team) and confirm both panels load independently. Reload — followed teams persist.

- [ ] **Step 2: Write the README**

Create `README.md`:

```markdown
# League Status

A small web dashboard showing the season status of the sports teams you follow:
a status banner (standing + phase), plus upcoming and past games. Starts with the
NBA; extensible to more leagues (NFL seeded).

## Develop

    npm install
    npm run dev

## Test

    npm run test:run

## Deploy (GitHub Pages)

The Vite `base` is set to `/league-status/`. Push this repo to a GitHub repo named
`league-status`, then:

    npm run deploy

Data comes from ESPN's public (unofficial) site API, fetched directly from the
browser. No API key required.

## Architecture

See `docs/superpowers/specs/2026-07-08-league-status-design.md` and
`docs/superpowers/plans/2026-07-08-league-status.md`.
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add README with dev, test, and deploy instructions"
```

- [ ] **Step 4 (optional): Publish**

Create a GitHub repo named `league-status`, add it as `origin`, push `main`, then
run `npm run deploy`. The app will be live at
`https://<username>.github.io/league-status/`.

---

## Notes & Known Limitations (MVP)

- **Season phase is schedule-driven.** "PLAYOFFS IN N WEEKS" appears once ESPN has
  actual postseason games on the team's schedule (type 3). Far-out countdowns
  won't show until those dates exist — this matches the "derived via the schedule"
  decision.
- **OFF SEASON** is inferred as "no future games in the returned schedule." Good
  enough for MVP; can be refined later with league calendar endpoints.
- **Standings** show division rank + overall record (what the `teams/{id}` endpoint
  gives). Conference rank is out of scope for MVP (domain model leaves room for it).
- **No live in-game ticking** — data is fresh on visit, not streamed.
- Future panel sections (WhereToWatch, VideoBreakdowns) plug into `TeamPanel`'s
  render without restructuring.
```
