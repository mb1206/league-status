# Calendar View + `.ics` Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a calendar view to the Season Games modal (unified past + upcoming games) and let the user export games to their own calendar as `.ics` files.

**Architecture:** A pure `.ics` builder module (`src/leagues/ics.ts`) generates spec-valid calendar text; a single DOM helper triggers the download. `LinkIcons` gains an action ("button") chip kind so the "+" export sits alongside the existing YouTube/Reddit link chips. A shared `gameLinks` helper produces those chips for `GameList`, the calendar day-detail, and the agenda. A new `SeasonCalendar` component renders a month grid (wide) plus an agenda list (narrow) and reuses `GameList` for its link rows. The modal gets a list/calendar view toggle.

**Tech Stack:** React 19, TypeScript, Vite, Vitest + Testing Library, plain CSS in `src/index.css`. No new dependencies.

## Global Constraints

- No new npm dependencies — build `.ics` text by hand.
- TypeScript strict; all new code fully typed. No `any`.
- Dark theme only; style with the existing CSS variables (`--bg`, `--panel`, `--line`, `--text`, `--muted`, `--accent`, `--win`, `--loss`). All CSS goes in `src/index.css`.
- Follow existing patterns: functional components, named exports, tests colocated as `*.test.ts(x)`.
- Times in `.ics` are emitted in UTC (`...Z`).
- Past games (`status === "final"`) never get a "+" export chip.
- Run a single test file with: `npx vitest run <path>`. Run the whole suite with: `npm run test:run`. Lint with: `npx oxlint`.
- Default the modal to **list** view every time it opens (preserves current behavior).

---

## File Structure

- **Create** `src/leagues/ics.ts` — pure `.ics` builders + `downloadIcs` DOM helper.
- **Create** `src/leagues/ics.test.ts` — builder unit tests.
- **Create** `src/components/gameLinks.ts` — shared link-chip builder (YouTube + Reddit + optional "+").
- **Create** `src/components/gameLinks.test.ts` — helper unit tests.
- **Create** `src/components/SeasonCalendar.tsx` — month grid + agenda view.
- **Create** `src/components/SeasonCalendar.test.tsx` — calendar tests.
- **Modify** `src/components/LinkIcons.tsx` — add `"ics"` kind + button rendering.
- **Modify** `src/components/LinkIcons.test.tsx` — button chip tests.
- **Modify** `src/components/GameList.tsx` — use shared `gameLinks`, add optional `league` prop.
- **Modify** `src/components/SeasonGamesModal.tsx` — view toggle, `league` prop, render calendar, bulk export.
- **Modify** `src/components/SeasonGamesModal.test.tsx` — toggle/calendar tests.
- **Modify** `src/components/TeamPanel.tsx` — pass `league` into the modal.
- **Modify** `src/index.css` — calendar + toggle + button-chip styles.

---

## Task 1: `.ics` builders

**Files:**
- Create: `src/leagues/ics.ts`
- Test: `src/leagues/ics.test.ts`

**Interfaces:**
- Consumes: `Game`, `Team`, `LeagueConfig` from `../domain/types`; `youtubeGamePreviewUrl`, `redditGameUrl`, `espnTeamUrl` from `./externalLinks`.
- Produces:
  - `durationHours(sport: string): number`
  - `buildEvent(team: Team, league: LeagueConfig, game: Game, now?: Date): string`
  - `buildCalendar(team: Team, league: LeagueConfig, games: Game[], now?: Date): string`
  - `icsFilename(team: Team, game: Game): string`
  - `icsBulkFilename(team: Team): string`
  - `downloadIcs(filename: string, ics: string): void`

- [ ] **Step 1: Write the failing test**

Create `src/leagues/ics.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildCalendar, buildEvent, durationHours, icsBulkFilename, icsFilename } from "./ics";
import type { Game, LeagueConfig, Team } from "../domain/types";

const nba: LeagueConfig = {
  id: "nba", sport: "basketball", league: "nba", displayName: "NBA", icon: "🏀", hasPlayoffs: true,
};
const epl: LeagueConfig = {
  id: "epl", sport: "soccer", league: "eng.1", displayName: "Premier League", icon: "⚽", hasPlayoffs: false,
};
const team: Team = { id: "13", leagueId: "nba", name: "Los Angeles Lakers", abbreviation: "LAL" };

const homeGame: Game = {
  id: "g1", date: "2026-10-21T02:30:00Z", status: "scheduled", seasonType: "regular",
  isHome: true, homeTeam: { id: "13", abbreviation: "LAL" }, awayTeam: { id: "2", abbreviation: "BOS" },
};
const awayGame: Game = {
  id: "g2", date: "2026-10-24T00:00:00Z", status: "scheduled", seasonType: "regular",
  isHome: false, homeTeam: { id: "2", abbreviation: "BOS" }, awayTeam: { id: "13", abbreviation: "LAL" },
};
const NOW = new Date("2026-09-01T00:00:00Z");

describe("durationHours", () => {
  it("returns the per-sport duration and a 2h fallback", () => {
    expect(durationHours("basketball")).toBe(2.5);
    expect(durationHours("football")).toBe(3.5);
    expect(durationHours("soccer")).toBe(2);
    expect(durationHours("curling")).toBe(2);
  });
});

describe("buildEvent", () => {
  it("emits UTC start/end with the sport duration and a home vs summary", () => {
    const ev = buildEvent(team, nba, homeGame, NOW);
    expect(ev).toContain("BEGIN:VEVENT");
    expect(ev).toContain("END:VEVENT");
    expect(ev).toContain("UID:g1@league-status");
    expect(ev).toContain("DTSTART:20261021T023000Z");
    expect(ev).toContain("DTEND:20261021T050000Z"); // +2.5h
    expect(ev).toContain("SUMMARY:🏀 Los Angeles Lakers vs BOS");
  });

  it("uses '@' for away games", () => {
    expect(buildEvent(team, nba, awayGame, NOW)).toContain("SUMMARY:🏀 Los Angeles Lakers @ BOS");
  });

  it("badges a non-primary competition in the summary", () => {
    const ucl: Game = { ...homeGame, competition: { shortName: "UCL", name: "UEFA Champions League", primary: false } };
    expect(buildEvent(team, epl, ucl, NOW)).toContain("SUMMARY:⚽ Los Angeles Lakers vs BOS (UCL)");
  });

  it("puts the preview, discussion and ESPN links in the description", () => {
    const ev = buildEvent(team, nba, homeGame, NOW);
    const desc = ev.split(/\r\n/).join("").match(/DESCRIPTION:(.*?)END:VEVENT/)?.[1] ?? "";
    expect(desc).toContain("youtube.com");
    expect(desc).toContain("reddit.com");
    expect(desc).toContain("espn.com");
  });
});

describe("buildCalendar", () => {
  it("wraps events in a VCALENDAR and includes each game", () => {
    const cal = buildCalendar(team, nba, [homeGame, awayGame], NOW);
    expect(cal.startsWith("BEGIN:VCALENDAR")).toBe(true);
    expect(cal.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    expect(cal).toContain("UID:g1@league-status");
    expect(cal).toContain("UID:g2@league-status");
    expect(cal).toContain("\r\n"); // CRLF line endings
  });
});

describe("filenames", () => {
  it("slugs the team, opponent and date for a single game", () => {
    expect(icsFilename(team, homeGame)).toBe("los-angeles-lakers-vs-bos-2026-10-21.ics");
    expect(icsFilename(team, awayGame)).toBe("los-angeles-lakers-at-bos-2026-10-24.ics");
  });
  it("names the bulk file after the team", () => {
    expect(icsBulkFilename(team)).toBe("los-angeles-lakers-upcoming.ics");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/leagues/ics.test.ts`
Expected: FAIL — cannot resolve `./ics` / functions not defined.

- [ ] **Step 3: Write minimal implementation**

Create `src/leagues/ics.ts`:

```ts
import type { Game, LeagueConfig, Team } from "../domain/types";
import { espnTeamUrl, redditGameUrl, youtubeGamePreviewUrl } from "./externalLinks";

const DURATION_HOURS: Record<string, number> = {
  basketball: 2.5,
  football: 3.5,
  soccer: 2,
  baseball: 3,
  hockey: 2.5,
};
const DEFAULT_DURATION_HOURS = 2;

export function durationHours(sport: string): number {
  return DURATION_HOURS[sport] ?? DEFAULT_DURATION_HOURS;
}

// ISO instant -> "YYYYMMDDTHHMMSSZ" (UTC basic format).
function formatUtc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

// RFC 5545 text escaping for property values.
function escapeText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

// Fold long content lines: continuations start with a single space.
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let rest = line;
  chunks.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 0) {
    chunks.push(" " + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  return chunks.join("\r\n");
}

function opponentAbbr(game: Game): string {
  return game.isHome ? game.awayTeam.abbreviation : game.homeTeam.abbreviation;
}

function summary(team: Team, league: LeagueConfig, game: Game): string {
  const vs = game.isHome ? "vs" : "@";
  const badge =
    game.competition && !game.competition.primary ? ` (${game.competition.shortName})` : "";
  return `${league.icon} ${team.name} ${vs} ${opponentAbbr(game)}${badge}`;
}

function description(team: Team, league: LeagueConfig, game: Game): string {
  return [
    `Preview: ${youtubeGamePreviewUrl(team, game)}`,
    `Discussion: ${redditGameUrl(team, game)}`,
    `ESPN: ${espnTeamUrl(team, league)}`,
  ].join("\n");
}

export function buildEvent(team: Team, league: LeagueConfig, game: Game, now: Date = new Date()): string {
  const start = new Date(game.date);
  const end = new Date(start.getTime() + durationHours(league.sport) * 3_600_000);
  return [
    "BEGIN:VEVENT",
    `UID:${game.id}@league-status`,
    `DTSTAMP:${formatUtc(now)}`,
    `DTSTART:${formatUtc(start)}`,
    `DTEND:${formatUtc(end)}`,
    `SUMMARY:${escapeText(summary(team, league, game))}`,
    `DESCRIPTION:${escapeText(description(team, league, game))}`,
    "END:VEVENT",
  ]
    .map(foldLine)
    .join("\r\n");
}

export function buildCalendar(team: Team, league: LeagueConfig, games: Game[], now: Date = new Date()): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//league-status//EN",
    "CALSCALE:GREGORIAN",
    ...games.map((g) => buildEvent(team, league, g, now)),
    "END:VCALENDAR",
  ].join("\r\n");
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function icsFilename(team: Team, game: Game): string {
  const date = new Date(game.date).toISOString().slice(0, 10);
  const vs = game.isHome ? "vs" : "at";
  return `${slug(team.name)}-${vs}-${slug(opponentAbbr(game))}-${date}.ics`;
}

export function icsBulkFilename(team: Team): string {
  return `${slug(team.name)}-upcoming.ics`;
}

export function downloadIcs(filename: string, ics: string): void {
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/leagues/ics.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/leagues/ics.ts src/leagues/ics.test.ts
git commit -m "feat: add .ics event/calendar builders"
```

---

## Task 2: `LinkIcons` action (button) chips

**Files:**
- Modify: `src/components/LinkIcons.tsx`
- Test: `src/components/LinkIcons.test.tsx`

**Interfaces:**
- Produces: extended `LinkChip` — `kind` now includes `"ics"`; `href` optional; new optional `onClick?: () => void`. A chip with `onClick` renders as a `<button>`; otherwise as an `<a>`.

- [ ] **Step 1: Write the failing test**

Add to `src/components/LinkIcons.test.tsx` (inside the existing `describe`):

```ts
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

it("renders an action chip as a button that fires onClick", async () => {
  const onClick = vi.fn();
  render(<LinkIcons links={[{ kind: "ics", label: "Add to calendar", onClick }]} />);
  const btn = screen.getByRole("button", { name: "Add to calendar" });
  expect(btn).toHaveTextContent("➕");
  expect(screen.queryByRole("link")).toBeNull();
  await userEvent.click(btn);
  expect(onClick).toHaveBeenCalledTimes(1);
});
```

Ensure the top of the file imports `userEvent` and `vi` (add `import userEvent from "@testing-library/user-event";` and `import { describe, expect, it, vi } from "vitest";` — merge with the existing `vitest` import).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/LinkIcons.test.tsx`
Expected: FAIL — `"ics"` not assignable to `kind`; no button rendered.

- [ ] **Step 3: Write minimal implementation**

Replace `src/components/LinkIcons.tsx` with:

```tsx
export interface LinkChip {
  kind: "youtube" | "reddit" | "espn" | "ics";
  label: string; // aria-label + title
  href?: string; // for link chips
  onClick?: () => void; // for action chips (rendered as a button)
}

export interface LinkIconsProps {
  links: LinkChip[];
  className?: string;
}

const EMOJI: Record<LinkChip["kind"], string> = {
  youtube: "🎬",
  espn: "📊",
  reddit: "💬",
  ics: "➕",
};

export function LinkIcons({ links, className }: LinkIconsProps) {
  if (links.length === 0) return null;
  return (
    <span className={className ? `link-icons ${className}` : "link-icons"}>
      {links.map((link) =>
        link.onClick ? (
          <button
            key={`${link.kind}:${link.label}`}
            type="button"
            className="link-chip"
            onClick={link.onClick}
            aria-label={link.label}
            title={link.label}
          >
            <span aria-hidden="true">{EMOJI[link.kind]}</span>
          </button>
        ) : (
          <a
            key={`${link.kind}:${link.href}`}
            className="link-chip"
            href={link.href}
            target="_blank"
            rel="noreferrer"
            aria-label={link.label}
            title={link.label}
          >
            <span aria-hidden="true">{EMOJI[link.kind]}</span>
          </a>
        ),
      )}
    </span>
  );
}
```

- [ ] **Step 4: Add button-chip CSS**

In `src/index.css`, immediately after the `.link-chip` rules (around line 186), add:

```css
button.link-chip { background: none; border: none; padding: 0; cursor: pointer; color: inherit; font: inherit; }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/components/LinkIcons.test.tsx`
Expected: PASS (existing link tests + new button test).

- [ ] **Step 6: Commit**

```bash
git add src/components/LinkIcons.tsx src/components/LinkIcons.test.tsx src/index.css
git commit -m "feat: support action (button) chips in LinkIcons"
```

---

## Task 3: Shared `gameLinks` helper + `GameList` league prop

**Files:**
- Create: `src/components/gameLinks.ts`
- Test: `src/components/gameLinks.test.ts`
- Modify: `src/components/GameList.tsx`

**Interfaces:**
- Consumes: `buildCalendar`, `downloadIcs`, `icsFilename` (Task 1); `LinkChip` with `onClick` (Task 2); `youtubeGameHighlightsUrl`, `youtubeGamePreviewUrl`, `redditGameUrl` from `../leagues/externalLinks`.
- Produces: `gameLinks(team: Team, game: Game, league?: LeagueConfig): LinkChip[]`. Always returns YouTube + Reddit chips; appends an `"ics"` "+" chip only when `league` is provided **and** the game is not final. `GameList` gains an optional `league?: LeagueConfig` prop that it forwards to `gameLinks`.

- [ ] **Step 1: Write the failing test**

Create `src/components/gameLinks.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { gameLinks } from "./gameLinks";
import type { Game, LeagueConfig, Team } from "../domain/types";

const nba: LeagueConfig = {
  id: "nba", sport: "basketball", league: "nba", displayName: "NBA", icon: "🏀", hasPlayoffs: true,
};
const team: Team = { id: "13", leagueId: "nba", name: "Los Angeles Lakers", abbreviation: "LAL" };
const base = {
  seasonType: "regular" as const, isHome: true,
  homeTeam: { id: "13", abbreviation: "LAL" }, awayTeam: { id: "2", abbreviation: "BOS" },
};
const upcoming: Game = { ...base, id: "u", date: "2026-10-21T02:30:00Z", status: "scheduled" };
const final: Game = { ...base, id: "f", date: "2026-04-01T02:30:00Z", status: "final", result: "W" };

describe("gameLinks", () => {
  it("returns youtube + reddit and no '+' without a league", () => {
    const kinds = gameLinks(team, upcoming).map((c) => c.kind);
    expect(kinds).toEqual(["youtube", "reddit"]);
  });

  it("adds an '+' ics chip for an upcoming game when a league is given", () => {
    const chips = gameLinks(team, upcoming, nba);
    expect(chips.map((c) => c.kind)).toEqual(["youtube", "reddit", "ics"]);
    const ics = chips.find((c) => c.kind === "ics")!;
    expect(ics.onClick).toBeTypeOf("function");
    expect(ics.label).toContain("calendar");
  });

  it("never adds a '+' for a final game, even with a league", () => {
    expect(gameLinks(team, final, nba).map((c) => c.kind)).toEqual(["youtube", "reddit"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/gameLinks.test.ts`
Expected: FAIL — cannot resolve `./gameLinks`.

- [ ] **Step 3: Create the helper**

Create `src/components/gameLinks.ts`:

```ts
import type { Game, LeagueConfig, Team } from "../domain/types";
import type { LinkChip } from "./LinkIcons";
import { buildCalendar, downloadIcs, icsFilename } from "../leagues/ics";
import {
  redditGameUrl,
  youtubeGameHighlightsUrl,
  youtubeGamePreviewUrl,
} from "../leagues/externalLinks";

export function gameLinks(team: Team, game: Game, league?: LeagueConfig): LinkChip[] {
  const oppAbbr = game.isHome ? game.awayTeam.abbreviation : game.homeTeam.abbreviation;
  // A played game links to highlights; one not yet played links to a preview.
  const played = game.status === "final";
  const chips: LinkChip[] = [
    {
      kind: "youtube",
      href: played ? youtubeGameHighlightsUrl(team, game) : youtubeGamePreviewUrl(team, game),
      label: `${team.name} vs ${oppAbbr} ${played ? "highlights" : "preview"} on YouTube`,
    },
    {
      kind: "reddit",
      href: redditGameUrl(team, game),
      label: `${team.name} vs ${oppAbbr} on Reddit`,
    },
  ];
  if (league && !played) {
    chips.push({
      kind: "ics",
      label: `Add ${team.name} vs ${oppAbbr} to calendar`,
      onClick: () => downloadIcs(icsFilename(team, game), buildCalendar(team, league, [game])),
    });
  }
  return chips;
}
```

- [ ] **Step 4: Refactor `GameList` to use the helper + accept `league`**

In `src/components/GameList.tsx`:

1. Replace the top imports block (lines 1-9) with:

```tsx
import type { ReactNode } from "react";
import type { Game, LeagueConfig, Team } from "../domain/types";
import { LinkIcons } from "./LinkIcons";
import { gameLinks } from "./gameLinks";
```

2. Delete the local `gameLinks` function (old lines 25-41) and its now-unused `LinkChip` import.

3. Add `league` to `GameListProps`:

```tsx
interface GameListProps {
  title?: string;
  games: Game[];
  showTime?: boolean;
  twoColumn?: boolean;
  action?: ReactNode;
  team?: Team;
  league?: LeagueConfig;
}
```

4. Destructure `league` in the component signature (add `league,` next to `team,`).

5. Change the link render (old line 94) to forward the league:

```tsx
{team && <LinkIcons className="game-links" links={gameLinks(team, g, league)} />}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/components/gameLinks.test.ts src/components/GameList.test.tsx`
Expected: PASS (helper tests + unchanged GameList tests).

- [ ] **Step 6: Commit**

```bash
git add src/components/gameLinks.ts src/components/gameLinks.test.ts src/components/GameList.tsx
git commit -m "refactor: extract shared gameLinks helper with .ics export chip"
```

---

## Task 4: `SeasonCalendar` component

**Files:**
- Create: `src/components/SeasonCalendar.tsx`
- Test: `src/components/SeasonCalendar.test.tsx`
- Modify: `src/index.css`

**Interfaces:**
- Consumes: `GameList` with `league` (Task 3); `buildCalendar`, `downloadIcs`, `icsBulkFilename` (Task 1); `Game`, `Team`, `LeagueConfig`.
- Produces: `SeasonCalendar({ team, league, pastGames, upcomingGames, now? }: SeasonCalendarProps)`. `now` (default `new Date()`) fixes the "open on the nearest upcoming month" and "today" logic so it is testable. Renders a month grid (`.season-calendar-grid`), a selected-day detail (`.season-calendar-detail`, a `GameList`), an agenda list (`.season-calendar-agenda`, a `GameList`), month prev/next nav that skips months with no games, and an "Add all upcoming" bulk export button.

- [ ] **Step 1: Write the failing test**

Create `src/components/SeasonCalendar.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SeasonCalendar } from "./SeasonCalendar";
import type { Game, LeagueConfig, Team } from "../domain/types";

const nba: LeagueConfig = {
  id: "nba", sport: "basketball", league: "nba", displayName: "NBA", icon: "🏀", hasPlayoffs: true,
};
const team: Team = { id: "13", leagueId: "nba", name: "Los Angeles Lakers", abbreviation: "LAL" };
const base = { seasonType: "regular" as const, homeTeam: { id: "13", abbreviation: "LAL" } };

// Games sit in October (past) and December (upcoming); November is empty so the
// nav must skip it. `now` is fixed in October so the calendar opens there.
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
    <SeasonCalendar team={team} league={nba} pastGames={past} upcomingGames={upcoming} now={NOW} />,
  );
}

describe("SeasonCalendar", () => {
  it("opens on the nearest month with games and shows the weekday header", () => {
    renderCal();
    expect(screen.getByText(/October 2026/)).toBeInTheDocument();
    expect(screen.getByText("Sun")).toBeInTheDocument();
    // At the first month, previous is disabled.
    expect(screen.getByRole("button", { name: /previous month/i })).toBeDisabled();
  });

  it("skips the empty November when navigating to the next month with games", async () => {
    renderCal();
    await userEvent.click(screen.getByRole("button", { name: /next month/i }));
    expect(screen.getByText(/December 2026/)).toBeInTheDocument();
    // Last month with games -> next disabled.
    expect(screen.getByRole("button", { name: /next month/i })).toBeDisabled();
  });

  it("shows a '+' export on the upcoming month's agenda but not the past month's", async () => {
    renderCal();
    const octAgenda = screen.getByTestId("calendar-agenda");
    expect(within(octAgenda).queryByRole("button", { name: /add .* to calendar/i })).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: /next month/i }));
    const decAgenda = screen.getByTestId("calendar-agenda");
    expect(within(decAgenda).getByRole("button", { name: /add .* to calendar/i })).toBeInTheDocument();
  });

  it("bulk-exports all upcoming games", async () => {
    const createUrl = vi.fn(() => "blob:x");
    vi.stubGlobal("URL", { createObjectURL: createUrl, revokeObjectURL: vi.fn() });
    renderCal();
    await userEvent.click(screen.getByRole("button", { name: /add all upcoming/i }));
    expect(createUrl).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/SeasonCalendar.test.tsx`
Expected: FAIL — cannot resolve `./SeasonCalendar`.

- [ ] **Step 3: Implement the component**

Create `src/components/SeasonCalendar.tsx`:

```tsx
import { useMemo, useState } from "react";
import type { Game, LeagueConfig, Team } from "../domain/types";
import { GameList } from "./GameList";
import { buildCalendar, downloadIcs, icsBulkFilename } from "../leagues/ics";

interface SeasonCalendarProps {
  team: Team;
  league: LeagueConfig;
  pastGames: Game[];
  upcomingGames: Game[];
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

export function SeasonCalendar({
  team,
  league,
  pastGames,
  upcomingGames,
  now = new Date(),
}: SeasonCalendarProps) {
  const allGames = useMemo(
    () =>
      [...pastGames, ...upcomingGames].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      ),
    [pastGames, upcomingGames],
  );

  const months = useMemo(() => {
    const set = new Set(allGames.map((g) => ym(new Date(g.date))));
    return [...set].sort();
  }, [allGames]);

  const nowKey = ym(now);
  const initialIndex = useMemo(() => {
    if (months.length === 0) return 0;
    const idx = months.findIndex((k) => k >= nowKey);
    return idx === -1 ? months.length - 1 : idx;
  }, [months, nowKey]);

  const [index, setIndex] = useState(initialIndex);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  if (months.length === 0) {
    return <p className="game-list-empty">No games</p>;
  }

  const monthKey = months[index];
  const monthGames = allGames.filter((g) => ym(new Date(g.date)) === monthKey);
  const gamesByDay = new Map<string, Game[]>();
  for (const g of monthGames) {
    const k = dayKey(new Date(g.date));
    gamesByDay.set(k, [...(gamesByDay.get(k) ?? []), g]);
  }

  const [y, m] = monthKey.split("-").map(Number);
  const firstWeekday = new Date(y, m - 1, 1).getDay();
  const daysInMonth = new Date(y, m, 0).getDate();
  const todayKey = dayKey(now);

  const cells: (number | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const selectedGames = selectedDay ? (gamesByDay.get(selectedDay) ?? []) : [];
  const hasUpcoming = upcomingGames.length > 0;

  return (
    <div className="season-calendar">
      <div className="season-calendar-nav">
        <button
          className="season-calendar-navbtn"
          aria-label="Previous month"
          disabled={index === 0}
          onClick={() => {
            setSelectedDay(null);
            setIndex((i) => Math.max(0, i - 1));
          }}
        >
          ‹
        </button>
        <span className="season-calendar-month">{monthLabel(monthKey)}</span>
        <button
          className="season-calendar-navbtn"
          aria-label="Next month"
          disabled={index === months.length - 1}
          onClick={() => {
            setSelectedDay(null);
            setIndex((i) => Math.min(months.length - 1, i + 1));
          }}
        >
          ›
        </button>
        {hasUpcoming && (
          <button
            className="season-calendar-bulk"
            onClick={() =>
              downloadIcs(icsBulkFilename(team), buildCalendar(team, league, upcomingGames))
            }
          >
            ➕ Add all upcoming
          </button>
        )}
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
          const games = gamesByDay.get(key) ?? [];
          return (
            <div
              key={key}
              className={`season-calendar-day${key === todayKey ? " today" : ""}`}
            >
              <span className="season-calendar-daynum">{day}</span>
              {games.map((g) => {
                const opp = g.isHome ? g.awayTeam.abbreviation : g.homeTeam.abbreviation;
                const played = g.status === "final";
                return (
                  <button
                    key={g.id}
                    className={`season-calendar-chip${played ? " past" : ""}`}
                    aria-label={`${team.name} ${g.isHome ? "vs" : "@"} ${opp}, ${monthLabel(monthKey)} ${day}`}
                    onClick={() => setSelectedDay(key)}
                  >
                    {g.isHome ? "vs" : "@"} {opp}
                    {played && g.result ? ` ${g.result}` : ""}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {selectedGames.length > 0 && (
        <div className="season-calendar-detail">
          <GameList showTime games={selectedGames} team={team} league={league} />
        </div>
      )}

      <div className="season-calendar-agenda" data-testid="calendar-agenda">
        <GameList showTime games={monthGames} team={team} league={league} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add calendar CSS**

Append to `src/index.css`:

```css
.season-calendar-nav { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.season-calendar-navbtn { background: var(--panel); border: 1px solid var(--line); color: var(--text); border-radius: 8px; width: 30px; height: 30px; cursor: pointer; font-size: 16px; line-height: 1; }
.season-calendar-navbtn:disabled { opacity: 0.35; cursor: default; }
.season-calendar-month { font-weight: 700; font-size: 15px; }
.season-calendar-bulk { margin-left: auto; background: var(--panel); border: 1px solid var(--line); color: var(--text); border-radius: 8px; padding: 6px 10px; font-size: 12px; font-weight: 600; cursor: pointer; }
.season-calendar-bulk:hover { border-color: var(--accent); }
.season-calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.season-calendar-weekday { color: var(--muted); font-size: 11px; font-weight: 700; text-align: center; padding: 2px 0; }
.season-calendar-day { min-height: 62px; border: 1px solid var(--line); border-radius: 8px; padding: 4px; display: flex; flex-direction: column; gap: 3px; }
.season-calendar-day.empty { border: none; }
.season-calendar-day.today { border-color: var(--accent); }
.season-calendar-daynum { color: var(--muted); font-size: 11px; }
.season-calendar-chip { background: var(--line); border: none; color: var(--text); border-radius: 5px; padding: 2px 4px; font-size: 11px; font-weight: 600; cursor: pointer; text-align: left; }
.season-calendar-chip.past { opacity: 0.55; }
.season-calendar-chip:hover { background: var(--accent); color: white; }
.season-calendar-detail { margin-top: 12px; padding-top: 8px; border-top: 1px solid var(--line); }
.season-calendar-agenda { display: none; }
@media (max-width: 560px) {
  .season-calendar-grid, .season-calendar-detail { display: none; }
  .season-calendar-agenda { display: block; }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/components/SeasonCalendar.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/SeasonCalendar.tsx src/components/SeasonCalendar.test.tsx src/index.css
git commit -m "feat: add SeasonCalendar month grid + agenda view"
```

---

## Task 5: Modal view toggle, wiring, and bulk export

**Files:**
- Modify: `src/components/SeasonGamesModal.tsx`
- Modify: `src/components/SeasonGamesModal.test.tsx`
- Modify: `src/components/TeamPanel.tsx`
- Modify: `src/index.css`

**Interfaces:**
- Consumes: `SeasonCalendar` (Task 4); `GameList` with `league` (Task 3); `LeagueConfig`.
- Produces: `SeasonGamesModal` gains a required `league: LeagueConfig` prop and a list/calendar view toggle. `TeamPanel` passes `league={query.data.league}`.

- [ ] **Step 1: Write the failing test**

Update `src/components/SeasonGamesModal.test.tsx`:

1. Add a league import + constant near the top:

```ts
import { getLeagueModule } from "../leagues/registry";

const league = getLeagueModule("epl").config;
```

2. Add `league={league}` to every existing `render(<SeasonGamesModal ... />)` call (three of them).

3. Add a new test inside the `describe`:

```ts
it("toggles to the calendar view, hiding the Past/Upcoming tabs", async () => {
  render(
    <SeasonGamesModal team={team} league={league} pastGames={past} upcomingGames={upcoming} onClose={() => {}} />,
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: /calendar view/i }));

  expect(screen.queryByRole("tab", { name: "Past" })).toBeNull();
  expect(screen.getByRole("button", { name: /list view/i })).toBeInTheDocument();
  // A weekday header proves the calendar rendered.
  expect(screen.getByText("Sun")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/SeasonGamesModal.test.tsx`
Expected: FAIL — `league` prop missing on the type; no "calendar view" button.

- [ ] **Step 3: Update the modal**

In `src/components/SeasonGamesModal.tsx`:

1. Replace the imports/type region (lines 1-12) with:

```tsx
import { useEffect, useState } from "react";
import type { Game, LeagueConfig, Team } from "../domain/types";
import { GameList } from "./GameList";
import { SeasonCalendar } from "./SeasonCalendar";

type Tab = "past" | "upcoming";
type View = "list" | "calendar";

interface SeasonGamesModalProps {
  team: Team;
  league: LeagueConfig;
  pastGames: Game[];
  upcomingGames: Game[];
  onClose: () => void;
}
```

2. Update the component signature to destructure `league` and add view state (after the existing `tab` state, line 21):

```tsx
export function SeasonGamesModal({
  team,
  league,
  pastGames,
  upcomingGames,
  onClose,
}: SeasonGamesModalProps) {
  const [tab, setTab] = useState<Tab>("past");
  const [view, setView] = useState<View>("list");
```

3. Add the view toggle inside `.season-games-header`, right after the `<h3>` closes and **before** the close button (`.dialog-close`):

```tsx
          <div className="season-games-view-toggle" role="group" aria-label="View">
            <button
              type="button"
              aria-pressed={view === "list"}
              className={`season-games-view-btn${view === "list" ? " active" : ""}`}
              aria-label="List view"
              onClick={() => setView("list")}
            >
              ☰
            </button>
            <button
              type="button"
              aria-pressed={view === "calendar"}
              className={`season-games-view-btn${view === "calendar" ? " active" : ""}`}
              aria-label="Calendar view"
              onClick={() => setView("calendar")}
            >
              📅
            </button>
          </div>
```

4. Replace the tabs + body region (old lines 59-83) so tabs and the list body render only in list view, and the calendar renders otherwise:

```tsx
        {view === "list" ? (
          <>
            <div className="season-games-tabs" role="tablist" aria-label="Filter games">
              <button
                role="tab"
                aria-selected={tab === "past"}
                className={`season-games-tab${tab === "past" ? " active" : ""}`}
                onClick={() => setTab("past")}
              >
                Past
              </button>
              <button
                role="tab"
                aria-selected={tab === "upcoming"}
                className={`season-games-tab${tab === "upcoming" ? " active" : ""}`}
                onClick={() => setTab("upcoming")}
              >
                Upcoming
              </button>
            </div>
            <div className="season-games-body">
              {tab === "past" ? (
                <GameList games={pastGames} team={team} league={league} />
              ) : (
                <GameList showTime games={upcomingGames} team={team} league={league} />
              )}
            </div>
          </>
        ) : (
          <div className="season-games-body">
            <SeasonCalendar
              team={team}
              league={league}
              pastGames={pastGames}
              upcomingGames={upcomingGames}
            />
          </div>
        )}
```

5. Make the dialog wider in calendar view — change the dialog `className` (line 35) to:

```tsx
        className={`dialog season-games-dialog${view === "calendar" ? " calendar" : ""}`}
```

- [ ] **Step 4: Pass `league` from `TeamPanel`**

In `src/components/TeamPanel.tsx`, update the `<SeasonGamesModal>` render (around line 130) to add the prop:

```tsx
            <SeasonGamesModal
              team={query.data.team}
              league={query.data.league}
              pastGames={query.data.pastGames}
              upcomingGames={query.data.upcomingGames}
              onClose={() => setShowAll(false)}
            />
```

- [ ] **Step 5: Add toggle + wide-dialog CSS**

Append to `src/index.css`:

```css
.season-games-dialog.calendar { width: 640px; }
.season-games-view-toggle { display: inline-flex; gap: 2px; margin-left: auto; padding: 3px; background: var(--bg); border: 1px solid var(--line); border-radius: 999px; }
.season-games-view-btn { background: none; border: none; color: var(--muted); font-size: 14px; padding: 3px 9px; border-radius: 999px; cursor: pointer; line-height: 1; }
.season-games-view-btn.active { background: var(--line); color: var(--text); }
```

Note: `.season-games-header` already uses `justify-content: space-between`; the toggle's `margin-left: auto` keeps it grouped with the close button on the right.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/components/SeasonGamesModal.test.tsx`
Expected: PASS (updated existing tests + new toggle test).

- [ ] **Step 7: Full suite + lint + build**

Run: `npm run test:run && npx oxlint && npm run build`
Expected: all tests PASS, no lint errors, TypeScript build succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/components/SeasonGamesModal.tsx src/components/SeasonGamesModal.test.tsx src/components/TeamPanel.tsx src/index.css
git commit -m "feat: add calendar view toggle and bulk .ics export to season modal"
```

---

## Self-Review Notes

- **Spec coverage:** view toggle + glyphs (Task 5), unified past+upcoming calendar (Task 4), month grid + agenda via CSS breakpoint (Task 4), skip-empty-months nav (Task 4), preserved highlight/discussion links via shared helper (Task 3), per-game "+" on upcoming only (Tasks 2-3), bulk "add all upcoming" (Tasks 4-5), per-sport duration + UTC + summary/description content + filenames (Task 1), `league` threaded through modal (Task 5). All spec sections map to a task.
- **Type consistency:** `gameLinks(team, game, league?)` signature is identical in Task 3's definition and every caller (GameList, SeasonCalendar via GameList). `buildCalendar`/`downloadIcs`/`icsFilename`/`icsBulkFilename` signatures match between Task 1 and Tasks 3-5. `LinkChip.onClick` added in Task 2 is what Task 3 populates.
- **Out of scope (unchanged):** no webcal feed, no reminders/recurrence, no year navigation beyond season months.
