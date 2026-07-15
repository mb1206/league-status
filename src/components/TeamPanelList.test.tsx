import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { TeamPanelList } from "./TeamPanelList";
import * as hook from "../hooks/useTeamStatus";
import * as standingsHook from "../hooks/useLeagueStandings";
import type { TeamStatus } from "../domain/types";

function statusFor(id: string, leagueId: string): TeamStatus {
  return {
    team: { id, leagueId, name: id, abbreviation: id.slice(0, 3).toUpperCase() },
    league: { id: leagueId, sport: "x", league: leagueId, displayName: leagueId.toUpperCase(), icon: "•" },
    standing: { overall: "0-0" },
    seasonStatus: { phase: "in_season", label: "IN SEASON" },
    pastGames: [],
    upcomingGames: [],
  };
}

describe("TeamPanelList", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(standingsHook, "useLeagueStandings").mockReturnValue({
      data: undefined,
    } as ReturnType<typeof standingsHook.useLeagueStandings>);
    vi.spyOn(hook, "useTeamStatus").mockImplementation(
      (team) =>
        ({
          isLoading: false,
          isError: false,
          isSuccess: true,
          data: statusFor(team.teamId, team.leagueId),
        }) as ReturnType<typeof hook.useTeamStatus>,
    );
  });

  it("shows only the active league's teams when it is present", () => {
    render(
      <TeamPanelList
        teams={[
          { leagueId: "nba", teamId: "Lakers" },
          { leagueId: "nfl", teamId: "49ers" },
        ]}
        activeLeague="nfl"
        onRemove={() => {}}
      />,
    );
    expect(screen.queryByText("Lakers")).toBeNull();
    expect(screen.getByText("49ers")).toBeInTheDocument();
  });

  it("sorts teams in in-season leagues ahead of out-of-season ones", () => {
    const { container } = render(
      <TeamPanelList
        teams={[
          { leagueId: "nfl", teamId: "Titans" },
          { leagueId: "wnba", teamId: "Liberty" },
        ]}
        inSeasonLeagues={new Set(["wnba"])}
        activeLeague={null}
        onRemove={() => {}}
      />,
    );
    const order = [...container.querySelectorAll(".team-panel")].map((p) =>
      p.textContent?.includes("Liberty") ? "Liberty" : "Titans",
    );
    expect(order).toEqual(["Liberty", "Titans"]);
  });

  it("ignores a stale filter for a league no longer followed", () => {
    render(
      <TeamPanelList
        teams={[{ leagueId: "nba", teamId: "Lakers" }]}
        activeLeague="nfl"
        onRemove={() => {}}
      />,
    );
    expect(screen.getByText("Lakers")).toBeInTheDocument();
  });
});
