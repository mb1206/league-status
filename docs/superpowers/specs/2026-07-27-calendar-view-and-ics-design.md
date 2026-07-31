# Calendar View + `.ics` Export for the Season Games Modal

Date: 2026-07-27

## Goal

Let a user view a followed team's past and upcoming games as a **calendar** from
inside the Season Games modal, and export games to their own calendar as `.ics`
files. The calendar preserves the existing per-game discussion/highlight links,
and each exportable event carries a meaningful title plus those links.

## Overview & Structure

The `SeasonGamesModal` gains a **view toggle** in its header: a list glyph
(current tabs view) and a calendar glyph (📅). Both views share the same game
data (`pastGames` + `upcomingGames`), rendered differently.

- **List view** — unchanged: Past/Upcoming tabs → `GameList`. Remains the
  default view each time the modal opens.
- **Calendar view** — the Past/Upcoming tabs hide. A single **unified** calendar
  shows both past and upcoming games in one continuous timeline. **Month grid**
  on wide screens, **agenda list** on narrow screens, chosen via a CSS
  breakpoint (both always rendered, one hidden — no JS resize logic).

### New files

- `src/components/SeasonCalendar.tsx` — the calendar view (grid + agenda).
- `src/leagues/ics.ts` — pure functions that build `.ics` text plus one
  DOM-touching download helper. Builders are fully unit-testable.

### Changed files

- `src/components/SeasonGamesModal.tsx` — view toggle, new `league` prop,
  conditional render of list vs calendar, bulk export button in calendar header.
- `src/components/TeamPanel.tsx` — pass `league={query.data.league}` into the modal.
- `src/components/GameList.tsx` — lift `gameLinks` into a shared helper (see below).
- `src/components/LinkIcons.tsx` — add an `"ics"` chip kind that renders as a
  `<button>` with an `onClick`, alongside the existing anchor chips.

## Calendar Rendering

**Shared prep:** merge `pastGames` + `upcomingGames`, sort by date. Compute the
set of months that actually contain games. The calendar opens on the month
nearest "now" (the upcoming edge of the season). ‹ › arrows move between
**months that contain games only** — empty months are skipped.

### Month grid (wide screens)

- Standard 7-column week grid with weekday headers and leading/trailing blank
  cells for the month.
- A day with game(s) shows a compact **game chip**: opponent (`vs BOS` / `@ BOS`);
  for past games the `W`/`L` result + score (reusing existing `result-W` /
  `result-L` styling); for upcoming games the tip-off time.
- Past chips are dimmed; upcoming chips are full-strength. Today's cell gets a
  subtle highlight.
- Clicking a chip opens a **day detail** (popover or inline expansion) listing
  that day's game(s) with the full link chips — YouTube highlights/preview +
  Reddit (via `LinkIcons`) — plus the "+" `.ics` chip on upcoming games.
  (In-grid chips are too small for three icons; links live in the detail view.)
- Each day cell has an `aria-label` (e.g. "October 21, Lakers vs BOS"). Chips are
  buttons.

### Agenda (narrow screens)

- Games grouped under month headers; each game is a full row matching the
  existing `GameList` row layout, so link chips + "+" sit inline naturally.

### Preserving links

Extract the game link-chip logic (currently `gameLinks(team, g)` inside
`GameList.tsx`) into a shared helper so `GameList`, the grid day-detail, and the
agenda render identical chips from one source of truth. The helper also appends
the "+" `.ics` chip for **upcoming** games.

## `.ics` Generation & Download

`src/leagues/ics.ts` — pure builders (no DOM) plus one download helper.

- `buildEvent(team, league, game)` → one `VEVENT` string:
  - `UID`: stable, derived from `game.id`.
  - `DTSTART` / `DTEND`: UTC (`...Z`) from `game.date` + a per-sport duration.
    Duration map keyed by `league.sport`: basketball 2.5h, football 3.5h,
    soccer 2h, baseball 3h, hockey 2.5h; **2h fallback** for anything unlisted.
  - `SUMMARY`: `⛹️ Lakers vs BOS` (home) / `⛹️ Lakers @ BOS` (away), using
    `league.icon`. For multi-competition games append the badge, e.g.
    `⚽ Arsenal vs CHE (UCL)`.
  - `DESCRIPTION`: YouTube preview URL + Reddit search URL + ESPN team link, each
    on its own line (newlines escaped per the iCal spec).
  - `DTSTAMP`; CRLF line endings and line folding to stay spec-valid.
- `buildCalendar(team, league, games)` → wraps N events in a `VCALENDAR`; used by
  the bulk export. Callers pass only upcoming games.
- `downloadIcs(filename, icsText)` → the only DOM-touching function: `Blob` +
  object URL + temporary `<a>` click + `revokeObjectURL`. Separate so builders
  stay unit-tested.

### Filenames

- Per-game: `lakers-vs-bos-2026-10-21.ics`.
- Bulk: `lakers-upcoming.ics`.

### Placement of "+"

- **Per-game:** a "+" chip (`kind: "ics"`) appended to the link chips on
  **upcoming** games only, in both views. Past games get no "+".
- **Bulk:** an "Add all upcoming" button in the calendar-view header calling
  `buildCalendar` over the upcoming games.

## Glyphs, Accessibility

- **View toggle** (modal header): a small segmented control of two icon buttons —
  list (☰) and calendar (📅) — with `aria-pressed` and labels ("List view" /
  "Calendar view"). Next to the title, before the close button. Defaults to list.
- **"+" chip:** rendered through `LinkIcons` via a new `"ics"` kind (emoji ➕,
  `aria-label` / `title` like "Add Lakers vs BOS to calendar"). Because it is an
  action, `LinkIcons` gains optional `onClick` / button rendering for that kind;
  anchor chips stay anchors, the "+" is a `<button>`. Chips stay visually uniform.
- Existing Escape-to-close is preserved. Toggle buttons and day chips are
  keyboard-focusable with clear labels. The `.ics` download is a button.

## Testing

- `ics.test.ts` — builders: DTSTART/DTEND math and UTC formatting, per-sport
  duration + fallback, SUMMARY for home/away and multi-competition, DESCRIPTION
  contains the links, escaping + line folding, bulk export excludes past games.
- `SeasonCalendar.test.tsx` — games land in the correct month, past dimmed vs
  upcoming full-strength, chip click reveals links, month navigation skips empty
  months, "+" present only on upcoming.
- `SeasonGamesModal.test.tsx` (extend) — toggle switches views, tabs hidden in
  calendar view, bulk "add all" wired.
- `LinkIcons.test.tsx` (extend) — the `"ics"` kind renders as a `<button>` and
  fires `onClick`; anchor kinds still render as anchors.

## Out of Scope (YAGNI)

- Live calendar subscription / `webcal` feed.
- Recurring events, reminders/alarms, or editable events in the `.ics`.
- Year navigation beyond the current season's months.
