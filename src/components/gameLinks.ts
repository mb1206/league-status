import type { Game, LeagueConfig, Team } from "../domain/types";
import type { LinkChip } from "./LinkIcons";
import { buildCalendar, downloadIcs, icsFilename } from "../leagues/ics";
import { redditGameUrl, youtubeGameHighlightsUrl } from "../leagues/externalLinks";

export function gameLinks(team: Team, game: Game, league?: LeagueConfig): LinkChip[] {
  const oppAbbr = game.isHome ? game.awayTeam.abbreviation : game.homeTeam.abbreviation;
  const played = game.status === "final";

  // Upcoming games get only an add-to-calendar action — a preview/discussion
  // link isn't useful before a game has happened. Without a league we can't
  // build the event, so there's nothing to show.
  if (!played) {
    if (!league) return [];
    return [
      {
        kind: "ics",
        label: `Add ${team.name} vs ${oppAbbr} to calendar`,
        onClick: () => downloadIcs(icsFilename(team, game), buildCalendar(team, league, [game])),
      },
    ];
  }

  // Played games link to highlights and the post-game discussion.
  return [
    {
      kind: "youtube",
      href: youtubeGameHighlightsUrl(team, game),
      label: `${team.name} vs ${oppAbbr} highlights on YouTube`,
    },
    {
      kind: "reddit",
      href: redditGameUrl(team, game),
      label: `${team.name} vs ${oppAbbr} on Reddit`,
    },
  ];
}
