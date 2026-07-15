import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "../App";
import * as followed from "../hooks/useFollowedTeams";
import * as statusHook from "../hooks/useTeamStatus";
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
    league: { id: "nba", sport: "basketball", league: "nba", displayName: "NBA", icon: "🏀" },
    standing: { overall: "10-5" },
    seasonStatus: { phase: "in_season", label: "IN SEASON" },
    pastGames: [],
    upcomingGames: [],
  };
}

describe("App", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("shows an empty state when no teams are followed", () => {
    vi.spyOn(followed, "useFollowedTeams").mockReturnValue({
      followed: [],
      add: vi.fn(),
      remove: vi.fn(),
    });
    renderApp();
    expect(screen.getByText(/add a team/i)).toBeInTheDocument();
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
});
