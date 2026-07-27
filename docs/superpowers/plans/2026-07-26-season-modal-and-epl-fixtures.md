# Season Games Modal + EPL Fixtures Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix missing Premier League upcoming fixtures at season start, and add a "View all" modal listing every game this season for a team.

**Architecture:** In the ESPN adapter's multi-competition path, when the primary competition's team-schedule returns zero events, backfill fixtures from the league scoreboard (fetched in monthly chunks, filtered to the followed team, mapped with the existing `mapGame`). A new `SeasonGamesModal` component renders the full `pastGames`/`upcomingGames` arrays `TeamPanel` already holds, reusing `GameList` for its two sections.

**Tech Stack:** TypeScript, React 19, Vitest, @testing-library/react, ESPN site API.

## Global Constraints

- Tests run with `npx vitest run <path>` (config in `vitest.setup.ts`).
- Follow existing patterns: `mapGame` is the only event mapper; URL builders live in `espnUrls` (`src/leagues/espn/client.ts`); modals follow the `AddTeamDialog` pattern (`.dialog-backdrop` + `.dialog`, click-outside + Escape to close).
- CSS variables available: `--bg #0f1115`, `--panel #1a1d24`, `--line #2a2f3a`, `--text #e7e9ee`, `--muted #9aa3b2`, `--accent #4f8cff`.
- No mapper changes: scoreboard events share the schedule event shape `mapGame` parses.
- Scoreboard fallback is scoped to the **primary** competition only (documented limitation: cup/European fixtures absent from ESPN's team-schedule at season start won't appear until ESPN populates it).
- TDD: write the failing test, watch it fail, implement minimally, watch it pass, commit.

---

## File Structure

- Create: `src/leagues/espn/seasonWindow.ts` — pure date helpers (`seasonWindow`, `monthlyChunks`, `currentSoccerSeasonYear`).
- Create: `src/leagues/espn/seasonWindow.test.ts`.
- Modify: `src/leagues/espn/client.ts` — `espnUrls.scoreboard` builder; `season?` field on `EspnScheduleResponse`.
- Modify: `src/leagues/espn/client.test.ts` — scoreboard URL test.
- Modify: `src/leagues/espn/adapter.ts` — scoreboard fallback in `fetchSchedule`.
- Modify: `src/leagues/espn/adapter.test.ts` — fallback tests.
- Create: `src/components/SeasonGamesModal.tsx` — the modal.
- Create: `src/components/SeasonGamesModal.test.tsx`.
- Modify: `src/components/TeamPanel.tsx` — "View all" button + modal wiring.
- Modify: `src/components/TeamPanel.test.tsx` — integration test (if the file exists; otherwise cover via SeasonGamesModal test — see Task 5).
- Modify: `src/index.css` — modal body/scroll + "View all" button styles.

---

## Task 1: Season-window date helpers

**Files:**
- Create: `src/leagues/espn/seasonWindow.ts`
- Test: `src/leagues/espn/seasonWindow.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `seasonWindow(year: number): { start: string; end: string }` — YYYYMMDD strings for `Aug 1 {year}` … `Jun 30 {year+1}`.
  - `monthlyChunks(startYmd: string, endYmd: string): { start: string; end: string }[]` — inclusive range split into per-calendar-month YYYYMMDD pairs.
  - `currentSoccerSeasonYear(now: Date): number` — the starting year of the soccer season containing/next after `now` (Jul–Dec → that year; Jan–Jun → prior year).

- [ ] **Step 1: Write the failing test**

```ts
// src/leagues/espn/seasonWindow.test.ts
import { describe, expect, it } from "vitest";
import { seasonWindow, monthlyChunks, currentSoccerSeasonYear } from "./seasonWindow";

describe("seasonWindow", () => {
  it("spans Aug 1 of the year to Jun 30 of the next", () => {
    expect(seasonWindow(2026)).toEqual({ start: "20260801", end: "20270630" });
  });
});

describe("monthlyChunks", () => {
  it("splits a full season into 11 per-month inclusive ranges", () => {
    const chunks = monthlyChunks("20260801", "20270630");
    expect(chunks).toHaveLength(11);
    expect(chunks[0]).toEqual({ start: "20260801", end: "20260831" });
    expect(chunks[1]).toEqual({ start: "20260901", end: "20260930" });
    expect(chunks[chunks.length - 1]).toEqual({ start: "20270601", end: "20270630" });
  });

  it("handles a range that starts and ends mid-month", () => {
    const chunks = monthlyChunks("20260815", "20260910");
    expect(chunks).toEqual([
      { start: "20260815", end: "20260831" },
      { start: "20260901", end: "20260910" },
    ]);
  });
});

describe("currentSoccerSeasonYear", () => {
  it("returns the current year in the second half of the calendar", () => {
    expect(currentSoccerSeasonYear(new Date("2026-07-26T00:00:00Z"))).toBe(2026);
    expect(currentSoccerSeasonYear(new Date("2026-11-01T00:00:00Z"))).toBe(2026);
  });
  it("returns the prior year in the first half of the calendar", () => {
    expect(currentSoccerSeasonYear(new Date("2027-03-01T00:00:00Z"))).toBe(2026);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/leagues/espn/seasonWindow.test.ts`
Expected: FAIL — cannot resolve module `./seasonWindow` / functions not exported.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/leagues/espn/seasonWindow.ts

function parseYmd(s: string): Date {
  const y = Number(s.slice(0, 4));
  const m = Number(s.slice(4, 6)) - 1;
  const d = Number(s.slice(6, 8));
  return new Date(Date.UTC(y, m, d));
}

function ymd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

// Soccer seasons run Aug–May; represent one by its starting calendar year.
export function seasonWindow(year: number): { start: string; end: string } {
  return {
    start: ymd(new Date(Date.UTC(year, 7, 1))), // Aug 1
    end: ymd(new Date(Date.UTC(year + 1, 5, 30))), // Jun 30 next year
  };
}

// Split an inclusive YYYYMMDD range into per-calendar-month ranges. The ESPN
// scoreboard hard-caps at 100 events per response; a month of one league is well
// under that, so month-sized chunks are safe.
export function monthlyChunks(
  startYmd: string,
  endYmd: string,
): { start: string; end: string }[] {
  const end = parseYmd(endYmd);
  const chunks: { start: string; end: string }[] = [];
  let cursor = parseYmd(startYmd);
  while (cursor.getTime() <= end.getTime()) {
    const monthEnd = new Date(
      Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0),
    );
    const chunkEnd = monthEnd.getTime() < end.getTime() ? monthEnd : end;
    chunks.push({ start: ymd(cursor), end: ymd(chunkEnd) });
    cursor = new Date(
      Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1),
    );
  }
  return chunks;
}

export function currentSoccerSeasonYear(now: Date): number {
  const y = now.getUTCFullYear();
  return now.getUTCMonth() >= 6 ? y : y - 1; // Jul(6)+ → this year, else prior
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/leagues/espn/seasonWindow.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/leagues/espn/seasonWindow.ts src/leagues/espn/seasonWindow.test.ts
git commit -m "feat: add soccer season-window date helpers"
```

---

## Task 2: Scoreboard URL builder + schedule season field

**Files:**
- Modify: `src/leagues/espn/client.ts`
- Test: `src/leagues/espn/client.test.ts`

**Interfaces:**
- Consumes: `EspnPath` (existing).
- Produces:
  - `espnUrls.scoreboard(p: EspnPath, dates: string): string` — `.../{sport}/{league}/scoreboard?dates={dates}` on the site/v2 `BASE`.
  - `EspnScheduleResponse.season?: { year: number }`.

- [ ] **Step 1: Write the failing test**

Add inside the existing `describe("espnUrls", …)` block in `src/leagues/espn/client.test.ts`:

```ts
  it("builds the scoreboard url with a dates range", () => {
    expect(espnUrls.scoreboard({ sport: "soccer", league: "eng.1" }, "20260801-20260831")).toBe(
      "https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates=20260801-20260831",
    );
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/leagues/espn/client.test.ts`
Expected: FAIL — `espnUrls.scoreboard is not a function`.

- [ ] **Step 3: Write minimal implementation**

In `src/leagues/espn/client.ts`, add `scoreboard` to the `espnUrls` object (after `teams`):

```ts
  scoreboard: (p: EspnPath, dates: string) =>
    `${BASE}/${p.sport}/${p.league}/scoreboard?dates=${dates}`,
```

And add the `season` field to `EspnScheduleResponse`:

```ts
export interface EspnScheduleResponse {
  events: EspnEvent[];
  season?: { year: number };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/leagues/espn/client.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/leagues/espn/client.ts src/leagues/espn/client.test.ts
git commit -m "feat: add ESPN scoreboard url builder and schedule season field"
```

---

## Task 3: Scoreboard fallback in the adapter

**Files:**
- Modify: `src/leagues/espn/adapter.ts`
- Test: `src/leagues/espn/adapter.test.ts`

**Interfaces:**
- Consumes: `seasonWindow`, `monthlyChunks`, `currentSoccerSeasonYear` (Task 1); `espnUrls.scoreboard`, `EspnScheduleResponse.season` (Task 2); existing `mapGame`, `EspnEvent`, `EspnPath`.
- Produces: no new exports — `fetchSchedule` behavior change only.

- [ ] **Step 1: Write the failing tests**

Add these two tests inside the existing `describe("createEspnAdapter", …)` block in `src/leagues/espn/adapter.test.ts` (the `scheduleEvent` helper and `mockFetchByUrl` already exist in this file):

```ts
  it("backfills the primary competition from the scoreboard when its schedule is empty", async () => {
    const eplConfig: LeagueConfig = {
      id: "epl",
      sport: "soccer",
      league: "eng.1",
      displayName: "Premier League",
      icon: "⚽",
      hasPlayoffs: false,
      competitions: [
        { slug: "eng.1", shortName: "PL", name: "Premier League", primary: true },
      ],
    };
    mockFetchByUrl([
      // Empty team-schedule but season year present → triggers fallback.
      { match: "eng.1/teams/359/schedule", payload: { season: { year: 2026 }, events: [] } },
      // Every monthly scoreboard chunk returns the same two events (matched by
      // "scoreboard"): one involving team 359, one that does not.
      {
        match: "scoreboard",
        payload: {
          events: [
            scheduleEvent("sb-mine", "2026-08-22T14:00Z", "359"),
            scheduleEvent("sb-other", "2026-08-22T14:00Z", "888"),
          ],
        },
      },
    ]);
    const adapter = createEspnAdapter(eplConfig);
    const games = await adapter.fetchSchedule("359");

    // Deduped across chunks (not 11×) and filtered to the followed team.
    expect(games.map((g) => g.id)).toEqual(["sb-mine"]);
    expect(games[0].competition?.shortName).toBe("PL");
    expect(games[0].competition?.primary).toBe(true);
  });

  it("does not hit the scoreboard when the primary schedule has events", async () => {
    const eplConfig: LeagueConfig = {
      id: "epl",
      sport: "soccer",
      league: "eng.1",
      displayName: "Premier League",
      icon: "⚽",
      hasPlayoffs: false,
      competitions: [
        { slug: "eng.1", shortName: "PL", name: "Premier League", primary: true },
      ],
    };
    mockFetchByUrl([
      { match: "schedule", payload: { events: [scheduleEvent("pl1", "2026-03-10T15:00Z", "359")] } },
    ]);
    const adapter = createEspnAdapter(eplConfig);
    const games = await adapter.fetchSchedule("359");

    expect(games.map((g) => g.id)).toEqual(["pl1"]);
    expect(fetch).not.toHaveBeenCalledWith(expect.stringContaining("scoreboard"));
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/leagues/espn/adapter.test.ts`
Expected: FAIL — the empty-schedule case returns `[]` (no fallback yet), so `["sb-mine"]` assertion fails.

- [ ] **Step 3: Write the implementation**

In `src/leagues/espn/adapter.ts`, update the imports:

```ts
import type { Competition, Game, LeagueConfig } from "../../domain/types";
import type { LeagueAdapter } from "../types";
import {
  espnUrls,
  fetchJson,
  type EspnEvent,
  type EspnPath,
  type EspnScheduleResponse,
  type EspnStandingsResponse,
  type EspnTeamResponse,
} from "./client";
import { mapGame, mapStanding, mapStandings, mapTeam } from "./mappers";
import { TEAMS_BY_LEAGUE } from "../teamsData";
import {
  currentSoccerSeasonYear,
  monthlyChunks,
  seasonWindow,
} from "./seasonWindow";
```

Add these module-level helpers below the imports (above `createEspnAdapter`):

```ts
function eventHasTeam(event: EspnEvent, teamId: string): boolean {
  return (
    event.competitions[0]?.competitors.some((c) => c.team.id === teamId) ?? false
  );
}

// Season-start gap: ESPN's team-schedule endpoint returns no events for a
// not-yet-underway soccer season even though fixtures exist. Backfill from the
// league scoreboard across the season window (monthly chunks; the endpoint caps
// at 100 events/response), keep only the followed team's fixtures, and tag them
// with the primary competition. Self-heals once ESPN populates the schedule.
async function fetchScoreboardGames(
  path: EspnPath,
  teamId: string,
  competition: Competition,
  seasonYear: number | undefined,
): Promise<Game[]> {
  const year = seasonYear ?? currentSoccerSeasonYear(new Date());
  const { start, end } = seasonWindow(year);
  const chunks = monthlyChunks(start, end);
  const perChunk = await Promise.all(
    chunks.map(async (c) => {
      try {
        const res = await fetchJson<EspnScheduleResponse>(
          espnUrls.scoreboard(path, `${c.start}-${c.end}`),
        );
        return res.events ?? [];
      } catch {
        return [];
      }
    }),
  );
  const byId = new Map<string, EspnEvent>();
  for (const e of perChunk.flat()) {
    if (!byId.has(e.id) && eventHasTeam(e, teamId)) byId.set(e.id, e);
  }
  return [...byId.values()]
    .map((e) => mapGame(e, teamId, competition))
    .filter((g): g is Game => g !== undefined);
}
```

Replace the multi-competition branch of `fetchSchedule` (the `config.competitions.map(...)` block) with:

```ts
      const perCompetition = await Promise.all(
        config.competitions.map(async (competition) => {
          try {
            const res = await fetchJson<EspnScheduleResponse>(
              espnUrls.schedule(
                { sport: config.sport, league: competition.slug },
                teamId,
              ),
            );
            const events = res.events ?? [];
            if (events.length === 0 && competition.primary) {
              return await fetchScoreboardGames(
                { sport: config.sport, league: competition.slug },
                teamId,
                competition,
                res.season?.year,
              );
            }
            return events
              .map((e) => mapGame(e, teamId, competition))
              .filter((g): g is Game => g !== undefined);
          } catch {
            return [];
          }
        }),
      );
      return perCompetition
        .flat()
        .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/leagues/espn/adapter.test.ts`
Expected: PASS (both new tests plus the pre-existing ones).

- [ ] **Step 5: Commit**

```bash
git add src/leagues/espn/adapter.ts src/leagues/espn/adapter.test.ts
git commit -m "fix: backfill primary soccer fixtures from scoreboard at season start"
```

---

## Task 4: SeasonGamesModal component

**Files:**
- Create: `src/components/SeasonGamesModal.tsx`
- Test: `src/components/SeasonGamesModal.test.tsx`

**Interfaces:**
- Consumes: `GameList` (existing), `Game`, `Team`.
- Produces:
  - `SeasonGamesModal(props: { team: Team; pastGames: Game[]; upcomingGames: Game[]; onClose: () => void }): JSX.Element`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/SeasonGamesModal.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SeasonGamesModal } from "./SeasonGamesModal";
import type { Game, Team } from "../domain/types";

const team: Team = { id: "384", leagueId: "epl", name: "Crystal Palace", abbreviation: "CRY" };

const upcoming: Game[] = [
  {
    id: "u1",
    date: "2026-08-22T14:00Z",
    status: "scheduled",
    seasonType: "regular",
    isHome: false,
    homeTeam: { id: "368", abbreviation: "EVE" },
    awayTeam: { id: "384", abbreviation: "CRY" },
    competition: { shortName: "PL", name: "Premier League", primary: true },
  },
];

const past: Game[] = [
  {
    id: "p1",
    date: "2026-05-24T15:00Z",
    status: "final",
    seasonType: "regular",
    isHome: true,
    result: "W",
    homeTeam: { id: "384", abbreviation: "CRY", score: 2 },
    awayTeam: { id: "999", abbreviation: "LIV", score: 1 },
    competition: { shortName: "PL", name: "Premier League", primary: true },
  },
];

describe("SeasonGamesModal", () => {
  it("renders all upcoming and past games with per-game links", () => {
    render(
      <SeasonGamesModal team={team} pastGames={past} upcomingGames={upcoming} onClose={() => {}} />,
    );
    expect(screen.getByText("Upcoming")).toBeInTheDocument();
    expect(screen.getByText("Past")).toBeInTheDocument();
    expect(screen.getByText(/EVE/)).toBeInTheDocument();
    expect(screen.getByText(/LIV/)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /highlights on YouTube/i }).length).toBe(2);
  });

  it("closes on Escape, backdrop click, and the close button but not on inner click", async () => {
    const onClose = vi.fn();
    render(
      <SeasonGamesModal team={team} pastGames={past} upcomingGames={upcoming} onClose={onClose} />,
    );
    const user = userEvent.setup();

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("dialog"));
    expect(onClose).toHaveBeenCalledTimes(1); // inner click ignored

    await user.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/SeasonGamesModal.test.tsx`
Expected: FAIL — cannot resolve `./SeasonGamesModal`.

- [ ] **Step 3: Write the implementation**

```tsx
// src/components/SeasonGamesModal.tsx
import { useEffect } from "react";
import type { Game, Team } from "../domain/types";
import { GameList } from "./GameList";

interface SeasonGamesModalProps {
  team: Team;
  pastGames: Game[];
  upcomingGames: Game[];
  onClose: () => void;
}

export function SeasonGamesModal({
  team,
  pastGames,
  upcomingGames,
  onClose,
}: SeasonGamesModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const titleId = "season-games-title";
  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div
        className="dialog season-games-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="season-games-header">
          <h3 id={titleId} className="season-games-heading">
            {team.name} — all games
          </h3>
          <button className="dialog-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="season-games-body">
          <GameList title="Upcoming" showTime games={upcomingGames} team={team} />
          <GameList title="Past" games={pastGames} team={team} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/SeasonGamesModal.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/SeasonGamesModal.tsx src/components/SeasonGamesModal.test.tsx
git commit -m "feat: add SeasonGamesModal listing all games this season"
```

---

## Task 5: Wire "View all" into TeamPanel + styles

**Files:**
- Modify: `src/components/TeamPanel.tsx`
- Modify: `src/index.css`
- Test: `src/components/TeamPanel.test.tsx`

**Interfaces:**
- Consumes: `SeasonGamesModal` (Task 4).
- Produces: no new exports — `TeamPanel` renders a "View all" button that opens the modal.

- [ ] **Step 1: Write the failing test**

Append this test inside the existing `describe("TeamPanel", …)` block in `src/components/TeamPanel.test.tsx`. It reuses the file's existing `mockStatus` helper and `sample` `TeamStatus` fixture (already defined at the top of the file):

```tsx
  it("opens the all-games modal when View all is clicked", async () => {
    mockStatus({ isLoading: false, isError: false, isSuccess: true, data: sample });
    render(<TeamPanel team={team} onRemove={() => {}} />);
    const user = userEvent.setup();

    expect(screen.queryByRole("dialog")).toBeNull();
    await user.click(screen.getByRole("button", { name: /view all/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/TeamPanel.test.tsx`
Expected: FAIL — `getByRole("button", { name: /view all/i })` finds no such button yet.

- [ ] **Step 3: Write the implementation**

In `src/components/TeamPanel.tsx`:

Add the import (with the other component imports):

```ts
import { SeasonGamesModal } from "./SeasonGamesModal";
```

Add modal state next to the existing `homeOnly` state:

```ts
  const [showAll, setShowAll] = useState(false);
```

Give the "Past" `GameList` an `action` button (replace the current `<GameList title="Past" … />`):

```tsx
            <GameList
              title="Past"
              team={query.data.team}
              games={selectGames(query.data.pastGames, {
                homeOnly,
                limit: PAST_GAMES,
              })}
              action={
                <button className="view-all" onClick={() => setShowAll(true)}>
                  View all
                </button>
              }
            />
```

Render the modal at the end of the `query.isSuccess && query.data && (...)` fragment, just before its closing `</>`:

```tsx
          {showAll && (
            <SeasonGamesModal
              team={query.data.team}
              pastGames={query.data.pastGames}
              upcomingGames={query.data.upcomingGames}
              onClose={() => setShowAll(false)}
            />
          )}
```

In `src/index.css`, add after the existing `.dialog` rules (around line 188):

```css
.season-games-dialog { width: 560px; }
.season-games-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.season-games-heading { margin: 0; font-size: 16px; }
.season-games-body { max-height: 70vh; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }
.dialog-close { background: none; border: none; color: var(--muted); font-size: 22px; line-height: 1; cursor: pointer; padding: 0 4px; }
.dialog-close:hover { color: var(--text); }
.view-all { background: none; border: none; color: var(--accent); font-size: 12px; cursor: pointer; padding: 0; }
.view-all:hover { text-decoration: underline; }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/TeamPanel.test.tsx`
Expected: PASS.

- [ ] **Step 5: Run the full suite and typecheck**

Run: `npx vitest run`
Expected: PASS — whole suite green.

Run: `npm run build`
Expected: `tsc -b` succeeds with no type errors, Vite build completes.

- [ ] **Step 6: Commit**

```bash
git add src/components/TeamPanel.tsx src/components/TeamPanel.test.tsx src/index.css
git commit -m "feat: add View all button opening the season games modal"
```

---

## Self-Review

**Spec coverage:**
- Root cause / scoreboard fallback → Tasks 1–3. ✓
- Primary-competition-only scoping + documented limitation → Task 3 comment + Global Constraints. ✓
- Season-window derivation & monthly chunking → Task 1. ✓
- Dedupe + team-filtering of scoreboard events → Task 3 (`byId` map + `eventHasTeam`). ✓
- "View all" button in Past action slot → Task 5. ✓
- Modal reuses GameList (Upcoming asc / Past desc) with `team` for links & badges → Task 4. ✓
- No new fetch; renders full arrays from TeamPanel → Task 5 wiring. ✓
- AddTeamDialog conventions (backdrop, Escape, aria-modal) → Task 4. ✓
- YAGNI guards (no home-only in modal, no per-game expansion) → honored (not built). ✓
- Testing for both parts → Tasks 1–5. ✓

**Placeholder scan:** none — all steps contain concrete code/commands. The Task 5 conditional (reuse-helper-or-skip) is an explicit branch, not a placeholder.

**Type consistency:** `seasonWindow`/`monthlyChunks`/`currentSoccerSeasonYear` signatures match between Task 1 and their use in Task 3; `espnUrls.scoreboard(path, dates)` and `EspnScheduleResponse.season` match between Task 2 and Task 3; `SeasonGamesModalProps` matches between Task 4 and the Task 5 call site; `mapGame(event, teamId, competition)` used as its existing signature.
