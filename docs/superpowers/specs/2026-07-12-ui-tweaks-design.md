# UI Tweaks Design — 2026-07-12

Three focused UI changes to the league-status dashboard. All are client-side only;
no new data fetching or domain-model changes.

## 1. Swap Upcoming / Past column order

**Current:** In `TeamPanel.tsx`, `.panel-games` renders `<GameList title="Upcoming">`
then `<GameList title="Past">` (Upcoming left, Past right).

**Change:** Reorder the two `<GameList>` elements so **Past** is left and **Upcoming**
is right. `.panel-games` is already a two-column CSS grid (`src/index.css`), so layout
requires no CSS change — only the JSX order flips.

**Tests:** Update any `TeamPanel` test that asserts column order.

## 2. Sport filter bar

A new component that lets the user filter the visible team panels by sport.

**Component:** `SportFilterBar` (`src/components/SportFilterBar.tsx`), rendered in
`App.tsx` between `<Header>` and `<main>`.

**Contents:** One chip per sport the user **follows** (derived from followed teams →
their `leagueId` → `LeagueConfig` via the registry), plus a leading **"All"** chip.
Each sport chip shows the league emoji + `displayName` (e.g. `🏀 NBA`).

**Behavior:**
- Filter state `activeLeague: string | null` (default `null` = All) lives in `App.tsx`.
- Clicking a chip sets `activeLeague`; the active chip is visually highlighted.
- The value is passed to `TeamPanelList`, which filters `teams` by `leagueId` before
  rendering. `null` shows all.
- The bar is **hidden when the user follows ≤1 distinct sport** (nothing to filter).
- Purely client-side; no new fetching. Followed sports are derived, deduped, and
  ordered by the registry's league order for stability.

**Tests:** New `SportFilterBar` test — renders a chip per followed sport, "All" chip
present, clicking a chip invokes the callback with the league id, and the bar renders
nothing when ≤1 sport is followed. Update `App` test if it needs the new wiring.

## 3. Team logos instead of league emoji

**Current:** `Banner.tsx` shows the **league** emoji (`icon`, e.g. `🏀`) next to the
team name.

**Change:** Show the **team's** logo image instead. Each `Team` already carries an
optional `logoUrl` (already rendered in `AddTeamDialog` search results). Pass
`team.logoUrl` into `Banner` and render a small rounded `<img>` (~24px) in place of the
emoji. **Fallback:** if a team has no `logoUrl`, keep showing the league emoji.

**Interface:** Add a `logoUrl?: string` prop to `Banner` (keep `icon` for fallback).
`TeamPanel` passes `query.data.team.logoUrl`.

**Tests:** Update `Banner`/`TeamPanel` tests — assert the `<img>` renders with the
team logo when present, and the emoji fallback renders when absent.

## Out of scope
- No changes to data fetching, ESPN adapters, or the domain model.
- No responsive redesign beyond the existing grid behavior.
