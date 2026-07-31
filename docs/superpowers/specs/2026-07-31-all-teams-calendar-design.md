# All-Teams Calendar + Lighter Header Title

Date: 2026-07-31

## Goal

Give the user one place to see **every followed team's games together** on a
month calendar, opened from a calendar icon next to the "Next 7 Days" title on
the home page. Also make the `track my teamzzz` header title slightly thinner.

The all-teams calendar reuses the existing per-team month grid so the two stay
visually and behaviorally identical (past games with scores, upcoming games,
per-game links, month navigation, today highlight).

## Overview & Structure

The `WeekBanner` ("Next 7 Days") gains a **calendar icon button** next to its
title. Clicking it opens a `CalendarModal` showing a **full-season** calendar
(past + upcoming) aggregated across all followed teams. The modal is **view
only** — no bulk `.ics` export (per-team export still lives in each team's
Season Games modal).

To feed a multi-team calendar, the existing team-bound `SeasonCalendar` is
generalized into a shared `GameCalendar` that renders a normalized list of games,
each tagged with its own team/league. The per-team Season Games modal and the new
all-teams modal both use it.

### Data model — `CalendarEntry`

Each game carried into a calendar needs its team + league for the logo, opponent
label, score, and per-game links:

```ts
export interface CalendarEntry {
  team: Team;
  league: LeagueConfig;
  game: Game;
}
```

### New files

- `src/hooks/useAllGames.ts` — `useAllGames(followed): CalendarEntry[]`. Mirrors
  `useUpcomingWeek`: reads every followed team's status from the shared React
  Query cache via `useQueries` (same `teamStatusQuery` keys → **no new fetches**),
  and flattens each result's `pastGames + upcomingGames` into `CalendarEntry[]`.
- `src/components/CalendarModal.tsx` — dialog chrome (reuses `.dialog` /
  `.dialog-backdrop`, Escape + backdrop close) wrapping `GameCalendar`. Calls
  `useAllGames(followed)`. Empty roster → the existing "No games" empty state.

### Changed files

- `src/components/SeasonCalendar.tsx` → **renamed** to
  `src/components/GameCalendar.tsx` (test renamed with it). Now generic:
  - **Props:** `entries: CalendarEntry[]`, optional `actions?: ReactNode`,
    optional `now?: Date`. Replaces `team`/`league`/`pastGames`/`upcomingGames`.
  - Month set, navigation, day grouping, today highlight, scores, and
    `gameLinks(team, game, league)` all read team/league off each entry instead of
    from props — behavior otherwise unchanged.
  - **Multi-team distinction:** when `entries` span more than one distinct team,
    each game cell prepends a small team logo chip (falls back to the league icon
    when no `logoUrl`). With a single team (the per-team modal) nothing changes
    visually.
  - **Bulk `.ics` button** is removed from the component body and rendered through
    the `actions` slot in the nav row instead. The all-teams modal passes nothing.
- `src/components/SeasonGamesModal.tsx` — builds entries inline via a small
  `toEntries(team, league, games)` helper from its existing `pastGames` +
  `upcomingGames`, and passes its "➕ Add all upcoming" button (unchanged
  `buildCalendar` / `downloadIcs` single-team logic) into `GameCalendar`'s
  `actions` slot when there are upcoming games.
- `src/components/WeekBanner.tsx` — new `onOpenCalendar: () => void` prop; renders
  a calendar-icon button beside the "Next 7 Days" title.
- `src/App.tsx` — owns `calendarOpen` state; wires `WeekBanner`'s `onOpenCalendar`
  and renders `<CalendarModal>` with `followed` when open.
- `src/index.css` — `.app-header h1 { font-weight: 600; }` (down from default
  bold 700); styles for the calendar-icon button and the multi-team logo chip.

## Behavior details

- **Contents:** full season — past games (with scores/result) and upcoming games,
  navigable by month. Initial month follows the existing `GameCalendar` logic
  (first month `>= now`, else last).
- **Filter:** the modal shows **all** followed teams regardless of the active
  sport filter — its purpose is an everything-at-once view.
- **No bulk export** in the all-teams modal; the shared `actions` slot is simply
  empty there.

## Testing

- `GameCalendar`: update the existing test to the `entries` prop; add a
  multi-team case (two teams with games on the same day → both team logos render).
- `CalendarModal`: opens with aggregated games, closes on Escape and backdrop
  click, empty roster renders the empty state.
- `WeekBanner`: the calendar button invokes `onOpenCalendar`.

## Out of scope

- Bulk / combined `.ics` export across teams (per-team export unchanged).
- Any change to fetching, caching, or the game/team data shapes beyond the
  in-memory `CalendarEntry` projection.
