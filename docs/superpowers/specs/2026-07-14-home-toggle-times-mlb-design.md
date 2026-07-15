# Home Toggle, Game Times, MLB — Design (2026-07-14)

Three features plus a reusable "how to add a league" doc. All client-side; the
only new data is the MLB team roster bundle (build-time fetch).

## 1. Per-panel "Home only" toggle

A per-team toggle to hide away games, showing the next/last **home** games.

**State:** local `homeOnly` boolean in `TeamPanel`, default `false`. A small toggle
control in the panel header. Applies to **both** Past and Upcoming columns.

**Correctness — filter before the cap.** Today `splitGames` sorts *and* caps to 3
before the panel sees games, so filtering there would yield "home games among the
next 3." To show the next/last 3 *home* games, the cap moves to the presentation
layer:

- `splitGames(games, now)` becomes pure **sort + split, no cap** — returns the full
  past list (desc) and upcoming list (asc).
- New pure helper **`selectGames(games, { homeOnly, limit })`** applies the optional
  home filter then caps to `limit`. Lives in the derivations layer next to
  `splitGames`; unit-tested in isolation.
- `useTeamStatus` returns the full sorted `pastGames` / `upcomingGames`. `TeamPanel`
  runs `selectGames(list, { homeOnly, limit: 3 })` per column, reacting to the toggle
  without refetching.

`MAX_GAMES` (3) moves from `baseDerivations` to the presentation call site.

**Tests:** `selectGames` (home filter, cap, order preserved, homeOnly=false passthrough);
updated `splitGames` tests (no longer capped); `TeamPanel` toggle hides away games in
both columns.

## 2. Game time on upcoming games

`GameList` gains a `showTime?: boolean` prop. `TeamPanel` passes `true` only for the
Upcoming column; Past is unchanged.

When `showTime`, the date cell appends the local time via
`toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })`, e.g.
`Sat, Apr 4 · 7:00 PM`. Time comes from the existing `Game.date` ISO string; no data
changes.

**Tests:** `GameList` renders time when `showTime` is set, and omits it otherwise.

## 3. MLB integration

Season-phase derivation is ESPN-data-driven and league-agnostic, so MLB needs only
config + roster data — no derivation changes.

- Add `mlbModule` to the registry: `{ id: "mlb", sport: "baseball", league: "mlb",
  displayName: "MLB", icon: "⚾" }`, and to the `LEAGUES` map.
- Add MLB to `scripts/generate-teams.mjs`'s `LEAGUES` array and regenerate
  `src/leagues/teamsData.ts` (fetches the 30 MLB rosters for client-side search).

**Tests:** registry lists MLB with the expected config; `listLeagues` includes it.

## 4. "How to add a league" doc

Write `docs/adding-a-league.md` capturing the repeatable steps this work exercises:

1. Add a `<league>Module` config to `src/leagues/registry.ts` (id, ESPN sport/league
   paths, displayName, icon) and register it in `LEAGUES`.
2. Add the same `{ id, sport, league }` to `scripts/generate-teams.mjs`'s `LEAGUES`
   and run `node scripts/generate-teams.mjs` to refresh the search roster bundle.
3. Confirm no derivation changes are needed (the base derivations read ESPN's
   `seasonType`, so they generalize); note where a league-specific derivation would
   plug in if one ever is.
4. The sport filter bar and all panels pick the league up automatically via the
   registry — no UI wiring.

Keep it short and checklist-style.

## Out of scope
- No changes to ESPN client/adapter beyond the roster generator league list.
- No global home/away toggle; toggle is strictly per-panel.
