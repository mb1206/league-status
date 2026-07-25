# External Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add rounded color-chip link buttons (ESPN, YouTube highlights, Reddit) to each followed team's panel header and to its past-game rows.

**Architecture:** Pure URL-builder functions in `src/leagues/externalLinks.ts` produce search/deep-link URLs from data the app already has. A single presentational `LinkIcons` component renders a list of chips. `TeamPanel` wires team-level chips into the header; `GameList` gains an optional `team` prop that, when passed (only for the Past list), renders per-game chips.

**Tech Stack:** React 19, TypeScript, Vitest + @testing-library/react, inline SVG. No new dependencies, no new network requests.

## Global Constraints

- No new fetching or caching — everything is derived from existing `Team`, `LeagueConfig`, `Game` data.
- All URL query values MUST be `encodeURIComponent`-encoded.
- Chip colors are fixed hex (not theme variables): YouTube/ESPN red `#CC0000`, Reddit orange `#FF4500`, glyphs white `#fff`.
- Every `<a>` chip: `target="_blank"`, `rel="noreferrer"`, and both `aria-label` and `title` set to the chip's label.
- Upcoming game rows stay clean — no links.
- Test command: `npm run test:run -- <path>` for a single file; `npm run test:run` for all.

---

### Task 1: URL builders (`externalLinks.ts`)

**Files:**
- Create: `src/leagues/externalLinks.ts`
- Test: `src/leagues/externalLinks.test.ts`

**Interfaces:**
- Consumes: `Team`, `LeagueConfig`, `Game` from `../domain/types`.
- Produces:
  - `espnTeamUrl(team: Team, league: LeagueConfig): string`
  - `seasonYear(pastGames: Game[], now: Date): number`
  - `youtubeTeamHighlightsUrl(team: Team, year: number): string`
  - `youtubeGameHighlightsUrl(team: Team, game: Game): string`
  - `redditGameUrl(team: Team, game: Game): string`

- [ ] **Step 1: Write the failing test**

Create `src/leagues/externalLinks.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  espnTeamUrl,
  redditGameUrl,
  seasonYear,
  youtubeGameHighlightsUrl,
  youtubeTeamHighlightsUrl,
} from "./externalLinks";
import type { Game, LeagueConfig, Team } from "../domain/types";

const lakers: Team = { id: "13", leagueId: "nba", name: "Los Angeles Lakers", abbreviation: "LAL" };
const nba: LeagueConfig = { id: "nba", sport: "basketball", league: "nba", displayName: "NBA", icon: "🏀", hasPlayoffs: true };
const mls: LeagueConfig = { id: "mls", sport: "soccer", league: "usa.1", displayName: "MLS", icon: "⚽", hasPlayoffs: true };

function game(over: Partial<Game> = {}): Game {
  return {
    id: "g1",
    date: "2026-04-01T02:30:00Z",
    status: "final",
    seasonType: "regular",
    isHome: true,
    result: "W",
    homeTeam: { id: "13", abbreviation: "LAL", score: 112 },
    awayTeam: { id: "2", abbreviation: "BOS", score: 104 },
    ...over,
  };
}

describe("espnTeamUrl", () => {
  it("uses the league path for US leagues", () => {
    expect(espnTeamUrl(lakers, nba)).toBe("https://www.espn.com/nba/team/_/id/13");
  });
  it("uses /soccer/ for soccer leagues instead of the league slug", () => {
    expect(espnTeamUrl(lakers, mls)).toBe("https://www.espn.com/soccer/team/_/id/13");
  });
});

describe("seasonYear", () => {
  it("uses the most recent past game's calendar year", () => {
    const games = [game({ date: "2025-11-10T00:00:00Z" }), game({ date: "2026-03-15T00:00:00Z" })];
    expect(seasonYear(games, new Date("2027-01-01T00:00:00Z"))).toBe(2026);
  });
  it("falls back to now's year when there are no past games", () => {
    expect(seasonYear([], new Date("2026-08-01T00:00:00Z"))).toBe(2026);
  });
});

describe("youtubeTeamHighlightsUrl", () => {
  it("encodes the team + year + highlights query", () => {
    expect(youtubeTeamHighlightsUrl(lakers, 2026)).toBe(
      "https://www.youtube.com/results?search_query=" +
        encodeURIComponent("Los Angeles Lakers 2026 highlights"),
    );
  });
});

describe("youtubeGameHighlightsUrl", () => {
  it("uses the away abbreviation as opponent for a home game", () => {
    const url = youtubeGameHighlightsUrl(lakers, game({ isHome: true }));
    expect(url).toContain(encodeURIComponent("Los Angeles Lakers vs BOS highlights"));
  });
  it("uses the home abbreviation as opponent for an away game", () => {
    const url = youtubeGameHighlightsUrl(lakers, game({ isHome: false, homeTeam: { id: "2", abbreviation: "GSW" }, awayTeam: { id: "13", abbreviation: "LAL" } }));
    expect(url).toContain(encodeURIComponent("Los Angeles Lakers vs GSW highlights"));
  });
});

describe("redditGameUrl", () => {
  it("searches all of reddit for the encoded matchup", () => {
    expect(redditGameUrl(lakers, game({ isHome: true }))).toBe(
      "https://www.reddit.com/search/?q=" + encodeURIComponent("Los Angeles Lakers BOS"),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/leagues/externalLinks.test.ts`
Expected: FAIL — cannot resolve `./externalLinks`.

- [ ] **Step 3: Write minimal implementation**

Create `src/leagues/externalLinks.ts`:

```ts
import type { Game, LeagueConfig, Team } from "../domain/types";

const YOUTUBE = "https://www.youtube.com/results?search_query=";
const REDDIT = "https://www.reddit.com/search/?q=";

function opponentAbbr(game: Game): string {
  return game.isHome ? game.awayTeam.abbreviation : game.homeTeam.abbreviation;
}

export function espnTeamUrl(team: Team, league: LeagueConfig): string {
  const path = league.sport === "soccer" ? "soccer" : league.league;
  return `https://www.espn.com/${path}/team/_/id/${team.id}`;
}

export function seasonYear(pastGames: Game[], now: Date): number {
  if (pastGames.length > 0) {
    const latest = pastGames.reduce((a, b) =>
      new Date(b.date) > new Date(a.date) ? b : a,
    );
    return new Date(latest.date).getFullYear();
  }
  return now.getFullYear();
}

export function youtubeTeamHighlightsUrl(team: Team, year: number): string {
  return YOUTUBE + encodeURIComponent(`${team.name} ${year} highlights`);
}

export function youtubeGameHighlightsUrl(team: Team, game: Game): string {
  const date = new Date(game.date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return YOUTUBE + encodeURIComponent(`${team.name} vs ${opponentAbbr(game)} highlights ${date}`);
}

export function redditGameUrl(team: Team, game: Game): string {
  return REDDIT + encodeURIComponent(`${team.name} ${opponentAbbr(game)}`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/leagues/externalLinks.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/leagues/externalLinks.ts src/leagues/externalLinks.test.ts
git commit -m "feat: add external link URL builders"
```

---

### Task 2: `LinkIcons` presentational component

**Files:**
- Create: `src/components/LinkIcons.tsx`
- Test: `src/components/LinkIcons.test.tsx`

**Interfaces:**
- Produces:
  - `LinkChip` type: `{ href: string; label: string; kind: "youtube" | "reddit" | "espn" }`
  - `LinkIcons({ links, className }: { links: LinkChip[]; className?: string })` — renders one `<a class="link-chip">` per link inside a `<span class="link-icons">` (plus any `className`). Renders `null` when `links` is empty.

- [ ] **Step 1: Write the failing test**

Create `src/components/LinkIcons.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { LinkIcons } from "./LinkIcons";
import type { LinkChip } from "./LinkIcons";

const links: LinkChip[] = [
  { kind: "espn", href: "https://espn.example/team", label: "Lakers on ESPN" },
  { kind: "youtube", href: "https://yt.example/search", label: "Lakers highlights on YouTube" },
];

describe("LinkIcons", () => {
  it("renders one link per chip with href, aria-label, target and rel", () => {
    render(<LinkIcons links={links} />);
    const espn = screen.getByRole("link", { name: "Lakers on ESPN" });
    expect(espn).toHaveAttribute("href", "https://espn.example/team");
    expect(espn).toHaveAttribute("target", "_blank");
    expect(espn).toHaveAttribute("rel", "noreferrer");
    expect(espn).toHaveAttribute("title", "Lakers on ESPN");
    expect(screen.getByRole("link", { name: "Lakers highlights on YouTube" })).toBeInTheDocument();
  });

  it("renders nothing when there are no links", () => {
    const { container } = render(<LinkIcons links={[]} />);
    expect(container.querySelector(".link-icons")).toBeNull();
  });

  it("applies an extra className to the wrapper", () => {
    const { container } = render(<LinkIcons links={links} className="game-links" />);
    expect(container.querySelector(".link-icons.game-links")).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/components/LinkIcons.test.tsx`
Expected: FAIL — cannot resolve `./LinkIcons`.

- [ ] **Step 3: Write minimal implementation**

Create `src/components/LinkIcons.tsx`:

```tsx
import type { ReactNode } from "react";

export interface LinkChip {
  href: string;
  label: string; // aria-label + title
  kind: "youtube" | "reddit" | "espn";
}

export interface LinkIconsProps {
  links: LinkChip[];
  className?: string;
}

function chipGlyph(kind: LinkChip["kind"]): ReactNode {
  switch (kind) {
    case "youtube":
      return (
        <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
          <rect width="20" height="20" rx="5" fill="#CC0000" />
          <path d="M8 6.5l5 3.5-5 3.5z" fill="#fff" />
        </svg>
      );
    case "espn":
      return (
        <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
          <rect width="20" height="20" rx="5" fill="#CC0000" />
          <text
            x="10"
            y="14.5"
            textAnchor="middle"
            fontSize="12"
            fontWeight="700"
            fontFamily="Arial, sans-serif"
            fill="#fff"
          >
            E
          </text>
        </svg>
      );
    case "reddit":
      return (
        <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
          <rect width="20" height="20" rx="5" fill="#FF4500" />
          <circle cx="10" cy="11" r="4.6" fill="#fff" />
          <circle cx="8.2" cy="10.6" r="0.9" fill="#FF4500" />
          <circle cx="11.8" cy="10.6" r="0.9" fill="#FF4500" />
          <circle cx="14" cy="6" r="1.4" fill="#fff" />
        </svg>
      );
  }
}

export function LinkIcons({ links, className }: LinkIconsProps) {
  if (links.length === 0) return null;
  return (
    <span className={className ? `link-icons ${className}` : "link-icons"}>
      {links.map((link) => (
        <a
          key={`${link.kind}:${link.href}`}
          className="link-chip"
          href={link.href}
          target="_blank"
          rel="noreferrer"
          aria-label={link.label}
          title={link.label}
        >
          {chipGlyph(link.kind)}
        </a>
      ))}
    </span>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/components/LinkIcons.test.tsx`
Expected: PASS.

- [ ] **Step 5: Add chip styles**

In `src/index.css`, add after the `.game-list-empty` rule (near line 143):

```css
.link-icons { display: inline-flex; align-items: center; gap: 4px; }
.link-chip { display: inline-flex; line-height: 0; border-radius: 5px; transition: transform 0.1s ease; }
.link-chip:hover { transform: translateY(-1px); }
.link-chip:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
```

- [ ] **Step 6: Commit**

```bash
git add src/components/LinkIcons.tsx src/components/LinkIcons.test.tsx src/index.css
git commit -m "feat: add LinkIcons chip component"
```

---

### Task 3: Per-game chips in `GameList`

**Files:**
- Modify: `src/components/GameList.tsx`
- Test: `src/components/GameList.test.tsx`
- Modify: `src/index.css`

**Interfaces:**
- Consumes: `youtubeGameHighlightsUrl`, `redditGameUrl` from `../leagues/externalLinks`; `LinkIcons`, `LinkChip` from `./LinkIcons`; `Team` from `../domain/types`.
- Produces: `GameList` gains an optional `team?: Team` prop. When present, each row renders a `LinkIcons` (YouTube + Reddit). When absent, no per-row links (existing behavior).

- [ ] **Step 1: Write the failing test**

Add these cases inside the existing `describe("GameList", ...)` block in `src/components/GameList.test.tsx`. First extend the import line:

```tsx
import type { Game, Team } from "../domain/types";
```

Then add:

```tsx
  const lakers: Team = { id: "13", leagueId: "nba", name: "Los Angeles Lakers", abbreviation: "LAL" };

  it("renders per-game YouTube and Reddit links when a team is passed", () => {
    render(<GameList title="Past" games={[past]} team={lakers} />);
    const yt = screen.getByRole("link", { name: /highlights on YouTube/i });
    expect(yt).toHaveAttribute("href", expect.stringContaining("youtube.com"));
    const reddit = screen.getByRole("link", { name: /on Reddit/i });
    expect(reddit).toHaveAttribute("href", expect.stringContaining("reddit.com"));
  });

  it("renders no per-game links when no team is passed", () => {
    render(<GameList title="Past" games={[past]} />);
    expect(screen.queryByRole("link")).toBeNull();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/components/GameList.test.tsx`
Expected: FAIL — `team` is not a prop / no links rendered.

- [ ] **Step 3: Write minimal implementation**

Edit `src/components/GameList.tsx`. Update imports at the top:

```tsx
import type { ReactNode } from "react";
import type { Game, Team } from "../domain/types";
import { LinkIcons } from "./LinkIcons";
import type { LinkChip } from "./LinkIcons";
import { redditGameUrl, youtubeGameHighlightsUrl } from "../leagues/externalLinks";
```

Update the props interface:

```tsx
interface GameListProps {
  title: string;
  games: Game[];
  showTime?: boolean;
  twoColumn?: boolean;
  action?: ReactNode;
  team?: Team;
}
```

Add a helper above the component (next to `opponent`):

```tsx
function gameLinks(team: Team, g: Game): LinkChip[] {
  const oppAbbr = g.isHome ? g.awayTeam.abbreviation : g.homeTeam.abbreviation;
  return [
    {
      kind: "youtube",
      href: youtubeGameHighlightsUrl(team, g),
      label: `${team.name} vs ${oppAbbr} highlights on YouTube`,
    },
    {
      kind: "reddit",
      href: redditGameUrl(team, g),
      label: `${team.name} vs ${oppAbbr} on Reddit`,
    },
  ];
}
```

Destructure `team` in the component signature:

```tsx
export function GameList({
  title,
  games,
  showTime = false,
  twoColumn = false,
  action,
  team,
}: GameListProps) {
```

Render the chips at the end of each row, right after the `game-date` span:

```tsx
              <span className="game-date">{dateText(g.date, showTime)}</span>
              {team && <LinkIcons className="game-links" links={gameLinks(team, g)} />}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/components/GameList.test.tsx`
Expected: PASS (new cases plus all existing cases still green).

- [ ] **Step 5: Add row-link styles**

In `src/index.css`, add after the `.game-date` rule (line 140):

```css
.game-links { grid-column: 1 / -1; justify-self: end; margin-top: 2px; }
```

- [ ] **Step 6: Commit**

```bash
git add src/components/GameList.tsx src/components/GameList.test.tsx src/index.css
git commit -m "feat: add per-game highlight and reddit links to GameList"
```

---

### Task 4: Team-header chips + wire Past list in `TeamPanel`

**Files:**
- Modify: `src/components/TeamPanel.tsx`
- Test: `src/components/TeamPanel.test.tsx`
- Modify: `src/index.css`

**Interfaces:**
- Consumes: `LinkIcons`, `LinkChip` from `./LinkIcons`; `espnTeamUrl`, `youtubeTeamHighlightsUrl`, `seasonYear` from `../leagues/externalLinks`.
- Produces: no new exports. Header renders a `LinkIcons` (ESPN + YouTube season highlights); the Past `GameList` receives `team={query.data.team}`; the Upcoming `GameList` does not.

- [ ] **Step 1: Write the failing test**

Add these cases inside the existing `describe("TeamPanel", ...)` block in `src/components/TeamPanel.test.tsx`. `sample` already has `team`, `league`, empty `pastGames`/`upcomingGames`.

```tsx
  it("renders ESPN and YouTube season links in the header", () => {
    mockStatus({ isLoading: false, isError: false, isSuccess: true, data: sample });
    render(<TeamPanel team={team} onRemove={() => {}} />);
    expect(
      screen.getByRole("link", { name: /Los Angeles Lakers on ESPN/i }),
    ).toHaveAttribute("href", "https://www.espn.com/nba/team/_/id/13");
    expect(
      screen.getByRole("link", { name: /season highlights on YouTube/i }),
    ).toBeInTheDocument();
  });

  it("renders per-game links in Past but not Upcoming", () => {
    const g = (id: string): TeamStatus["pastGames"][number] => ({
      id,
      date: "2026-04-01T02:30:00Z",
      status: "final",
      seasonType: "regular",
      isHome: true,
      result: "W",
      homeTeam: { id: "13", abbreviation: "LAL", score: 110 },
      awayTeam: { id: "2", abbreviation: "BOS", score: 100 },
    });
    mockStatus({
      isLoading: false,
      isError: false,
      isSuccess: true,
      data: { ...sample, pastGames: [g("p1")], upcomingGames: [{ ...g("u1"), status: "scheduled", result: undefined }] },
    });
    const { container } = render(<TeamPanel team={team} onRemove={() => {}} />);
    const lists = container.querySelectorAll(".panel-games .game-list");
    expect(lists[0].querySelectorAll(".game-links")).toHaveLength(1); // Past
    expect(lists[1].querySelectorAll(".game-links")).toHaveLength(0); // Upcoming
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/components/TeamPanel.test.tsx`
Expected: FAIL — no header links / no `.game-links` in Past.

- [ ] **Step 3: Write minimal implementation**

Edit `src/components/TeamPanel.tsx`. Add imports:

```tsx
import { LinkIcons } from "./LinkIcons";
import type { LinkChip } from "./LinkIcons";
import { espnTeamUrl, seasonYear, youtubeTeamHighlightsUrl } from "../leagues/externalLinks";
```

Inside the `query.isSuccess && query.data` block, build the header chips before the returned JSX header. Replace the `panel-header` block's contents so it also renders the links. Concretely, change:

```tsx
          <div className="panel-header">
            <Banner
              ...
            />
            <button
              className="panel-remove"
              ...
            >
              ×
            </button>
          </div>
```

to add a `LinkIcons` between `<Banner />` and the remove button, using a local `teamLinks` computed from `query.data`:

```tsx
          <div className="panel-header">
            <Banner
              icon={query.data.league.icon}
              logoUrl={query.data.team.logoUrl}
              leagueName={query.data.league.displayName}
              hasPlayoffs={query.data.league.hasPlayoffs}
              teamName={query.data.team.name}
              division={division}
              currentTeamId={query.data.team.id}
              seasonStatus={query.data.seasonStatus}
              standing={query.data.standing}
            />
            <LinkIcons
              className="team-links"
              links={[
                {
                  kind: "espn",
                  href: espnTeamUrl(query.data.team, query.data.league),
                  label: `${query.data.team.name} on ESPN`,
                },
                {
                  kind: "youtube",
                  href: youtubeTeamHighlightsUrl(
                    query.data.team,
                    seasonYear(query.data.pastGames, new Date()),
                  ),
                  label: `${query.data.team.name} season highlights on YouTube`,
                },
              ] satisfies LinkChip[]}
            />
            <button
              className="panel-remove"
              aria-label={`Remove ${query.data.team.name}`}
              onClick={() => onRemove(team)}
            >
              ×
            </button>
          </div>
```

Then pass `team` to the Past `GameList` only (leave Upcoming unchanged):

```tsx
            <GameList
              title="Past"
              team={query.data.team}
              games={selectGames(query.data.pastGames, {
                homeOnly,
                limit: PAST_GAMES,
              })}
            />
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/components/TeamPanel.test.tsx`
Expected: PASS (new cases plus existing cases still green).

- [ ] **Step 5: Position the header chips**

In `src/index.css`, add after the `.panel-remove` rule (line 45):

```css
.panel-header .team-links { position: absolute; bottom: 10px; right: 12px; }
```

- [ ] **Step 6: Full suite + build**

Run: `npm run test:run` — Expected: all suites PASS.
Run: `npm run build` — Expected: `tsc -b` and `vite build` succeed with no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/TeamPanel.tsx src/components/TeamPanel.test.tsx src/index.css
git commit -m "feat: add team ESPN and highlight links to TeamPanel header"
```

- [ ] **Step 8: Visual check (manual)**

Run the app (`npm run dev`) and confirm: header chips sit clear of the standing text and the × button, Past rows show two chips, Upcoming rows are clean, chips are legible in both light and dark. Nudge the `.team-links` `bottom`/`right` offsets if anything overlaps.

---

## Notes on spec coverage

- `espnTeamUrl` soccer path, `seasonYear` fallback, opponent-abbreviation choice, and `encodeURIComponent` correctness → Task 1 tests.
- `LinkIcons` per-link `<a>` attributes → Task 2 tests.
- Per-game chips render only with `team`; Upcoming stays clean → Task 3 + Task 4 tests.
- Out-of-scope items (subreddit mapping, deep Reddit threads, upcoming-row links, new fetching) are intentionally not implemented.
