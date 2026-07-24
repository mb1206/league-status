# External links (highlights / reddit / ESPN) — design

## Goal

Add quick "keep track of" links to each followed team, rendered as cute rounded
color-chip icon buttons:

- **Team level** (in the panel header): a link to the team's **ESPN page** and a
  YouTube search for the team's **season highlights** (current season, or the
  most-recently-passed season during the offseason).
- **Past game rows**: a YouTube search for **that game's highlights** and a
  **Reddit search** for the matchup.

Upcoming game rows stay clean (no links).

## Data reality

Everything is built from data the app already has — **no new fetching**:

- `Team`: `id` (this *is* the ESPN team id), `name`, `abbreviation`, `leagueId`.
- `LeagueConfig`: `league` (ESPN league path, e.g. `nba`), `sport` (e.g.
  `soccer`).
- `Game`: `date`, `homeTeam`/`awayTeam` (`abbreviation`), `isHome`.

The opponent's *full* name is not present on `Game` (only abbreviation), so
per-game search queries use the followed team's full name + the opponent's
abbreviation. This is acceptable for search URLs.

## URL builders — `src/leagues/externalLinks.ts`

Pure functions, each returning a URL string. Fully unit-testable.

### `espnTeamUrl(team: Team, league: LeagueConfig): string`

```
https://www.espn.com/{path}/team/_/id/{team.id}
```

- `path` = `league.league` for US leagues (`nba`, `wnba`, `nfl`, `mlb`, `nhl`).
- `path` = `"soccer"` when `league.sport === "soccer"` (MLS/EPL), because their
  `league` values (`usa.1`, `eng.1`) are not valid espn.com web paths.

### `youtubeTeamHighlightsUrl(team: Team, seasonYear: number): string`

YouTube search: `"{team.name} {seasonYear} highlights"`.

Season year derivation lives in a helper `seasonYear(pastGames, now)`:
- If there is at least one past game, use the calendar year of the **most recent**
  past game.
- Otherwise fall back to `now`'s calendar year.

This naturally yields "current season, or most-recently-passed season in the
offseason."

### `youtubeGameHighlightsUrl(team: Team, game: Game): string`

YouTube search: `"{team.name} vs {opponentAbbr} highlights {date}"`, where:
- `opponentAbbr` = `game.isHome ? game.awayTeam.abbreviation : game.homeTeam.abbreviation`.
- `date` = the game's date formatted `Mon D, YYYY` (locale-independent enough for
  search).

### `redditGameUrl(team: Team, game: Game): string`

Reddit search across all subreddits:
`https://www.reddit.com/search/?q={team.name} {opponentAbbr}`.

All query params are `encodeURIComponent`-encoded.

## Presentational component — `src/components/LinkIcons.tsx`

A single generic component reused in both places.

```ts
interface LinkChip {
  href: string;
  label: string;         // aria-label + title, e.g. "Lakers on ESPN"
  kind: "youtube" | "reddit" | "espn";
}
interface LinkIconsProps {
  links: LinkChip[];
  className?: string;
}
```

- Renders each as `<a href target="_blank" rel="noreferrer" aria-label title>`.
- Each `kind` maps to a small inline-SVG rounded chip:
  - `youtube` — red (`#CC0000`) rounded square, white play triangle.
  - `espn` — red rounded square, white **E** monogram.
  - `reddit` — orange (`#FF4500`) rounded square, white simplified Snoo glyph.
- Chips ~18–20px, rounded corners, subtle hover lift. Colors are fixed (not
  theme-derived) so they read the same in light/dark.

## Wiring

### Team header (`TeamPanel.tsx` / panel-header area)

Render a `LinkIcons` with two chips next to the banner:
- `espn` → `espnTeamUrl(team, league)`, label `"{team.name} on ESPN"`.
- `youtube` → `youtubeTeamHighlightsUrl(team, seasonYear(pastGames, now))`,
  label `"{team.name} season highlights on YouTube"`.

### Past game rows (`GameList.tsx`)

`GameList` gains an optional `team?: Team` prop. When present, each game row
renders a `LinkIcons` with:
- `youtube` → `youtubeGameHighlightsUrl(team, game)`.
- `reddit` → `redditGameUrl(team, game)`.

`TeamPanel` passes `team` **only to the "Past" list**, so Upcoming rows are
unchanged. The chips sit at the end of the row (after the date), in their own
`game-links` span.

## Testing

- **`externalLinks.test.ts`** (pure):
  - ESPN URL uses league path for US leagues and `/soccer/` for MLS/EPL.
  - YouTube team/game and Reddit queries are correctly `encodeURIComponent`-ed.
  - `seasonYear` uses most-recent past game's year, falls back to `now`.
  - Opponent abbreviation chosen correctly for home vs away games.
- **`LinkIcons.test.tsx`**: renders one `<a>` per link with correct `href`,
  `aria-label`, `target="_blank"`, `rel="noreferrer"`.
- **`GameList.test.tsx`**: per-game chips render only when `team` is passed;
  absent otherwise (Upcoming stays clean).

## Out of scope (YAGNI)

- Team-subreddit mapping (using all-of-Reddit search instead).
- Deep-linking specific Reddit game threads (not reliably possible).
- Links on upcoming games.
- Any new network requests or caching.
