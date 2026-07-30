import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "../App";
import * as followed from "../hooks/useFollowedTeams";
import * as statusHook from "../hooks/useTeamStatus";
import * as standingsHook from "../hooks/useLeagueStandings";
import * as inSeasonHook from "../hooks/useInSeasonLeagues";
import * as weekHook from "../hooks/useUpcomingWeek";
import type { TeamStatus } from "../domain/types";

function renderApp() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>,
  );
}

function statusFor(name: string): TeamStatus {
  return {
    team: { id: name, leagueId: "nba", name, abbreviation: name.slice(0, 3).toUpperCase() },
    league: { id: "nba", sport: "basketball", league: "nba", displayName: "NBA", icon: "🏀", hasPlayoffs: true },
    standing: { overall: "10-5" },
    seasonStatus: { phase: "in_season", label: "IN SEASON" },
    pastGames: [],
    upcomingGames: [],
  };
}

describe("App", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(standingsHook, "useLeagueStandings").mockReturnValue({
      data: undefined,
    } as ReturnType<typeof standingsHook.useLeagueStandings>);
    vi.spyOn(inSeasonHook, "useInSeasonLeagues").mockReturnValue(new Set());
    vi.spyOn(weekHook, "useUpcomingWeek").mockReturnValue([]);
  });

  it("shows an empty state when no teams are followed", () => {
    vi.spyOn(followed, "useFollowedTeams").mockReturnValue({
      followed: [],
      add: vi.fn(),
      remove: vi.fn(),
    });
    renderApp();
    expect(screen.getByText(/add a team/i)).toBeInTheDocument();
  });

  it("adds the sample roster when the 🫧 button is clicked", async () => {
    const add = vi.fn();
    vi.spyOn(followed, "useFollowedTeams").mockReturnValue({
      followed: [],
      add,
      remove: vi.fn(),
    });
    renderApp();
    await userEvent.click(screen.getByRole("button", { name: /add sample teams/i }));

    // forEach passes (team, index, array); only the first arg is the team.
    const added = add.mock.calls.map((c) => c[0]);
    expect(added).toEqual([
      { leagueId: "wnba", teamId: "9" },
      { leagueId: "wnba", teamId: "14" },
      { leagueId: "mlb", teamId: "21" },
      { leagueId: "epl", teamId: "384" },
      { leagueId: "nba", teamId: "18" },
      { leagueId: "nfl", teamId: "25" },
      { leagueId: "nfl", teamId: "10" },
      { leagueId: "nhl", teamId: "11" },
      { leagueId: "nhl", teamId: "18" },
      { leagueId: "mls", teamId: "190" },
    ]);
  });

  it("filters the visible panels when a sport chip is clicked", async () => {
    vi.spyOn(followed, "useFollowedTeams").mockReturnValue({
      followed: [
        { leagueId: "nba", teamId: "Lakers" },
        { leagueId: "nfl", teamId: "49ers" },
      ],
      add: vi.fn(),
      remove: vi.fn(),
    });
    vi.spyOn(statusHook, "useTeamStatus").mockImplementation(
      (team) =>
        ({
          isLoading: false,
          isError: false,
          isSuccess: true,
          data: statusFor(team.teamId),
        }) as ReturnType<typeof statusHook.useTeamStatus>,
    );

    renderApp();
    expect(screen.getByText("Lakers")).toBeInTheDocument();
    expect(screen.getByText("49ers")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "🏈 NFL" }));
    expect(screen.queryByText("Lakers")).toBeNull();
    expect(screen.getByText("49ers")).toBeInTheDocument();
  });

  it("isolates failure: one panel errors while another renders", () => {
    vi.spyOn(followed, "useFollowedTeams").mockReturnValue({
      followed: [
        { leagueId: "nba", teamId: "Lakers" },
        { leagueId: "nba", teamId: "Celtics" },
      ],
      add: vi.fn(),
      remove: vi.fn(),
    });
    vi.spyOn(statusHook, "useTeamStatus").mockImplementation((team) => {
      if (team.teamId === "Lakers") {
        return { isLoading: false, isError: true, refetch: vi.fn() } as ReturnType<
          typeof statusHook.useTeamStatus
        >;
      }
      return {
        isLoading: false,
        isError: false,
        isSuccess: true,
        data: statusFor("Celtics"),
      } as ReturnType<typeof statusHook.useTeamStatus>;
    });

    renderApp();
    expect(screen.getByText(/couldn't load/i)).toBeInTheDocument();
    expect(screen.getByText("Celtics")).toBeInTheDocument();
  });

  it("renders the upcoming-week banner with a card linking to the team", () => {
    vi.spyOn(followed, "useFollowedTeams").mockReturnValue({
      followed: [{ leagueId: "nba", teamId: "13" }],
      add: vi.fn(),
      remove: vi.fn(),
    });
    vi.spyOn(statusHook, "useTeamStatus").mockReturnValue({
      isLoading: false,
      isError: false,
      isSuccess: true,
      data: statusFor("Lakers"),
    } as ReturnType<typeof statusHook.useTeamStatus>);
    vi.spyOn(weekHook, "useUpcomingWeek").mockReturnValue([
      {
        key: "2026-07-25",
        label: "TODAY",
        games: [
          { leagueId: "nba", teamId: "13", teamAbbr: "LAL", icon: "🏀", opponent: "vs GSW", date: "2026-07-25T23:30:00Z" },
        ],
      },
    ]);

    renderApp();
    expect(screen.getByRole("link", { name: "LAL vs GSW" })).toHaveAttribute("href", "#team-nba-13");
  });
});
