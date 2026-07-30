# Resume — Calendar View + `.ics` Export (Feature 4)

**Approach:** subagent-driven development (superpowers). Plan: `docs/superpowers/plans/2026-07-27-calendar-view-and-ics.md`.

## Where to work
- Worktree: `/Users/meredithburkle/Source/league-status/.claude/worktrees/feat+calendar-view-ics`
- Branch: `worktree-feat+calendar-view-ics` (branched from origin/main `c2aae82`; local-only plan/spec commits copied in as `9bd4d5a`).
- Run all commands from the worktree, not the main checkout.
- **Durable state of record:** `.superpowers/sdd/progress.md` (the ledger). Read it first — trust it + `git log` over memory. (It's git-ignored scratch; recover from git log if lost.)

## Status
- **Task 1** `.ics` builders — ✅ complete, review clean (`..48e844c`). 3 plan-mandated Minors logged.
- **Task 2** LinkIcons button chips — ✅ complete (`..ef4cd67`). One Important CSS fix applied + re-reviewed clean.
- **Task 3** shared `gameLinks` helper + GameList `league` prop — ✅ complete, review clean, no issues (`..aaeeffd`).
- **Task 4** `SeasonCalendar` — ⚠️ **implemented (`804a4cf`, 171/171 passing) but review said "Needs fixes". Fixes NOT dispatched yet (interrupted here).**
- **Task 5** modal view toggle + wiring + bulk export — not started.

## NEXT ACTION (start here tomorrow)
Dispatch a fix for Task 4's two Important findings (details + Minor #5 to bundle are in the ledger under "Task 4 open findings"). Both are plan-mandated verbatim brief code, but the fixes don't contradict plan intent, so fix — don't escalate to the user.

1. **Fix #1 + Minor #5 (one test):** in `src/components/SeasonCalendar.test.tsx` bulk-export test, stub `HTMLAnchorElement.prototype.click` so it doesn't leak the jsdom "navigation to another Document" stderr; have the stub capture `this.download` and assert it equals `icsBulkFilename(team)` (`"los-angeles-lakers-upcoming.ics"`). Keep the existing `createObjectURL` call-count assertion.
2. **Fix #2:** in `src/components/SeasonCalendar.tsx`, clamp the month read: `const monthKey = months[Math.min(index, months.length - 1)];` to remove the `undefined.split` crash path.
3. Re-run `npx vitest run src/components/SeasonCalendar.test.tsx` + `npm run test:run` + `npx oxlint`; commit; regenerate review package (`scripts/review-package aaeeffd HEAD`) and re-review (spec + quality). Then mark Task 4 complete in the ledger.

The Task 4 implementer agent (`a6fbd2090987a60db`) and reviewer (`adfae928b12d856d9`) still hold context — resume via SendMessage rather than fresh spawns.

## After Task 4
- **Task 5** (last task): `scripts/task-brief <plan> 5`. Adds the list/calendar view toggle to `SeasonGamesModal`, threads a required `league` prop, mounts `SeasonCalendar`, wider dialog in calendar view; updates `SeasonGamesModal.test.tsx` and `TeamPanel.tsx` (pass `league={query.data.league}`). Ends with full suite + oxlint + `npm run build`. Standard model implementer (multi-file wiring).
- **Then:** final whole-branch review (most capable model) over `scripts/review-package $(git merge-base main HEAD) HEAD` — point it at the "Minor findings" triage list in the ledger. Then `superpowers:finishing-a-development-branch`.

## SDD helper scripts
`/Users/meredithburkle/.claude/plugins/cache/claude-plugins-official/superpowers/6.1.1/skills/subagent-driven-development/scripts/{task-brief,review-package}`

_Reviewers: sonnet has been sufficient for these mostly-mechanical diffs; use the most capable model only for the final whole-branch review._
