# Premier League + multi-competition fixtures — Design (2026-07-15)

Add the Premier League, and — because PL clubs play across several competitions —
show a team's fixtures from **all** of them (league + cups + European), each tagged
with a small competition badge. Standing, season phase, and season-progress still
come from the Premier League itself.

## Key ESPN facts (verified)

- A team's ESPN id is stable across competition endpoints (Arsenal = 359 everywhere).
- Each `soccer/{competition}/teams/{id}/schedule` returns **only** that competition's
  fixtures; non-participating competitions return `200` with `0` events.
- Verified slugs: `eng.1` (Premier League), `eng.fa` (FA Cup), `eng.league_cup`
  (Carabao Cup), `uefa.champions` (Champions League), `uefa.europa` (Europa League),
  `uefa.europa.conf` (Europa Conference), `eng.charity` (Community Shield),
  `fifa.cwc` (Club World Cup).
- PL fixtures carry `seasonType.type = 13481` (→ our mapper's default "regular").
  There is no "postseason" type: the PL has no playoff bracket.
- `eng.1` standings = one flat 20-team table ("Nth in English Premier League").

## Scope

- **In:** Premier League as a followable league; a followed PL team's schedule merges
  fixtures from the 8 competitions above, each fixture badged (PL / FA CUP / CARABAO /
  UCL / UEL / UECL / SHIELD / CWC). Standing = PL table. `hasPlayoffs: false`.
- **Out:** cup *standings/brackets* (knockouts have no table); applying multi-competition
  to other leagues (MLS etc. stay single-competition for now — the mechanism is opt-in
  via config).

## Data model

`domain/types.ts`:

```ts
export interface Competition {
  slug: string;      // ESPN league path, e.g. "uefa.champions"
  shortName: string; // badge text, e.g. "UCL"
  name: string;      // "UEFA Champions League"
  primary?: boolean; // the league's own competition (drives progress)
}

// Game gains:
competition?: { shortName: string; name: string; primary: boolean };

// LeagueConfig gains:
competitions?: Competition[]; // schedule sources; when set, fetchSchedule fans out
```

For US leagues `competitions` is undefined and `Game.competition` stays unset (no
badge) — existing behavior is untouched.

## Fetching & mapping

- **`espnUrls.schedule`** already takes an `EspnPath`; the adapter builds a path per
  competition (`sport: "soccer"`, `league: comp.slug`).
- **`adapter.fetchSchedule(teamId)`**: if `config.competitions` is set, fetch every
  competition's schedule in parallel (ignore per-competition errors → empty), tag each
  mapped game with that competition, then merge and sort by date. Otherwise unchanged
  (single-league fetch, no competition tag).
- **`mapGame(event, teamId, competition?)`** sets `Game.competition` from the passed
  `Competition` (its `shortName`, `name`, `primary`).

Cost note: a PL team now triggers ~8 parallel schedule requests instead of 1. Empty
competitions return fast. Acceptable; a later optimization could skip known-empty ones.

## Derivations

- **`seasonProgress`** counts the *primary-competition* games instead of "regular"
  season type: `games.filter(g => g.competition ? g.competition.primary : g.seasonType === "regular")`.
  So `N%` tracks the 38-game league season, not cup ties. `endDate` = last primary game.
- **`seasonStatus`** phase logic is unchanged and operates on all fetched games (any
  competition) for the offseason-gap check. With no postseason type it yields
  `IN SEASON` / `OFF SEASON` only. `hasPlayoffs: false` → progress tooltip reads
  "Season ends <date>".
- **`splitGames` / `selectGames`** are unchanged — they already sort/slice by date and
  filter by `isHome`, which works across merged competitions.

## UI

- **`GameList`** renders a small competition badge per row when `game.competition` is
  set (e.g. `[UCL]`). New grid column + a `.game-comp` pill; hidden for US leagues
  (no competition tag), so their layout is unchanged.
- Standing banner + division popover: unchanged (PL table).

## Registry & data

- Add `premierLeague` module: `{ id: "epl", sport: "soccer", league: "eng.1",
  displayName: "Premier League", icon: "⚽", hasPlayoffs: false, competitions: [ …8… ] }`,
  with the PL entry marked `primary: true`.
- Add `eng.1` to `scripts/generate-teams.mjs` and regenerate the roster bundle (20
  teams) for search. Competition schedules are fetched live, not bundled.

## Testing

- `mapGame` tags a game with the passed competition.
- `adapter.fetchSchedule` fans out across competitions, tags, and merges by date
  (mock multiple fetch responses; assert badges + ordering + empty-competition drop).
- `seasonProgress` counts only primary-competition games when competitions are tagged,
  and still falls back to season-type for untagged (US) leagues.
- `GameList` renders the badge when present, omits it otherwise.
- `registry` includes the Premier League module with `hasPlayoffs: false` and a
  `primary` competition.

## Risks / open notes

- `eng.charity` (Community Shield) returned valid JSON but 0 events for the teams
  tested (participation is limited) — low risk, drops out when empty.
- More requests per followed PL team (mitigated by parallelism + fast empties).
- Soccer records render as W‑D‑L strings (already true for MLS); display only.
