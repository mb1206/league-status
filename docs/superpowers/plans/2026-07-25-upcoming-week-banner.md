# Upcoming-Week Banner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a top-of-app banner showing every followed team's games for the next 7 days, grouped by day in a horizontal strip, where clicking a game scrolls to that team's panel.

**Architecture:** A pure `buildWeek` grouper turns each team's upcoming games into ordered day-groups. A thin `useUpcomingWeek` hook feeds it from the *same* cached team-status queries the app already runs (no new fetches). A presentational `WeekBanner` renders the strip and applies the sport filter. Navigation is pure-anchor: each `TeamPanel` carries an `id`, each card is an `<a href="#team-...">`, and CSS handles smooth scroll + a `:target` flash.

**Tech Stack:** React 19, TypeScript, @tanstack/react-query (`useQueries`), Vitest + @testing-library/react.

## Global Constraints

- No new fetching — the banner reads from `teamStatusQuery` results already cached by `useInSeasonLeagues`.
- Window is the half-open interval `[startOfDay(now), startOfDay(now) + 7 days)`; upcoming games only.
- Day groups sorted ascending; games within a day sorted by time ascending; empty days omitted.
- Day label: `"TODAY"` for today's group, else the uppercase short weekday (`toLocaleDateString(undefined, { weekday: "short" }).toUpperCase()`).
- `opponent` string: `"vs " + awayTeam.abbreviation` when `game.isHome`, else `"@ " + homeTeam.abbreviation`.
- Scroll-target id format: `` `team-${leagueId}-${teamId}` `` — used identically by `TeamPanel` (from its `FollowedTeam` prop) and by each card's `href` (as `#team-...`).
- Banner respects the active sport chip, but only when that league actually has games in the banner (stale-filter falls back to showing all) — mirrors `TeamPanelList`.
- Test command: `npm run test:run -- <path>` for one file; `npm run test:run` for all; `npm run build` for type-check + build.

---

### Task 1: Pure week grouper (`upcomingWeek.ts`)

**Files:**
- Create: `src/leagues/upcomingWeek.ts`
- Test: `src/leagues/upcomingWeek.test.ts`

**Interfaces:**
- Consumes: `Game`, `LeagueConfig`, `Team` from `../domain/types`.
- Produces:
  - `WeekGame { leagueId: string; teamId: string; teamAbbr: string; icon: string; opponent: string; date: string }`
  - `DayGroup { key: string; label: string; games: WeekGame[] }`
  - `WeekEntry { team: Team; league: LeagueConfig; upcomingGames: Game[] }`
  - `buildWeek(entries: WeekEntry[], now: Date): DayGroup[]`

- [ ] **Step 1: Write the failing test**

Create `src/leagues/upcomingWeek.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildWeek, type WeekEntry } from "./upcomingWeek";
import type { Game, LeagueConfig, Team } from "../domain/types";

const lakers: Team = { id: "13", leagueId: "nba", name: "Los Angeles Lakers", abbreviation: "LAL" };
const nba: LeagueConfig = { id: "nba", sport: "basketball", league: "nba", displayName: "NBA", icon: "🏀", hasPlayoffs: true };

function game(over: Partial<Game> = {}): Game {
  return {
    id: "g",
    date: "2026-07-25T23:30:00Z",
    status: "scheduled",
    seasonType: "regular",
    isHome: true,
    homeTeam: { id: "13", abbreviation: "LAL" },
    awayTeam: { id: "2", abbreviation: "GSW" },
    ...over,
  };
}

function entry(upcomingGames: Game[]): WeekEntry {
  return { team: lakers, league: nba, upcomingGames };
}

// Fixed "now": Sat Jul 25 2026, local midday.
const now = new Date(2026, 6, 25, 12, 0, 0);

describe("buildWeek", () => {
  it("includes a game today and excludes games outside the 7-day window", () => {
    const groups = buildWeek(
      [
        entry([
          game({ id: "today", date: new Date(2026, 6, 25, 19, 0).toISOString() }),
          game({ id: "in6", date: new Date(2026, 6, 31, 19, 0).toISOString() }),
          game({ id: "in8", date: new Date(2026, 7, 2, 19, 0).toISOString() }), // > 7 days
          game({ id: "past", date: new Date(2026, 6, 24, 19, 0).toISOString() }), // before window
        ]),
      ],
      now,
    );
    const ids = groups.flatMap((g) => g.games.map((wg) => wg.date));
    expect(ids).toContain(new Date(2026, 6, 25, 19, 0).toISOString());
    expect(ids).toContain(new Date(2026, 6, 31, 19, 0).toISOString());
    expect(ids).not.toContain(new Date(2026, 7, 2, 19, 0).toISOString());
    expect(ids).not.toContain(new Date(2026, 6, 24, 19, 0).toISOString());
  });

  it("labels today's group TODAY and others by uppercase weekday", () => {
    const groups = buildWeek(
      [
        entry([
          game({ id: "today", date: new Date(2026, 6, 25, 19, 0).toISOString() }),
          game({ id: "mon", date: new Date(2026, 6, 27, 19, 0).toISOString() }),
        ]),
      ],
      now,
    );
    expect(groups[0].label).toBe("TODAY");
    expect(groups[1].label).toBe("MON"); // Jul 27 2026 is a Monday
  });

  it("orders days ascending and games within a day by time", () => {
    const groups = buildWeek(
      [
        entry([
          game({ id: "late", date: new Date(2026, 6, 25, 21, 0).toISOString() }),
          game({ id: "early", date: new Date(2026, 6, 25, 17, 0).toISOString() }),
          game({ id: "tomorrow", date: new Date(2026, 6, 26, 12, 0).toISOString() }),
        ]),
      ],
      now,
    );
    expect(groups.map((g) => g.key)).toEqual(["2026-07-25", "2026-07-26"]);
    expect(groups[0].games.map((g) => g.date)).toEqual([
      new Date(2026, 6, 25, 17, 0).toISOString(),
      new Date(2026, 6, 25, 21, 0).toISOString(),
    ]);
  });

  it("formats opponent by home/away", () => {
    const groups = buildWeek(
      [
        entry([
          game({ isHome: true, awayTeam: { id: "2", abbreviation: "GSW" } }),
          game({ id: "away", isHome: false, homeTeam: { id: "9", abbreviation: "MIN" }, date: new Date(2026, 6, 26, 19, 0).toISOString() }),
        ]),
      ],
      now,
    );
    const opps = groups.flatMap((g) => g.games.map((wg) => wg.opponent));
    expect(opps).toContain("vs GSW");
    expect(opps).toContain("@ MIN");
  });

  it("carries the followed team's ids for the scroll target", () => {
    const groups = buildWeek([entry([game()])], now);
    const wg = groups[0].games[0];
    expect(wg.leagueId).toBe("nba");
    expect(wg.teamId).toBe("13");
    expect(wg.teamAbbr).toBe("LAL");
    expect(wg.icon).toBe("🏀");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/leagues/upcomingWeek.test.ts`
Expected: FAIL — cannot resolve `./upcomingWeek`.

- [ ] **Step 3: Write minimal implementation**

Create `src/leagues/upcomingWeek.ts`:

```ts
import type { Game, LeagueConfig, Team } from "../domain/types";

export interface WeekGame {
  leagueId: string;
  teamId: string;
  teamAbbr: string;
  icon: string;
  opponent: string; // "vs GSW" or "@ MIN"
  date: string; // ISO
}

export interface DayGroup {
  key: string; // "YYYY-MM-DD" local
  label: string; // "TODAY" or uppercase short weekday
  games: WeekGame[];
}

export interface WeekEntry {
  team: Team;
  league: LeagueConfig;
  upcomingGames: Game[];
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function dayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function buildWeek(entries: WeekEntry[], now: Date): DayGroup[] {
  const windowStart = startOfDay(now);
  const windowEnd = new Date(windowStart);
  windowEnd.setDate(windowEnd.getDate() + 7);
  const todayKey = dayKey(windowStart);

  const byDay = new Map<string, DayGroup>();

  for (const entry of entries) {
    for (const g of entry.upcomingGames) {
      const gd = new Date(g.date);
      if (gd < windowStart || gd >= windowEnd) continue;
      const key = dayKey(gd);
      let group = byDay.get(key);
      if (!group) {
        const label =
          key === todayKey
            ? "TODAY"
            : gd.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase();
        group = { key, label, games: [] };
        byDay.set(key, group);
      }
      group.games.push({
        leagueId: entry.team.leagueId,
        teamId: entry.team.id,
        teamAbbr: entry.team.abbreviation,
        icon: entry.league.icon,
        opponent: g.isHome
          ? `vs ${g.awayTeam.abbreviation}`
          : `@ ${g.homeTeam.abbreviation}`,
        date: g.date,
      });
    }
  }

  const groups = [...byDay.values()].sort((a, b) => a.key.localeCompare(b.key));
  for (const group of groups) {
    group.games.sort((a, b) => a.date.localeCompare(b.date));
  }
  return groups;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/leagues/upcomingWeek.test.ts`
Expected: PASS (5 cases).

- [ ] **Step 5: Commit**

```bash
git add src/leagues/upcomingWeek.ts src/leagues/upcomingWeek.test.ts
git commit -m "feat: add pure upcoming-week grouper"
```

---

### Task 2: `WeekBanner` component

**Files:**
- Create: `src/components/WeekBanner.tsx`
- Test: `src/components/WeekBanner.test.tsx`
- Modify: `src/index.css`

**Interfaces:**
- Consumes: `DayGroup` from `../leagues/upcomingWeek`.
- Produces: `WeekBanner({ groups, activeLeague }: { groups: DayGroup[]; activeLeague?: string | null })`.

- [ ] **Step 1: Write the failing test**

Create `src/components/WeekBanner.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { WeekBanner } from "./WeekBanner";
import type { DayGroup } from "../leagues/upcomingWeek";

const groups: DayGroup[] = [
  {
    key: "2026-07-25",
    label: "TODAY",
    games: [
      { leagueId: "nba", teamId: "13", teamAbbr: "LAL", icon: "🏀", opponent: "vs GSW", date: "2026-07-25T23:30:00Z" },
      { leagueId: "nfl", teamId: "25", teamAbbr: "SF", icon: "🏈", opponent: "@ LAR", date: "2026-07-25T20:00:00Z" },
    ],
  },
];

describe("WeekBanner", () => {
  it("renders a card per game linking to that team's anchor", () => {
    render(<WeekBanner groups={groups} />);
    const lal = screen.getByRole("link", { name: "LAL vs GSW" });
    expect(lal).toHaveAttribute("href", "#team-nba-13");
    const sf = screen.getByRole("link", { name: "SF @ LAR" });
    expect(sf).toHaveAttribute("href", "#team-nfl-25");
  });

  it("narrows to the active league when it has games", () => {
    render(<WeekBanner groups={groups} activeLeague="nfl" />);
    expect(screen.getByRole("link", { name: "SF @ LAR" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "LAL vs GSW" })).toBeNull();
  });

  it("shows all games when the active league has none here (stale filter)", () => {
    render(<WeekBanner groups={groups} activeLeague="mlb" />);
    expect(screen.getByRole("link", { name: "LAL vs GSW" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "SF @ LAR" })).toBeInTheDocument();
  });

  it("shows an empty message when there are no games", () => {
    render(<WeekBanner groups={[]} />);
    expect(screen.getByText(/no games in the next 7 days/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/components/WeekBanner.test.tsx`
Expected: FAIL — cannot resolve `./WeekBanner`.

- [ ] **Step 3: Write minimal implementation**

Create `src/components/WeekBanner.tsx`:

```tsx
import type { DayGroup } from "../leagues/upcomingWeek";

interface WeekBannerProps {
  groups: DayGroup[];
  activeLeague?: string | null;
}

function timeText(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function WeekBanner({ groups, activeLeague = null }: WeekBannerProps) {
  // Respect the sport filter, but only when the active league actually has games
  // here; a stale filter falls back to showing everything.
  const hasActive =
    activeLeague !== null &&
    groups.some((g) => g.games.some((game) => game.leagueId === activeLeague));
  const filtered = hasActive
    ? groups
        .map((g) => ({ ...g, games: g.games.filter((game) => game.leagueId === activeLeague) }))
        .filter((g) => g.games.length > 0)
    : groups;

  const empty = filtered.every((g) => g.games.length === 0);

  return (
    <section className="week-banner" aria-label="Games in the next 7 days">
      <h2 className="week-banner-title">Next 7 Days</h2>
      {empty ? (
        <p className="week-banner-empty">No games in the next 7 days.</p>
      ) : (
        <div className="week-strip">
          {filtered.map((group) => (
            <div key={group.key} className="week-day">
              <div className="week-day-label">{group.label}</div>
              <div className="week-day-games">
                {group.games.map((game, i) => (
                  <a
                    key={`${game.leagueId}:${game.teamId}:${i}`}
                    className="week-card"
                    href={`#team-${game.leagueId}-${game.teamId}`}
                    aria-label={`${game.teamAbbr} ${game.opponent}`}
                  >
                    <span className="week-card-team">
                      <span aria-hidden>{game.icon}</span> {game.teamAbbr}
                    </span>
                    <span className="week-card-opp">{game.opponent}</span>
                    <span className="week-card-time">{timeText(game.date)}</span>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/components/WeekBanner.test.tsx`
Expected: PASS (4 cases).

- [ ] **Step 5: Add styles**

In `src/index.css`, append these rules (e.g. after the `.team-group-header` block near the top of the team-list styles):

```css
.week-banner { margin-top: 16px; }
.week-banner-title { margin: 0 0 8px; color: var(--muted); font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }
.week-banner-empty { color: var(--muted); font-size: 14px; margin: 0; }
.week-strip { display: flex; gap: 20px; overflow-x: auto; padding-bottom: 8px; }
.week-day { flex: 0 0 auto; }
.week-day-label { color: var(--muted); font-size: 11px; font-weight: 700; letter-spacing: 0.06em; margin-bottom: 6px; }
.week-day-games { display: flex; gap: 8px; }
.week-card {
  display: flex; flex-direction: column; gap: 2px; min-width: 92px; padding: 8px 10px;
  background: var(--panel); border: 1px solid var(--line); border-radius: 10px;
  color: var(--text); text-decoration: none;
  transition: border-color 0.1s ease, transform 0.1s ease;
}
.week-card:hover { border-color: var(--accent); transform: translateY(-1px); }
.week-card:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.week-card-team { font-weight: 700; font-size: 14px; }
.week-card-opp { font-size: 13px; }
.week-card-time { color: var(--muted); font-size: 12px; }
```

- [ ] **Step 6: Commit**

```bash
git add src/components/WeekBanner.tsx src/components/WeekBanner.test.tsx src/index.css
git commit -m "feat: add WeekBanner strip component"
```

---

### Task 3: Scroll target on `TeamPanel` + scroll CSS

**Files:**
- Modify: `src/components/TeamPanel.tsx`
- Test: `src/components/TeamPanel.test.tsx`
- Modify: `src/index.css`

**Interfaces:**
- Produces: the `TeamPanel` root `<section>` carries `id={`team-${team.leagueId}-${team.teamId}`}` (from its existing `FollowedTeam` `team` prop). No new exports.

- [ ] **Step 1: Write the failing test**

Add this case inside the existing `describe("TeamPanel", ...)` block in `src/components/TeamPanel.test.tsx` (the file already defines `team = { leagueId: "nba", teamId: "13" }` and the `mockStatus`/`sample` helpers):

```tsx
  it("gives the panel an anchor id for scroll targeting", () => {
    mockStatus({ isLoading: false, isError: false, isSuccess: true, data: sample });
    const { container } = render(<TeamPanel team={team} onRemove={() => {}} />);
    expect(container.querySelector("#team-nba-13")).not.toBeNull();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/components/TeamPanel.test.tsx`
Expected: FAIL — no element with id `team-nba-13`.

- [ ] **Step 3: Write minimal implementation**

In `src/components/TeamPanel.tsx`, add the `id` to the root section. Change:

```tsx
    <section className="team-panel">
```

to:

```tsx
    <section className="team-panel" id={`team-${team.leagueId}-${team.teamId}`}>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/components/TeamPanel.test.tsx`
Expected: PASS (new case plus all existing TeamPanel cases).

- [ ] **Step 5: Add smooth-scroll + target-flash CSS**

In `src/index.css`, add a smooth-scroll rule to the existing `html`/`body` area near the top (add a new `html` rule if none exists):

```css
html { scroll-behavior: smooth; }
```

And add the flash animation near the `.team-panel` rules:

```css
@keyframes panel-flash {
  from { box-shadow: 0 0 0 2px var(--accent); }
  to { box-shadow: 0 0 0 2px transparent; }
}
.team-panel:target { animation: panel-flash 1.2s ease-out; }
```

- [ ] **Step 6: Commit**

```bash
git add src/components/TeamPanel.tsx src/components/TeamPanel.test.tsx src/index.css
git commit -m "feat: add scroll-target id and target-flash to TeamPanel"
```

---

### Task 4: `useUpcomingWeek` hook + App wiring

**Files:**
- Create: `src/hooks/useUpcomingWeek.ts`
- Modify: `src/App.tsx`
- Test: `src/components/App.test.tsx`

**Interfaces:**
- Consumes: `teamStatusQuery` from `./useTeamStatus`; `buildWeek`, `DayGroup`, `WeekEntry` from `../leagues/upcomingWeek`; `FollowedTeam` from `./useFollowedTeams`; `WeekBanner` from `./components/WeekBanner`.
- Produces: `useUpcomingWeek(followed: FollowedTeam[]): DayGroup[]`.

- [ ] **Step 1: Write the failing test**

First, in `src/components/App.test.tsx`, add an import and a default mock so the real hook never fires network in existing tests. Add to the imports:

```tsx
import * as weekHook from "../hooks/useUpcomingWeek";
```

In the `beforeEach`, after the existing `inSeasonHook` mock, add:

```tsx
    vi.spyOn(weekHook, "useUpcomingWeek").mockReturnValue([]);
```

Then add this new test inside `describe("App", ...)`:

```tsx
  it("renders the upcoming-week banner with a card linking to the team", () => {
    vi.spyOn(followed, "useFollowedTeams").mockReturnValue({
      followed: [{ leagueId: "nba", teamId: "13" }],
      add: vi.fn(),
      remove: vi.fn(),
    });
    vi.spyOn(statusHook, "useTeamStatus").mockReturnValue({
      isLoading: false,
      isError: false,
      isSuccess: true,
      data: statusFor("Lakers"),
    } as ReturnType<typeof statusHook.useTeamStatus>);
    vi.spyOn(weekHook, "useUpcomingWeek").mockReturnValue([
      {
        key: "2026-07-25",
        label: "TODAY",
        games: [
          { leagueId: "nba", teamId: "13", teamAbbr: "LAL", icon: "🏀", opponent: "vs GSW", date: "2026-07-25T23:30:00Z" },
        ],
      },
    ]);

    renderApp();
    expect(screen.getByRole("link", { name: "LAL vs GSW" })).toHaveAttribute("href", "#team-nba-13");
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/components/App.test.tsx`
Expected: FAIL — `../hooks/useUpcomingWeek` cannot be resolved (module missing) and the banner link isn't rendered.

- [ ] **Step 3: Write the hook**

Create `src/hooks/useUpcomingWeek.ts`:

```ts
import { useQueries } from "@tanstack/react-query";
import { teamStatusQuery } from "./useTeamStatus";
import { buildWeek, type DayGroup, type WeekEntry } from "../leagues/upcomingWeek";
import type { FollowedTeam } from "./useFollowedTeams";

// Reads every followed team's (cache-shared) status and returns the next 7 days
// of games grouped by day. Keyed by the same query as useTeamStatus, so it adds
// no extra fetches.
export function useUpcomingWeek(followed: FollowedTeam[]): DayGroup[] {
  const results = useQueries({ queries: followed.map(teamStatusQuery) });
  const entries: WeekEntry[] = results
    .map((r) => r.data)
    .filter((d): d is NonNullable<typeof d> => d !== undefined)
    .map((d) => ({ team: d.team, league: d.league, upcomingGames: d.upcomingGames }));
  return buildWeek(entries, new Date());
}
```

- [ ] **Step 4: Wire into `App.tsx`**

Add imports:

```tsx
import { WeekBanner } from "./components/WeekBanner";
import { useUpcomingWeek } from "./hooks/useUpcomingWeek";
```

Add the hook call after `inSeasonLeagues`:

```tsx
  const inSeasonLeagues = useInSeasonLeagues(followed);
  const week = useUpcomingWeek(followed);
```

Render the banner between `<SportFilterBar ... />` and `<main>` (only when teams are followed, so an empty account keeps its existing empty state):

```tsx
      />
      {followed.length > 0 && (
        <WeekBanner groups={week} activeLeague={activeLeague} />
      )}
      <main>
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test:run -- src/components/App.test.tsx`
Expected: PASS (new case plus all existing App cases).

- [ ] **Step 6: Full suite + build**

Run: `npm run test:run` — Expected: all suites PASS.
Run: `npm run build` — Expected: `tsc -b` + `vite build` succeed with no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useUpcomingWeek.ts src/App.tsx src/components/App.test.tsx
git commit -m "feat: wire upcoming-week banner into the app"
```

- [ ] **Step 8: Visual check (manual)**

Run `npm run dev`: confirm the strip appears under the filter bar, days read `TODAY`/weekday, cards show icon + abbr + opponent + time, horizontal scroll works, clicking a card smooth-scrolls to that team's panel and the panel briefly flashes, and the sport filter narrows the strip.

---

## Notes on spec coverage

- Window boundaries, grouping/ordering, TODAY label, opponent formatting, scroll-target ids → Task 1 tests.
- Card links + filter narrowing + empty state → Task 2 tests.
- Anchor id on the panel + smooth-scroll + `:target` flash → Task 3.
- No-extra-fetch hook + placement + "no teams → no banner" → Task 4.
- Out-of-scope items (dedup, past results, persisted highlight) intentionally omitted.
