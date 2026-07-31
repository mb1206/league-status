# All-Teams Calendar + Lighter Header Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a calendar icon beside "Next 7 Days" that opens a full-season month calendar aggregating every followed team's games, and make the `track my teamzzz` title slightly thinner.

**Architecture:** Introduce a normalized `CalendarEntry` ({team, league, game}) projection. Generalize the team-bound `SeasonCalendar` into a shared `GameCalendar` that renders `CalendarEntry[]` and takes an optional `actions` slot. A new `useAllGames` hook flattens every followed team's cached games into entries (no new fetches), and a new `CalendarModal` renders them via `GameCalendar`, opened from a button in `WeekBanner`.

**Tech Stack:** React 19, TypeScript, @tanstack/react-query v5, Vitest + Testing Library, plain CSS.

## Global Constraints

- Test runner: `npx vitest run <path>` for a single file; `npm run test:run` for all.
- Type/build check: `npm run build` (runs `tsc -b` then vite build).
- Follow existing patterns: pure logic in `src/leagues/*`, hooks in `src/hooks/*`, components in `src/components/*`. Reuse existing CSS class names (`season-calendar-*`, `season-games-dialog.calendar`, `dialog`, `dialog-backdrop`) so the new calendar matches the per-team one.
- `en-dash` (`–`, U+2013) is the score separator already used in the calendar — keep it.
- Commit after each task with a `feat:`/`refactor:`/`style:` prefix and the trailer `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

### Task 1: `CalendarEntry` projection + `useAllGames` hook

**Files:**
- Create: `src/leagues/calendar.ts`
- Create: `src/leagues/calendar.test.ts`
- Create: `src/hooks/useAllGames.ts`

**Interfaces:**
- Consumes: `teamStatusQuery` from `src/hooks/useTeamStatus.ts`; `Game`, `LeagueConfig`, `Team` from `src/domain/types.ts`; `FollowedTeam` from `src/hooks/useFollowedTeams.ts`.
- Produces:
  - `interface CalendarEntry { team: Team; league: LeagueConfig; game: Game }`
  - `function toEntries(team: Team, league: LeagueConfig, games: Game[]): CalendarEntry[]`
  - `function useAllGames(followed: FollowedTeam[]): CalendarEntry[]`

- [ ] **Step 1: Write the failing test for `toEntries`**

Create `src/leagues/calendar.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { toEntries } from "./calendar";
import type { Game, LeagueConfig, Team } from "../domain/types";

const nba: LeagueConfig = {
  id: "nba", sport: "basketball", league: "nba", displayName: "NBA", icon: "🏀", hasPlayoffs: true,
};
const team: Team = { id: "13", leagueId: "nba", name: "Los Angeles Lakers", abbreviation: "LAL" };
const game: Game = {
  id: "g1", date: "2026-10-15T02:30:00Z", status: "final", seasonType: "regular",
  isHome: true, result: "W",
  homeTeam: { id: "13", abbreviation: "LAL", score: 110 },
  awayTeam: { id: "2", abbreviation: "BOS", score: 99 },
};

describe("toEntries", () => {
  it("tags each game with its team and league", () => {
    const entries = toEntries(team, nba, [game]);
    expect(entries).toEqual([{ team, league: nba, game }]);
  });

  it("returns an empty array for no games", () => {
    expect(toEntries(team, nba, [])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/leagues/calendar.test.ts`
Expected: FAIL — cannot find module `./calendar` / `toEntries` is not a function.

- [ ] **Step 3: Create `src/leagues/calendar.ts`**

```ts
import type { Game, LeagueConfig, Team } from "../domain/types";

// A single game paired with the team/league it belongs to, so a calendar can
// render games from many teams together (logo, opponent, links all need context).
export interface CalendarEntry {
  team: Team;
  league: LeagueConfig;
  game: Game;
}

export function toEntries(team: Team, league: LeagueConfig, games: Game[]): CalendarEntry[] {
  return games.map((game) => ({ team, league, game }));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/leagues/calendar.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Create the `useAllGames` hook**

Create `src/hooks/useAllGames.ts`. It mirrors `useUpcomingWeek` — same `useQueries` over the shared `teamStatusQuery`, so it adds no extra fetches:

```ts
import { useQueries } from "@tanstack/react-query";
import { teamStatusQuery } from "./useTeamStatus";
import { toEntries, type CalendarEntry } from "../leagues/calendar";
import type { FollowedTeam } from "./useFollowedTeams";

// Reads every followed team's (cache-shared) status and flattens all past +
// upcoming games into a single tagged list for the all-teams calendar. Keyed by
// the same query as useTeamStatus, so it adds no extra fetches.
export function useAllGames(followed: FollowedTeam[]): CalendarEntry[] {
  const results = useQueries({ queries: followed.map(teamStatusQuery) });
  return results
    .map((r) => r.data)
    .filter((d): d is NonNullable<typeof d> => d !== undefined)
    .flatMap((d) => toEntries(d.team, d.league, [...d.pastGames, ...d.upcomingGames]));
}
```

- [ ] **Step 6: Verify types compile**

Run: `npm run build`
Expected: build succeeds (no TS errors). (This confirms `useAllGames` typechecks; it's exercised by tests in Task 3.)

- [ ] **Step 7: Commit**

```bash
git add src/leagues/calendar.ts src/leagues/calendar.test.ts src/hooks/useAllGames.ts
git commit -m "feat: add CalendarEntry projection and useAllGames hook

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Refactor `SeasonCalendar` → shared `GameCalendar`

Generalize the calendar to render `CalendarEntry[]` with an optional `actions` slot, add a multi-team logo chip, and update `SeasonGamesModal` to feed it. The per-team bulk `.ics` button moves out of the calendar into the modal's `actions`.

**Files:**
- Create: `src/components/GameCalendar.tsx` (replaces `SeasonCalendar.tsx`)
- Delete: `src/components/SeasonCalendar.tsx`
- Rename+rewrite: `src/components/SeasonCalendar.test.tsx` → `src/components/GameCalendar.test.tsx`
- Modify: `src/components/SeasonGamesModal.tsx`
- Modify: `src/components/SeasonGamesModal.test.tsx` (add the moved bulk-export test)
- Modify: `src/index.css` (actions slot + logo chip styles)

**Interfaces:**
- Consumes: `CalendarEntry` from `src/leagues/calendar.ts`; `gameLinks` from `src/components/gameLinks.ts`; `LinkIcons` from `src/components/LinkIcons.tsx`; `buildCalendar`, `downloadIcs`, `icsBulkFilename` from `src/leagues/ics.ts`.
- Produces:
  - `function GameCalendar(props: { entries: CalendarEntry[]; actions?: ReactNode; now?: Date }): JSX.Element`
  - `SeasonGamesModal` unchanged public props.

- [ ] **Step 1: Create `src/components/GameCalendar.tsx`**

Full component (generalized from `SeasonCalendar`; reads team/league off each entry, adds `multiTeam` logo chip and `actions` slot, drops all `.ics` imports):

```tsx
import { useMemo, useState, type ReactNode } from "react";
import type { Game } from "../domain/types";
import { LinkIcons } from "./LinkIcons";
import { gameLinks } from "./gameLinks";
import type { CalendarEntry } from "../leagues/calendar";

interface GameCalendarProps {
  entries: CalendarEntry[];
  actions?: ReactNode;
  now?: Date;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function ym(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function dayKey(d: Date): string {
  return `${ym(d)}-${String(d.getDate()).padStart(2, "0")}`;
}
function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}
function scoreText(g: Game): string {
  if (g.homeTeam.score == null || g.awayTeam.score == null) return "";
  const mine = g.isHome ? g.homeTeam.score : g.awayTeam.score;
  const theirs = g.isHome ? g.awayTeam.score : g.homeTeam.score;
  return `${mine}–${theirs}`;
}

export function GameCalendar({ entries, actions, now = new Date() }: GameCalendarProps) {
  const sorted = useMemo(
    () =>
      [...entries].sort(
        (a, b) => new Date(a.game.date).getTime() - new Date(b.game.date).getTime(),
      ),
    [entries],
  );

  const months = useMemo(() => {
    const set = new Set(sorted.map((e) => ym(new Date(e.game.date))));
    return [...set].sort();
  }, [sorted]);

  // Show a per-game team badge only when the calendar spans more than one team;
  // in the single-team modal that would be redundant noise.
  const multiTeam = useMemo(
    () => new Set(sorted.map((e) => `${e.team.leagueId}:${e.team.id}`)).size > 1,
    [sorted],
  );

  const nowKey = ym(now);
  const initialIndex = useMemo(() => {
    if (months.length === 0) return 0;
    const idx = months.findIndex((k) => k >= nowKey);
    return idx === -1 ? months.length - 1 : idx;
  }, [months, nowKey]);

  const [index, setIndex] = useState(initialIndex);

  if (months.length === 0) {
    return <p className="game-list-empty">No games</p>;
  }

  const monthKey = months[Math.min(index, months.length - 1)];
  const monthEntries = sorted.filter((e) => ym(new Date(e.game.date)) === monthKey);
  const entriesByDay = new Map<string, CalendarEntry[]>();
  for (const e of monthEntries) {
    const k = dayKey(new Date(e.game.date));
    entriesByDay.set(k, [...(entriesByDay.get(k) ?? []), e]);
  }

  const [y, m] = monthKey.split("-").map(Number);
  const firstWeekday = new Date(y, m - 1, 1).getDay();
  const daysInMonth = new Date(y, m, 0).getDate();
  const todayKey = dayKey(now);

  const cells: (number | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="season-calendar">
      <div className="season-calendar-nav">
        <button
          className="season-calendar-navbtn"
          aria-label="Previous month"
          disabled={index === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
        >
          ‹
        </button>
        <span className="season-calendar-month">{monthLabel(monthKey)}</span>
        <button
          className="season-calendar-navbtn"
          aria-label="Next month"
          disabled={index === months.length - 1}
          onClick={() => setIndex((i) => Math.min(months.length - 1, i + 1))}
        >
          ›
        </button>
        {actions && <div className="season-calendar-actions">{actions}</div>}
      </div>

      <div className="season-calendar-grid" role="grid">
        {WEEKDAYS.map((w) => (
          <div key={w} className="season-calendar-weekday">
            {w}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day == null) return <div key={`b${i}`} className="season-calendar-day empty" />;
          const key = `${monthKey}-${String(day).padStart(2, "0")}`;
          const dayEntries = entriesByDay.get(key) ?? [];
          return (
            <div key={key} className={`season-calendar-day${key === todayKey ? " today" : ""}`}>
              <span className="season-calendar-daynum">{day}</span>
              {dayEntries.map(({ team, league, game: g }) => {
                const opp = g.isHome ? g.awayTeam.abbreviation : g.homeTeam.abbreviation;
                const played = g.status === "final";
                const score = scoreText(g);
                return (
                  <div
                    key={`${team.leagueId}:${team.id}:${g.id}`}
                    className={`season-calendar-game${played ? " past" : ""}`}
                  >
                    <span className="season-calendar-gameopp">
                      {multiTeam &&
                        (team.logoUrl ? (
                          <img
                            className="season-calendar-gamelogo"
                            src={team.logoUrl}
                            alt={team.abbreviation}
                            width={14}
                            height={14}
                          />
                        ) : (
                          <span className="season-calendar-gameicon" aria-hidden>
                            {league.icon}
                          </span>
                        ))}
                      {g.isHome ? "vs" : "@"} {opp}
                    </span>
                    {played && (g.result || score) && (
                      <span className="season-calendar-gamescore">
                        {g.result && <span className={`result-${g.result}`}>{g.result}</span>}
                        {score && <span className="season-calendar-gamenums">{score}</span>}
                      </span>
                    )}
                    <LinkIcons
                      className="season-calendar-gamelinks"
                      links={gameLinks(team, g, league)}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Delete the old component**

```bash
git rm src/components/SeasonCalendar.tsx
```

- [ ] **Step 3: Rewrite the test as `GameCalendar.test.tsx`**

```bash
git rm src/components/SeasonCalendar.test.tsx
```

Create `src/components/GameCalendar.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GameCalendar } from "./GameCalendar";
import { toEntries } from "../leagues/calendar";
import type { Game, LeagueConfig, Team } from "../domain/types";

const nba: LeagueConfig = {
  id: "nba", sport: "basketball", league: "nba", displayName: "NBA", icon: "🏀", hasPlayoffs: true,
};
const nhl: LeagueConfig = {
  id: "nhl", sport: "hockey", league: "nhl", displayName: "NHL", icon: "🏒", hasPlayoffs: true,
};
const lakers: Team = { id: "13", leagueId: "nba", name: "Los Angeles Lakers", abbreviation: "LAL", logoUrl: "https://logos.example/lal.png" };
const devils: Team = { id: "11", leagueId: "nhl", name: "New Jersey Devils", abbreviation: "NJD" };
const base = { seasonType: "regular" as const };

const NOW = new Date("2026-10-20T12:00:00Z");
const past: Game[] = [
  { ...base, id: "p1", date: "2026-10-15T02:30:00Z", status: "final", result: "W",
    isHome: true, homeTeam: { id: "13", abbreviation: "LAL", score: 110 }, awayTeam: { id: "2", abbreviation: "BOS", score: 99 } },
];
const upcoming: Game[] = [
  { ...base, id: "u1", date: "2026-12-03T02:30:00Z", status: "scheduled",
    isHome: false, homeTeam: { id: "5", abbreviation: "GSW" }, awayTeam: { id: "13", abbreviation: "LAL" } },
];

function renderCal() {
  return render(
    <GameCalendar entries={toEntries(lakers, nba, [...past, ...upcoming])} now={NOW} />,
  );
}

describe("GameCalendar", () => {
  it("opens on the nearest month with games and shows the weekday header", () => {
    renderCal();
    expect(screen.getByText(/October 2026/)).toBeInTheDocument();
    expect(screen.getByText("Sun")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /previous month/i })).toBeDisabled();
  });

  it("skips the empty November when navigating to the next month with games", async () => {
    renderCal();
    await userEvent.click(screen.getByRole("button", { name: /next month/i }));
    expect(screen.getByText(/December 2026/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next month/i })).toBeDisabled();
  });

  it("shows the score and result inside the day cell for a played game", () => {
    renderCal();
    expect(screen.getByText("vs BOS")).toBeInTheDocument();
    expect(screen.getByText("W")).toBeInTheDocument();
    expect(screen.getByText("110–99")).toBeInTheDocument();
  });

  it("puts a '+' export chip on an upcoming game's cell but not a played game's", async () => {
    renderCal();
    expect(screen.queryByRole("button", { name: /add .* to calendar/i })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: /next month/i }));
    expect(screen.getByRole("button", { name: /add .* to calendar/i })).toBeInTheDocument();
  });

  it("renders the actions slot in the nav row", () => {
    render(
      <GameCalendar
        entries={toEntries(lakers, nba, past)}
        actions={<button>Add all upcoming</button>}
        now={NOW}
      />,
    );
    expect(screen.getByRole("button", { name: /add all upcoming/i })).toBeInTheDocument();
  });

  it("shows a team badge per game only when multiple teams are present", () => {
    // Two teams with a game in the same October: Lakers (logo) + Devils (icon fallback).
    const devilsGame: Game = {
      ...base, id: "d1", date: "2026-10-16T23:00:00Z", status: "scheduled",
      isHome: true, homeTeam: { id: "11", abbreviation: "NJD" }, awayTeam: { id: "18", abbreviation: "SJS" },
    };
    render(
      <GameCalendar
        entries={[...toEntries(lakers, nba, past), ...toEntries(devils, nhl, [devilsGame])]}
        now={NOW}
      />,
    );
    // Lakers logo rendered as an img with the team abbreviation as alt.
    expect(screen.getByAltText("LAL")).toBeInTheDocument();
    // Devils have no logoUrl → league icon fallback text present.
    expect(screen.getByText("🏒")).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Update `SeasonGamesModal.tsx` to use `GameCalendar`**

In `src/components/SeasonGamesModal.tsx`, replace the `SeasonCalendar` import and its render. Change the import line:

```tsx
import { GameCalendar } from "./GameCalendar";
import { toEntries } from "../leagues/calendar";
import { buildCalendar, downloadIcs, icsBulkFilename } from "../leagues/ics";
```

Replace the calendar-view body (the `<div className="season-games-body"><SeasonCalendar .../></div>` block) with:

```tsx
<div className="season-games-body">
  <GameCalendar
    entries={toEntries(team, league, [...pastGames, ...upcomingGames])}
    actions={
      upcomingGames.length > 0 ? (
        <button
          className="season-calendar-bulk"
          onClick={() =>
            downloadIcs(icsBulkFilename(team), buildCalendar(team, league, upcomingGames))
          }
        >
          ➕ Add all upcoming
        </button>
      ) : undefined
    }
  />
</div>
```

- [ ] **Step 5: Add the moved bulk-export test to `SeasonGamesModal.test.tsx`**

The bulk `.ics` button now lives in the modal, so its behavior test moves here. Append inside the `describe("SeasonGamesModal", ...)` block in `src/components/SeasonGamesModal.test.tsx` (the file already imports `vi`; add the `icsBulkFilename` import at the top):

```tsx
// add to the existing imports at the top of the file:
import { icsBulkFilename } from "../leagues/ics";
```

```tsx
  it("bulk-exports all upcoming games from the calendar view", async () => {
    const createUrl = vi.fn(() => "blob:x");
    vi.stubGlobal("URL", { createObjectURL: createUrl, revokeObjectURL: vi.fn() });
    let downloadName: string | undefined;
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function (this: HTMLAnchorElement) {
        downloadName = this.download;
      });
    render(
      <SeasonGamesModal team={team} league={league} pastGames={past} upcomingGames={upcoming} onClose={() => {}} />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /calendar view/i }));
    await user.click(screen.getByRole("button", { name: /add all upcoming/i }));
    expect(createUrl).toHaveBeenCalledTimes(1);
    expect(downloadName).toBe(icsBulkFilename(team));
    clickSpy.mockRestore();
    vi.unstubAllGlobals();
  });
```

- [ ] **Step 6: Add CSS for the actions slot and multi-team badge**

In `src/index.css`, immediately after the `.season-calendar-bulk:hover` rule (line ~231), add:

```css
.season-calendar-actions { margin-left: auto; display: flex; gap: 8px; }
.season-calendar-gamelogo { border-radius: 2px; vertical-align: -2px; margin-right: 2px; }
.season-calendar-gameicon { margin-right: 2px; }
```

Then delete the now-unused `margin-left: auto;` from `.season-calendar-bulk` (line ~230) since the wrapper handles alignment. The rule becomes:

```css
.season-calendar-bulk { background: var(--panel); border: 1px solid var(--line); color: var(--text); border-radius: 8px; padding: 6px 10px; font-size: 12px; font-weight: 600; cursor: pointer; }
```

- [ ] **Step 7: Run the affected tests**

Run: `npx vitest run src/components/GameCalendar.test.tsx src/components/SeasonGamesModal.test.tsx`
Expected: PASS (all GameCalendar + SeasonGamesModal tests, including the moved bulk-export test).

- [ ] **Step 8: Full typecheck + test suite**

Run: `npm run build && npm run test:run`
Expected: build succeeds; entire suite passes (confirms nothing else imported `SeasonCalendar`).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "refactor: generalize SeasonCalendar into shared GameCalendar

Renders a tagged CalendarEntry[] with an optional actions slot and a
per-game team badge for multi-team calendars; the per-team bulk .ics
button moves into SeasonGamesModal's actions slot.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: `CalendarModal`

A dialog that renders the all-teams `GameCalendar` from `useAllGames`, reusing the existing wide calendar-dialog chrome.

**Files:**
- Create: `src/components/CalendarModal.tsx`
- Create: `src/components/CalendarModal.test.tsx`

**Interfaces:**
- Consumes: `useAllGames` from `src/hooks/useAllGames.ts`; `GameCalendar` from `src/components/GameCalendar.tsx`; `FollowedTeam` from `src/hooks/useFollowedTeams.ts`.
- Produces: `function CalendarModal(props: { followed: FollowedTeam[]; onClose: () => void }): JSX.Element`

- [ ] **Step 1: Write the failing test**

Create `src/components/CalendarModal.test.tsx`. It mocks `useAllGames` (mirrors how `App.test` mocks hooks), so no QueryClient is needed:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CalendarModal } from "./CalendarModal";
import * as allGames from "../hooks/useAllGames";
import { toEntries } from "../leagues/calendar";
import type { Game, LeagueConfig, Team } from "../domain/types";

const nba: LeagueConfig = {
  id: "nba", sport: "basketball", league: "nba", displayName: "NBA", icon: "🏀", hasPlayoffs: true,
};
const nhl: LeagueConfig = {
  id: "nhl", sport: "hockey", league: "nhl", displayName: "NHL", icon: "🏒", hasPlayoffs: true,
};
const lakers: Team = { id: "13", leagueId: "nba", name: "Los Angeles Lakers", abbreviation: "LAL", logoUrl: "https://logos.example/lal.png" };
const devils: Team = { id: "11", leagueId: "nhl", name: "New Jersey Devils", abbreviation: "NJD" };
const base = { seasonType: "regular" as const, status: "scheduled" as const };

const lakersGame: Game = { ...base, id: "l1", date: "2026-10-15T02:30:00Z", isHome: true, homeTeam: { id: "13", abbreviation: "LAL" }, awayTeam: { id: "2", abbreviation: "BOS" } };
const devilsGame: Game = { ...base, id: "d1", date: "2026-10-16T23:00:00Z", isHome: false, homeTeam: { id: "18", abbreviation: "SJS" }, awayTeam: { id: "11", abbreviation: "NJD" } };

function mockEntries(entries = [...toEntries(lakers, nba, [lakersGame]), ...toEntries(devils, nhl, [devilsGame])]) {
  vi.spyOn(allGames, "useAllGames").mockReturnValue(entries);
}

describe("CalendarModal", () => {
  it("renders a calendar aggregating games from every team", () => {
    mockEntries();
    render(<CalendarModal followed={[]} onClose={() => {}} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Sun")).toBeInTheDocument(); // weekday header → calendar rendered
    expect(screen.getByText("vs BOS")).toBeInTheDocument(); // Lakers game
    expect(screen.getByText("@ SJS")).toBeInTheDocument(); // Devils game
  });

  it("shows the empty state when there are no games", () => {
    mockEntries([]);
    render(<CalendarModal followed={[]} onClose={() => {}} />);
    expect(screen.getByText(/no games/i)).toBeInTheDocument();
  });

  it("closes on Escape, backdrop click, and the close button but not on inner click", async () => {
    mockEntries();
    const onClose = vi.fn();
    render(<CalendarModal followed={[]} onClose={onClose} />);
    const user = userEvent.setup();

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("dialog"));
    expect(onClose).toHaveBeenCalledTimes(1); // inner click ignored

    await user.click(screen.getByRole("dialog").parentElement!);
    expect(onClose).toHaveBeenCalledTimes(2); // backdrop closes

    await user.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(3);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/CalendarModal.test.tsx`
Expected: FAIL — cannot find module `./CalendarModal`.

- [ ] **Step 3: Create `src/components/CalendarModal.tsx`**

```tsx
import { useEffect } from "react";
import { useAllGames } from "../hooks/useAllGames";
import { GameCalendar } from "./GameCalendar";
import type { FollowedTeam } from "../hooks/useFollowedTeams";

interface CalendarModalProps {
  followed: FollowedTeam[];
  onClose: () => void;
}

// Every followed team's games on one calendar, opened from the "Next 7 Days"
// header. View-only: no bulk export (that stays per-team in SeasonGamesModal).
export function CalendarModal({ followed, onClose }: CalendarModalProps) {
  const entries = useAllGames(followed);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const titleId = "all-teams-calendar-title";
  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div
        className="dialog season-games-dialog calendar"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="season-games-header">
          <h3 id={titleId} className="season-games-heading">
            All teams — calendar
          </h3>
          <button className="dialog-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="season-games-body">
          <GameCalendar entries={entries} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/CalendarModal.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/CalendarModal.tsx src/components/CalendarModal.test.tsx
git commit -m "feat: add CalendarModal showing all teams on one calendar

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Calendar icon in `WeekBanner` + wire up in `App`

Add the calendar-icon button beside the "Next 7 Days" title and open `CalendarModal` from `App`.

**Files:**
- Modify: `src/components/WeekBanner.tsx`
- Modify: `src/components/WeekBanner.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/App.test.tsx`
- Modify: `src/index.css` (head row + icon button)

**Interfaces:**
- Consumes: `CalendarModal` from `src/components/CalendarModal.tsx`.
- Produces: `WeekBanner` gains required prop `onOpenCalendar: () => void`.

- [ ] **Step 1: Add the failing WeekBanner test**

In `src/components/WeekBanner.test.tsx`, add `vi` to the vitest import (`import { describe, expect, it, vi } from "vitest";`) and add this test inside the describe block. Every existing `render(<WeekBanner ... />)` call must also gain an `onOpenCalendar` prop — update them to `onOpenCalendar={() => {}}` (add the prop to all five existing `render` calls):

```tsx
  it("invokes onOpenCalendar when the calendar button is clicked", async () => {
    const onOpenCalendar = vi.fn();
    render(<WeekBanner groups={groups} onOpenCalendar={onOpenCalendar} />);
    await userEvent.click(screen.getByRole("button", { name: /all teams calendar/i }));
    expect(onOpenCalendar).toHaveBeenCalledTimes(1);
  });
```

Add the userEvent import at the top if missing: `import userEvent from "@testing-library/user-event";`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/WeekBanner.test.tsx`
Expected: FAIL — no button named "all teams calendar" (and TS error on missing `onOpenCalendar` prop until Step 3).

- [ ] **Step 3: Update `WeekBanner.tsx`**

Add `onOpenCalendar` to the props interface and destructuring, and wrap the title in a head row with the button. Change the interface:

```tsx
interface WeekBannerProps {
  groups: DayGroup[];
  activeLeague?: string | null;
  onOpenCalendar: () => void;
}
```

Change the signature to `export function WeekBanner({ groups, activeLeague = null, onOpenCalendar }: WeekBannerProps) {` and replace the `<h2 className="week-banner-title">Next 7 Days</h2>` line with:

```tsx
      <div className="week-banner-head">
        <h2 className="week-banner-title">Next 7 Days</h2>
        <button
          className="week-calendar-btn"
          aria-label="All teams calendar"
          title="All teams calendar"
          onClick={onOpenCalendar}
        >
          📅
        </button>
      </div>
```

- [ ] **Step 4: Run the WeekBanner test to verify it passes**

Run: `npx vitest run src/components/WeekBanner.test.tsx`
Expected: PASS (all WeekBanner tests).

- [ ] **Step 5: Wire `App.tsx`**

Add the import, calendar-open state, the `onOpenCalendar` prop, and the modal render. Add to imports:

```tsx
import { CalendarModal } from "./components/CalendarModal";
```

Add state next to the other `useState` calls:

```tsx
  const [calendarOpen, setCalendarOpen] = useState(false);
```

Update the `WeekBanner` render to pass the handler:

```tsx
      {followed.length > 0 && (
        <WeekBanner
          groups={week}
          activeLeague={activeLeague}
          onOpenCalendar={() => setCalendarOpen(true)}
        />
      )}
```

Add the modal render just before the closing `</div>` of `.app` (after the `AddTeamDialog` block):

```tsx
      {calendarOpen && (
        <CalendarModal followed={followed} onClose={() => setCalendarOpen(false)} />
      )}
```

- [ ] **Step 6: Add an App integration test for opening the modal**

In `src/components/App.test.tsx`, mock `useAllGames` in `beforeEach` (so opening the modal is hermetic) and add a test. Add to the imports:

```tsx
import * as allGamesHook from "../hooks/useAllGames";
```

In `beforeEach`, after the `useUpcomingWeek` mock, add:

```tsx
    vi.spyOn(allGamesHook, "useAllGames").mockReturnValue([]);
```

Add this test inside the describe block:

```tsx
  it("opens the all-teams calendar from the Next 7 Days header", async () => {
    vi.spyOn(followed, "useFollowedTeams").mockReturnValue({
      followed: [{ leagueId: "nba", teamId: "Lakers" }],
      add: vi.fn(),
      remove: vi.fn(),
    });
    vi.spyOn(statusHook, "useTeamStatus").mockImplementation(
      (team) =>
        ({
          isLoading: false, isError: false, isSuccess: true, data: statusFor(team.teamId),
        }) as ReturnType<typeof statusHook.useTeamStatus>,
    );
    renderApp();
    expect(screen.queryByRole("dialog")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: /all teams calendar/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/all teams — calendar/i)).toBeInTheDocument();
  });
```

- [ ] **Step 7: Add CSS for the head row and icon button**

In `src/index.css`, change the `.week-banner-title` rule (line ~50) to drop its bottom margin (the head row owns spacing now):

```css
.week-banner-title { margin: 0; color: var(--muted); font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }
```

Then add directly after it:

```css
.week-banner-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.week-calendar-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 24px; height: 24px; padding: 0; line-height: 1;
  background: var(--panel); color: var(--text); border: 1px solid var(--line);
  border-radius: 6px; font-size: 13px; cursor: pointer;
}
.week-calendar-btn:hover { border-color: var(--accent); }
```

- [ ] **Step 8: Run the affected tests**

Run: `npx vitest run src/components/WeekBanner.test.tsx src/components/App.test.tsx`
Expected: PASS.

- [ ] **Step 9: Full typecheck + suite**

Run: `npm run build && npm run test:run`
Expected: build succeeds; entire suite passes.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: open an all-teams calendar from the Next 7 Days header

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Lighten the header title

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Add the header weight rule**

In `src/index.css`, directly after the `.app-header { ... }` block (ends line ~19), add:

```css
.app-header h1 { font-weight: 600; }
```

(Default `<h1>` weight is bold/700; 600 reads as slightly thinner without going light.)

- [ ] **Step 2: Verify the build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Visual check (manual)**

Run: `npm run dev` and confirm "track my teamzzz" renders slightly thinner than before. Stop the dev server when done.

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "style: lighten the track my teamzzz title weight to 600

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review Notes

- **Spec coverage:** `CalendarEntry` + `useAllGames` (Task 1); shared `GameCalendar` with multi-team badge + `actions` slot, `SeasonGamesModal` update (Task 2); `CalendarModal` reusing dialog chrome, show-all, view-only (Task 3); `WeekBanner` icon + `App` wiring, filter-independent (Task 4); header weight 600 (Task 5). All spec sections mapped.
- **Type consistency:** `CalendarEntry`, `toEntries`, `useAllGames`, and `GameCalendar`'s `{ entries, actions?, now? }` signature are used identically across Tasks 1–4. `WeekBanner`'s new required `onOpenCalendar` prop is added to every existing render call in Task 4 Step 1 to avoid TS breakage.
- **No placeholders:** every code and test block is complete; each step has an exact command and expected result.
