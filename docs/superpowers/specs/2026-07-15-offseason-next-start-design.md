# OFF SEASON next-start hover — design

## Goal

When a team's banner reads **OFF SEASON**, hovering (or keyboard-focusing) it
reveals a tooltip telling the user when the next season starts.

## Data reality

The offseason label is produced in `seasonStatus` (`src/leagues/baseDerivations.ts`)
in two distinct ways:

1. **Known far-future game** — the next scheduled game is more than
   `OFFSEASON_GAP_WEEKS` (6) weeks out. Here the schedule already contains next
   season's fixtures, so a concrete start date is available.
2. **No future games at all** — ESPN has not published the next schedule yet, so
   there is no date to show.

The tooltip handles both cases.

## Tooltip content

- **Date known:** `Season starts Mon, Sep 22`, formatted with the existing
  `endDateText` helper in `Banner.tsx`.
- **Date unknown:** `Schedule not yet released · usually starts late October`,
  where the "usually starts …" phrase is a per-league constant.

The "start date" is the **first regular-season game**, not preseason. Concretely,
the first future game matching the same regular-season filter already used by
`seasonProgress`:

```
g.competition ? g.competition.primary : g.seasonType === "regular"
```

If no such regular game exists on the schedule (only preseason, or nothing), the
date is treated as unknown and the fallback text is shown.

## Changes

### 1. `src/domain/types.ts`
- Add `nextSeasonStart?: string;` (ISO date) to `SeasonStatus`.
- Add `typicalSeasonStart: string;` to `LeagueConfig` (human text, e.g.
  `"late October"`).

### 2. `src/leagues/baseDerivations.ts`
- In `seasonStatus`, when returning an `offseason` phase, compute
  `nextSeasonStart` as the date of the first future regular-season game (the
  filter above). Leave it `undefined` when there is no such game.
- This applies to both offseason branches (no future games, and gap > 6 weeks).

### 3. `src/leagues/registry.ts`
- Add `typicalSeasonStart` to all seven league configs:
  - NBA — `"late October"`
  - WNBA — `"mid-May"`
  - NFL — `"early September"`
  - MLB — `"late March"`
  - NHL — `"early October"`
  - MLS — `"late February"`
  - Premier League — `"mid-August"`

### 4. `src/components/Banner.tsx`
- Accept a new `typicalSeasonStart: string` prop.
- When `seasonStatus.phase === "offseason"`, wrap the `OFF SEASON` label in a
  hoverable/focusable span (`tabIndex={0}`) with a `season-tooltip` child,
  reusing the existing tooltip styling and `role="tooltip"`.
- Tooltip text:
  - `nextSeasonStart` present → `Season starts {endDateText(nextSeasonStart)}`
  - otherwise → `Schedule not yet released · usually starts {typicalSeasonStart}`
- Non-offseason phases render the label exactly as today.

### 5. `src/components/TeamPanel.tsx`
- Pass `typicalSeasonStart={query.data.league.typicalSeasonStart}` to `Banner`.

## Testing

- `src/leagues/baseDerivations.test.ts`
  - offseason via gap → `nextSeasonStart` is the first regular-season game date.
  - offseason with only preseason future games → `nextSeasonStart` undefined.
  - offseason with no future games → `nextSeasonStart` undefined.
- `src/components/Banner.test.tsx`
  - offseason with `nextSeasonStart` → renders "Season starts …".
  - offseason without → renders "Schedule not yet released · usually starts …".

## Out of scope

- No new network calls; uses the schedule already fetched.
- No hardcoded exact dates; the only per-league constant is the approximate
  "usually starts" phrase.
