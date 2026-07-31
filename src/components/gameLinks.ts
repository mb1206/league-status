import type { Game, LeagueConfig, Team } from "../domain/types";
import type { LinkChip } from "./LinkIcons";
import { buildCalendar, downloadIcs, icsFilename } from "../leagues/ics";
import {
  redditGameUrl,
  youtubeGameHighlightsUrl,
  youtubeGamePreviewUrl,
} from "../leagues/externalLinks";

export function gameLinks(team: Team, game: Game, league?: LeagueConfig): LinkChip[] {
  const oppAbbr = game.isHome ? game.awayTeam.abbreviation : game.homeTeam.abbreviation;
  // A played game links to highlights; one not yet played links to a preview.
  const played = game.status === "final";
  const chips: LinkChip[] = [
    {
      kind: "youtube",
      href: played ? youtubeGameHighlightsUrl(team, game) : youtubeGamePreviewUrl(team, game),
      label: `${team.name} vs ${oppAbbr} ${played ? "highlights" : "preview"} on YouTube`,
    },
    {
      kind: "reddit",
      href: redditGameUrl(team, game),
      label: `${team.name} vs ${oppAbbr} on Reddit`,
    },
  ];
  if (league && !played) {
    chips.push({
      kind: "ics",
      label: `Add ${team.name} vs ${oppAbbr} to calendar`,
      onClick: () => downloadIcs(icsFilename(team, game), buildCalendar(team, league, [game])),
    });
  }
  return chips;
}
