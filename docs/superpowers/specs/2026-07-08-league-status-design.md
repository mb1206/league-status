# League Status — Design

**Date:** 2026-07-08
**Status:** Approved (design phase)

## Purpose

A small, web-deployed dashboard that shows the overall status of specific sports
teams. For each followed team it displays a season-status banner (standing +
phase of season), plus upcoming and past games. Starts with the NBA, designed
from day one to extend to multiple leagues and multiple teams.

## Success Criteria

- I can follow one or more teams and see, for each: a status banner, upcoming
  games, and past games.
- The banner correctly reports **OFF SEASON**, **IN SEASON**, **PLAYOFFS**, or
  **PLAYOFFS IN {N} WEEKS** (N ≤ 10).
- Data is fresh on every visit.
- Adding a second league (NFL) requires registering a config/module, not
  rewriting the app.
- The page never hangs on a single slow/failed query — panels load in parallel
  and independently.

## Key Decisions

| Area | Decision |
|------|----------|
| Data freshness | Fresh on every visit (browser fetches live; fully static host). |
| Data source | ESPN hidden API — keyless, CORS-friendly, one URL shape across sports. |
| Team config | In-app UI (add/remove) persisted in `localStorage`. |
| Layout | Option A: stacked full-width team panels. Evolvable toward a per-team detail view (Option C) later. |
| Season phases | `OFF_SEASON` ↔ `IN_SEASON`, with `PLAYOFFS` / `PLAYOFFS_UPCOMING` derived from the schedule. 10-week countdown cap. |
| Per-league logic | Distinct derivation module per league — single source of truth per league. |
| MVP scope | Build the multi-league abstraction; seed **NBA** fully, plus one **NFL** module to prove extensibility. |
| Stack | React 19 + TypeScript + Vite, TanStack Query, Vitest + Testing Library, deploy to GitHub Pages via `gh-pages`. |

## Architecture

The UI never talks to ESPN directly. All data flows through a normalized domain
model, quarantining ESPN's quirks (and any future data source) in one layer.

```
UI LAYER (React)
  App → TeamPanel → [Banner, PastGames, UpcomingGames]
  Knows ONLY the domain model. Zero ESPN knowledge.
        ▲  Team, Game, Standing, SeasonStatus
DERIVATION LAYER (pure functions, no I/O — heavily tested)
  seasonStatus(), standingSummary(), splitGames()  — per league
        ▲  normalized domain objects
ADAPTER LAYER — LeagueAdapter interface
  espnAdapter (parameterized by sport/league path)
  fetchSchedule(), fetchStandings()  → map raw ESPN JSON → domain model
        ▲  raw JSON
ESPN hidden API
```

### Extensibility rationale

- **Multiple leagues, nearly free.** ESPN uses one URL shape across sports
  (`.../basketball/nba/...`, `.../football/nfl/...`). A single `espnAdapter`
  parameterized by a `LeagueConfig` handles them. Adding a league = adding a
  module to the registry.
- **Swappable sources.** Leagues go through the `LeagueAdapter` *interface*, so a
  broken ESPN endpoint for one sport can be replaced per-league without touching
  the UI.
- **Pluggable panel sections.** `TeamPanel` renders an ordered array of section
  components. Today: banner + games. Later: `WhereToWatch`, `VideoBreakdowns`
  as new sections — the panel composition doesn't change.
- **Pure, testable logic.** Season-phase and standings derivation are pure
  functions fed fixture JSON — fast, offline unit tests.

## League Modules & Registry

Each league is one self-contained module — config, how to fetch, how to
interpret — so exactly one place knows "how the NBA works."

```ts
interface LeagueModule {
  config: LeagueConfig;
  adapter: LeagueAdapter;         // fetch raw ESPN + map → domain model
  derivations: LeagueDerivations; // pure logic, THE source of truth per league
}

const LEAGUES: Record<string, LeagueModule> = {
  nba: nbaModule,
  nfl: nflModule, // seeded to prove multi-league
};
```

```ts
interface LeagueAdapter {
  fetchSchedule(teamId: string): Promise<Game[]>;
  fetchStandings(teamId: string): Promise<RawStanding>;
  searchTeams(query: string): Promise<Team[]>;
}

interface LeagueDerivations {
  seasonStatus(input: SeasonInput): SeasonStatus;
  standingSummary(raw: RawStanding): Standing;
  splitGames(games: Game[], now: Date): { past: Game[]; upcoming: Game[] };
}
```

A shared base provides default implementations; a league overrides only where it
differs. The league module is always the authoritative entry point.

Supporting types:

```ts
// League-specific raw standings payload as returned by ESPN, before mapping.
type RawStanding = unknown; // shaped per league; narrowed inside standingSummary

interface SeasonCalendar {
  seasonStart?: Date;
  seasonEnd?: Date;
  playoffsStart?: Date;   // when known, drives PLAYOFFS_UPCOMING countdown
  playoffsEnd?: Date;
}

interface SeasonInput {
  calendar: SeasonCalendar; // surfaced by the adapter from ESPN's response
  now: Date;
}
```

## Domain Model

```ts
interface LeagueConfig {
  id: string;            // "nba"
  sport: string;         // ESPN sport path: "basketball"
  league: string;        // ESPN league path: "nba"
  displayName: string;   // "NBA"
  icon: string;          // "🏀"
}

interface Team {
  id: string;            // ESPN team id
  leagueId: string;
  name: string;          // "Lakers"
  abbreviation: string;  // "LAL"
  logoUrl?: string;
}

interface GameTeamRef { id: string; abbreviation: string; score?: number; }

interface Game {
  id: string;
  date: string;                                       // ISO
  status: "scheduled" | "in_progress" | "final";
  homeTeam: GameTeamRef;
  awayTeam: GameTeamRef;
  isHome: boolean;                                    // relative to followed team
  result?: "W" | "L";                                 // when final, relative to followed team
}

interface Standing {
  overall: string;          // "42-20"
  divisionRank?: number;
  divisionName?: string;
  conferenceRank?: number;
  conferenceName?: string;
}

interface SeasonStatus {
  phase: "offseason" | "in_season" | "playoffs_upcoming" | "playoffs";
  label: string;               // "PLAYOFFS IN 3 WEEKS"
  weeksUntilPlayoffs?: number;
}

interface TeamStatus {
  team: Team;
  league: LeagueConfig;
  standing: Standing;
  seasonStatus: SeasonStatus;
  pastGames: Game[];
  upcomingGames: Game[];
}
```

Deliberate choices:

- `isHome` / `result` are computed **relative to the followed team** in the
  adapter, so the UI never reasons about home/away.
- `Standing` fields are optional — leagues express standings differently; the UI
  shows what's present (partial-data tolerance).
- `SeasonStatus` carries a ready-made `label` so the banner is presentational
  only.
- `TeamStatus` is the single object a `TeamPanel` consumes — a clean, mockable
  boundary.

## Season Phase Derivation

```
PLAYOFF_COUNTDOWN_WEEKS = 10   // hardcoded threshold, one named constant

1. No active season window right now         → OFF_SEASON        "OFF SEASON"
2. Now is within playoffs                     → PLAYOFFS          "PLAYOFFS"
3. Playoffs start known AND
   weeksUntil = ceil((start - now) / 7) ≤ 10  → PLAYOFFS_UPCOMING "PLAYOFFS IN {N} WEEKS"
4. Otherwise                                  → IN_SEASON         "IN SEASON"
```

- Playoffs start is **derived from the schedule** — the adapter surfaces the
  league's season calendar (regular-season and postseason boundaries) from
  ESPN's response; the per-league derivation reads it. NBA and NFL differ in how
  those windows look, which is why each owns its derivation.
- `splitGames` defaults to "last 3 / next 3" and can be overridden per league
  (NFL weekly cadence vs NBA near-daily).

## UI Components & Data Flow

```
App
├── Header                 ( title · [+ Add team] · ⚙ )
├── AddTeamDialog          ( search teams across leagues → save to localStorage )
└── TeamPanelList
    └── TeamPanel          ( one per followed team; fetches its own data )
        ├── Banner         ( SeasonStatus + Standing )
        └── sections[]     ← ordered, pluggable
            ├── UpcomingGames
            └── PastGames
            └── (future: WhereToWatch, VideoBreakdowns)
```

Data flow (per panel, independent):

```
followedTeams (localStorage)
  → for each: look up LeagueModule in registry
    → adapter.fetchSchedule / fetchStandings   (raw ESPN JSON)
      → adapter maps → domain model
        → derivations → TeamStatus
          → <TeamPanel status={...} />
```

- **Fetching:** TanStack Query. Each `TeamPanel` owns one query keyed by
  `[leagueId, teamId]`, with automatic loading/error/retry, dedup, and
  in-session caching (stale-while-revalidate).
- **Persisted state:** only the followed-teams list (`{ leagueId, teamId }[]`)
  in `localStorage`, behind a `useFollowedTeams` hook. Everything else is
  fetched/derived fresh.

### Parallelism & Snappiness (hard requirement)

- **All panels fetch concurrently.** Each `TeamPanel` fires its query on mount;
  total wait = slowest single panel, never the sum.
- **No page-level suspense.** No top-level `<Suspense>`/`await` that blocks the
  tree. Loading is per-panel (skeletons); shell + fast panels paint immediately.
- **Within a panel, requests are parallel.** The `queryFn` runs
  `Promise.all([fetchSchedule(), fetchStandings()])` — no fetch chain.
- **No cross-panel dependencies.** The league registry is static/in-memory; no
  async lookup gates a panel start.
- **Instant on repeat.** Cached within the session; re-adds and re-renders serve
  from cache while revalidating in the background.

### Failure Isolation (hard requirement)

- Each `TeamPanel` renders its own skeleton (loading), and its own inline error
  card with **Retry** on failure. Other panels keep working.
- Add-team search: if a league is unreachable, its results simply don't appear.
- Partial data tolerant: if standings are missing but games load (or vice
  versa), the panel renders what it has rather than erroring.

## Testing

Vitest + Testing Library, matching existing projects.

- **Derivation layer (priority).** Pure functions fed captured ESPN fixture
  JSON. Table-driven `seasonStatus` tests covering every branch: off-season,
  in-season, `PLAYOFFS IN N WEEKS` at the boundaries (10 weeks shown, 11 →
  "IN SEASON"), mid-playoffs. Plus `standingSummary` and `splitGames`.
- **Adapter layer.** Saved raw ESPN response fixture → assert correct domain
  mapping, including `isHome`/`result` relative to the followed team.
- **Components.** `Banner` label per phase; `TeamPanel` skeleton → data →
  error/retry states; failure isolation (one panel errors, others render).
- **Not tested:** live ESPN calls (fixtures instead) — deterministic, offline.

## Stack

Mirrors `name-subway-stops`:

- React 19 + TypeScript + Vite
- TanStack Query (only genuinely new dependency)
- Vitest + @testing-library/react
- Deploy to GitHub Pages via `gh-pages`

## Out of Scope (for MVP)

- Live in-game score ticking (data is fresh-on-visit, not real-time streaming).
- Where-to-watch, video breakdowns (designed-for as future panel sections).
- Per-team detail view / Option C layout (panels are built to evolve into it).
- Leagues beyond NBA + the seeded NFL module.
```
