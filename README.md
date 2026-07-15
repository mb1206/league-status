# League Status

A small web dashboard showing the season status of the sports teams you follow:
a status banner (standing + phase), plus upcoming and past games. Starts with the
NBA; extensible to more leagues (NFL seeded).

## Develop

    npm install
    npm run dev

## Test

    npm run test:run

## Deploy (GitHub Pages)

The Vite `base` is set to `/league-status/`. Push this repo to a GitHub repo named
`league-status`, then:

    npm run deploy

Data comes from ESPN's public (unofficial) site API, fetched directly from the
browser. No API key required.

## Architecture

See `docs/superpowers/specs/2026-07-08-league-status-design.md` and
`docs/superpowers/plans/2026-07-08-league-status.md`.
