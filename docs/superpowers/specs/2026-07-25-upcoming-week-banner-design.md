# Upcoming-week banner — design

## Goal

A banner at the top of the app that shows, at a glance, every followed team's
games for the **next 7 days**, grouped by day in a horizontally-scrolling strip.
Clicking a game smooth-scrolls the page to that team's panel.

## Behavior summary

- **Window:** upcoming games only, from the start of today through
  `startOfToday + 7 days` (exclusive).
- **Grouping:** by calendar day, days ordered ascending; games within a day
  ordered by time ascending. Days with no games are omitted.
- **Filter:** respects the active sport chip, using the same stale-filter guard
  as the team list (only narrows when that league is actually followed). "All"
  shows every team.
- **Click:** scrolls to that team's panel (anchor + `:target`, no scroll JS).
- **A team that plays another followed team** appears once under each team —
  intended, since each card targets its own team's panel. No dedup.

## Data reality

Everything is built from data the app already has — **no new fetching**:

- `useInSeasonLeagues` already reads every followed team's status via
  `useQueries(followed.map(teamStatusQuery))`. The banner uses the **same query
  key**, so react-query serves it from cache (no extra network requests).
- `TeamStatus` provides `team` (`Team`), `league` (`LeagueConfig`), and
  `upcomingGames` (`Game[]`).
- `Team`: `id`, `leagueId`, `abbreviation`, `name`.
- `LeagueConfig`: `id`, `icon`, `displayName`.
- `Game`: `date` (ISO), `isHome`, `homeTeam`/`awayTeam` (`abbreviation`).

## Pure grouping — `src/leagues/upcomingWeek.ts`

Fully unit-testable, no React.

```ts
export interface WeekGame {
  leagueId: string;   // followed team's league id (for the scroll target)
  teamId: string;     // followed team's id (for the scroll target)
  teamAbbr: string;   // followed team abbreviation, e.g. "LAL"
  icon: string;       // league icon, e.g. "🏀"
  opponent: string;   // "vs GSW" (home) or "@ MIN" (away)
  date: string;       // ISO, for time rendering
}

export interface DayGroup {
  key: string;        // local calendar day key "YYYY-MM-DD"
  label: string;      // "TODAY" for today, else weekday short uppercase ("FRI")
  games: WeekGame[];  // sorted by date ascending
}

export interface WeekEntry {
  team: Team;
  league: LeagueConfig;
  upcomingGames: Game[];
}

export function buildWeek(entries: WeekEntry[], now: Date): DayGroup[];
```

Rules:
- Window is `[startOfDay(now), startOfDay(now) + 7 days)`. A game is included when
  its `date` falls in that half-open interval.
- `opponent` = `game.isHome ? "vs " + game.awayTeam.abbreviation : "@ " + game.homeTeam.abbreviation`.
- `teamId` = `entry.team.id`; `leagueId` = `entry.team.leagueId`.
- Day key/label derive from the game's **local** calendar day. `label` is
  `"TODAY"` when the day equals `startOfDay(now)`, otherwise the uppercase short
  weekday (`toLocaleDateString(undefined, { weekday: "short" })`, uppercased).
  Within a 7-day window every weekday is distinct, so weekday labels are
  unambiguous.
- Groups are returned sorted by day ascending; each group's `games` sorted by
  `date` ascending.

## Hook — `src/hooks/useUpcomingWeek.ts`

```ts
export function useUpcomingWeek(followed: FollowedTeam[]): DayGroup[];
```

- `const results = useQueries({ queries: followed.map(teamStatusQuery) })` — same
  pattern/key as `useInSeasonLeagues`.
- Map each successful `result.data` (a `TeamStatus`) to a `WeekEntry`
  (`{ team, league, upcomingGames }`), skipping undefined data.
- Return `buildWeek(entries, new Date())`.

Filtering by the active sport is done by the **component**, not the hook, so the
hook stays a pure "all teams' week" reader.

## Presentational component — `src/components/WeekBanner.tsx`

```ts
interface WeekBannerProps {
  groups: DayGroup[];
  activeLeague?: string | null;
}
```

- **Filter:** when `activeLeague` is set and at least one game in `groups`
  belongs to it, keep only that league's games (and drop days left empty);
  otherwise show all. (Mirrors `TeamPanelList`'s stale-filter guard.)
- **Empty state:** if the filtered result has no games, render the banner shell
  with a muted "No games in the next 7 days." message.
- **Layout:** a header label "NEXT 7 DAYS", then one horizontally-scrolling row
  (`overflow-x: auto`). Each day-group is a column-ish block: an uppercase day
  label (`TODAY` / `FRI`) above its cards.
- **Card:** an `<a href={"#team-" + leagueId + "-" + teamId}>` containing the
  league icon, team abbreviation, opponent (`vs GSW` / `@ MIN`), and the game
  time (`toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })`). The
  card's `aria-label` is `"{teamAbbr} {opponent}"` (e.g. "LAL vs GSW").

## Scroll target — `TeamPanel.tsx` + CSS

- `TeamPanel`'s root `<section className="team-panel">` gains
  `id={"team-" + team.leagueId + "-" + team.teamId}`. `leagueId` values
  (`nba`, `wnba`, `nfl`, `mlb`, `nhl`, `mls`, `epl`) and numeric `teamId`s are
  fragment-safe.
- `index.css`: `html { scroll-behavior: smooth; }` and a brief
  `.team-panel:target` flash animation (e.g. an accent outline that fades over
  ~1.2s). No JavaScript scroll logic.

## Wiring — `App.tsx`

- `const week = useUpcomingWeek(followed);`
- Render `<WeekBanner groups={week} activeLeague={activeLeague} />` between
  `<SportFilterBar>` and `<main>`.

## Testing

- **`upcomingWeek.test.ts`** (pure):
  - A game more than 7 days out is excluded; a game today is included; a game
    before the window start is excluded.
  - Games are grouped by day and ordered by time within a day; day groups are
    ordered ascending.
  - Today's group is labeled `TODAY`; other groups use the uppercase short
    weekday.
  - `opponent` is `vs {awayAbbr}` for a home game and `@ {homeAbbr}` for an away
    game.
- **`WeekBanner.test.tsx`**:
  - Renders a card per game with the correct `href` (`#team-{leagueId}-{teamId}`).
  - `activeLeague` narrows to that league's games; unaffected when the league
    isn't present in the groups.
  - Shows the empty message when there are no games.
- **`TeamPanel.test.tsx`**: the rendered section carries
  `id="team-{leagueId}-{teamId}"`.

## Out of scope (YAGNI)

- Deduping a game shared by two followed teams.
- Past/recent results in the banner (upcoming only).
- Persisting scroll position or highlighting the "current" team beyond the
  transient `:target` flash.
- Any new network requests or caching.
