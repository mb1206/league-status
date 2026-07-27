# Season games modal + Premier League fixtures fix

**Date:** 2026-07-26

Two related changes to the league-status dashboard:

1. **Bug fix** — Premier League teams show no upcoming fixtures at the start of a
   new soccer season, even though fixtures exist.
2. **Feature** — a "View all" button next to the "Past" games list opens a modal
   showing every game this season (past + upcoming, all competitions) for that
   team, each row carrying score, result, competition badge, and
   highlight/Reddit links.

---

## Part 1 — Premier League fixtures fix (scoreboard fallback)

### Root cause

The app fetches each team's fixtures from ESPN's **team-schedule** endpoint
(`.../teams/{id}/schedule`). At the start of a new soccer season this endpoint
returns **zero events** for every Premier League club, even though the fixtures
exist. Verified against Crystal Palace (id `384`) and Arsenal (id `359`): both
return `season: "2026-27 English Premier League"` with `events: []`.

The fixtures are available from other ESPN endpoints:

- **Scoreboard** (`.../eng.1/scoreboard?dates=…`) — has the full fixture list
  (e.g. `CRY @ EVE`, `MNC @ CRY`). Events use the **same shape** our existing
  `mapGame` parses: `competitions[0].competitors[]` with
  `homeAway` / `team.id` / `team.abbreviation` / `score` / `winner`, and
  `competitions[0].status.type.state`. Season type is absent, which `mapSeasonType`
  already maps to `"regular"`.
- Team endpoint `team.nextEvent` — only the single next fixture (insufficient).
- Core API — all fixtures but as `$ref` links (~38 follow-up fetches; rejected).

### Approach

In `createEspnAdapter`'s multi-competition path, add a scoreboard fallback that
fires **only for the primary competition** (`eng.1`) and **only when the
team-schedule returns zero events**. Once ESPN populates the team schedule
(mid-season), the fallback stops firing automatically — it is self-healing and
scoped to the season-start window.

Non-primary competitions (cups, European competitions) keep using the
team-schedule endpoint. Scanning all 8 competitions' scoreboards would cost
~90 requests per team, and most cup rounds are undrawn at season start anyway.

**Documented limitation:** at the very start of a season, cup/European fixtures
that are already scheduled but absent from the team-schedule endpoint will not
appear until ESPN populates that endpoint. Only Premier League fixtures are
backfilled.

### Mechanics

New helpers in `src/leagues/espn/`:

- `espnUrls.scoreboard(path, { start, end })` → builds
  `.../{sport}/{league}/scoreboard?dates=YYYYMMDD-YYYYMMDD`.
- A pure `seasonWindow(year)` helper → returns the soccer season date range
  `Aug 1 {year}` … `Jun 30 {year+1}`.
- A pure `monthlyChunks(start, end)` helper → splits a date range into
  ~monthly `{ start, end }` pairs (the scoreboard hard-caps at 100 events per
  response; a month is ~40).

Fallback flow inside `fetchSchedule`, for the primary competition:

1. Fetch the team-schedule as today. If it returns any events, use them (no
   fallback).
2. If it returns zero events, read `season.year` from that response (add
   `season?: { year: number }` to `EspnScheduleResponse`). Fall back to the
   current soccer-season year derived from "now" if the field is missing.
3. Build the season window, split into monthly chunks, and fetch each chunk's
   scoreboard in parallel (`Promise.all`); ignore chunks that error.
4. Flatten events, dedupe by event `id`, and keep only events whose competitors
   include the followed `teamId`.
5. Map with the existing `mapGame(event, teamId, competition)`, tagging with the
   primary competition. Merge into the same sorted list the adapter already
   returns.

No mapper changes are required. `splitGames` / `seasonStatus` /
`selectGames` consume the result unchanged, so the panel's Upcoming list, the
season-status banner, and the new modal all benefit.

### Testing (Part 1)

Adapter tests mock `fetchJson` by URL:

- Empty primary schedule → fallback fetches scoreboard chunks, returns
  team-filtered mapped games (opponent, home/away, date correct).
- Non-empty primary schedule → fallback is **not** called; schedule events used.
- `seasonWindow` and `monthlyChunks` are unit-tested as pure functions
  (correct boundaries, no gaps/overlaps, month count).
- Events not involving the followed team are filtered out; duplicate event ids
  are deduped.

---

## Part 2 — "View all" season games modal

### Trigger & data

- A **"View all"** button rendered in the **Past** `GameList`'s `action` slot in
  `TeamPanel` (mirroring the "Home only" toggle the Upcoming list already puts
  there).
- **No new fetch.** `TeamPanel` already holds the full `pastGames` /
  `upcomingGames` arrays (`selectGames` only trims them at render time). The
  modal renders these directly.
- Open/close state is local `useState` in `TeamPanel`.

### Component: `SeasonGamesModal`

Follows the existing `AddTeamDialog` conventions: `.dialog-backdrop` +
`.dialog`, click-outside to close, `Escape` key to close, `aria-modal` /
`role="dialog"` with an accessible label.

Props:

```ts
interface SeasonGamesModalProps {
  team: Team;
  pastGames: Game[];
  upcomingGames: Game[];
  onClose: () => void;
}
```

Layout:

- Header: team name (e.g. "Crystal Palace"). A season label is a nice-to-have
  and, if included, is derived from existing data (`seasonYear`) rather than a
  new field.
- Body (scrollable for long lists): two **reused `GameList`** sections —
  - **Upcoming** — `games={upcomingGames}` (ascending), `showTime`, no limit.
  - **Past** — `games={pastGames}` (descending), no limit.
  - Both pass `team` so each row keeps its YouTube/Reddit links and competition
    badges, exactly as the panel rows do.
- A close button (×) in the header.

`GameList` is reused as-is; no changes to it are required (it already supports
`title`, `games`, `showTime`, and `team`).

### Scope guards (YAGNI)

- No home-only filter inside the modal — it shows everything.
- No per-game detail expansion — rows match the existing `GameList` rows.
- One modal instance per open panel; only one open at a time (local state).

### Testing (Part 2)

Component tests (`SeasonGamesModal` + `TeamPanel` integration):

- Clicking "View all" opens the modal.
- Modal renders all past and all upcoming rows (not just the panel's
  `PAST_GAMES` / `UPCOMING_GAMES` slice), each with links and any competition
  badges.
- `Escape` and backdrop click close the modal; the close button closes it.
- Accessible: dialog has an accessible name; focus is handled per the
  `AddTeamDialog` pattern.

---

## Files touched

- `src/leagues/espn/client.ts` — `espnUrls.scoreboard`; `season?` on
  `EspnScheduleResponse`.
- `src/leagues/espn/adapter.ts` — scoreboard fallback in `fetchSchedule`.
- `src/leagues/espn/*.ts` (new or existing helper file) — `seasonWindow`,
  `monthlyChunks`.
- `src/components/SeasonGamesModal.tsx` — new component.
- `src/components/TeamPanel.tsx` — "View all" button + modal wiring.
- `src/index.css` — modal styles if the existing `.dialog` styles need extending.
- Corresponding `*.test.ts(x)` files.
