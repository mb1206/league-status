# Adding a league

Leagues are config-driven. Because the ESPN adapter and the base derivations are
league-agnostic (they read ESPN's own `seasonType` data), adding a league that ESPN
covers is usually a two-file change plus a data regen — no new UI or logic.

The example below adds MLB; substitute your league's id and ESPN paths.

## Steps

1. **Register the league module** — `src/leagues/registry.ts`

   Add a config and register it in `LEAGUES`:

   ```ts
   const mlbModule = espnModule({
     id: "mlb",           // internal id, used in storage + as the map key
     sport: "baseball",   // ESPN sport path
     league: "mlb",       // ESPN league path
     displayName: "MLB",  // shown in the sport filter bar
     icon: "⚾",           // fallback shown when a team has no logo
     hasPlayoffs: true,   // true → season progress reads "Playoffs start"; false → "Season ends"
   });

   export const LEAGUES: Record<string, LeagueModule> = {
     // …existing…
     mlb: mlbModule,
   };
   ```

   Find the ESPN `sport`/`league` paths by hitting
   `https://site.api.espn.com/apis/site/v2/sports/<sport>/<league>/teams` in a
   browser — if it returns teams, the paths are right.

2. **Add the league to the roster generator** — `scripts/generate-teams.mjs`

   Team search reads a committed roster bundle (ESPN's teams-*list* endpoint isn't
   CORS-enabled, so it can't be fetched from the browser). Add the same
   `{ id, sport, league }` to that script's `LEAGUES` array, then regenerate:

   ```
   node scripts/generate-teams.mjs
   ```

   This overwrites `src/leagues/teamsData.ts`. Commit the result.

3. **That's it for wiring.** The sport filter bar, team panels, and add-team search
   all read from the registry, so the new league appears automatically once a team in
   it is followed. No component changes.

## When you'd need more than config

The base derivations (`src/leagues/baseDerivations.ts`) infer season phase from
ESPN's per-game `seasonType` (preseason / regular / postseason), so they generalize
across leagues. You'd only add a league-specific derivation if a league needs
different phase logic (e.g. a bespoke playoffs-countdown rule). In that case, create a
`createXxxDerivations()` returning a `LeagueDerivations` and pass it into that league's
module instead of `createBaseDerivations()`.

## Checklist

- [ ] Config added to `registry.ts` and registered in `LEAGUES`
- [ ] Same entry added to `scripts/generate-teams.mjs`
- [ ] `node scripts/generate-teams.mjs` run and `teamsData.ts` committed
- [ ] `registry.test.ts` updated for the new league
- [ ] Verified: search finds a team, and its panel loads live games/standing
