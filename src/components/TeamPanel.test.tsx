import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TeamPanel } from "./TeamPanel";
import * as hook from "../hooks/useTeamStatus";
import type { TeamStatus } from "../domain/types";

const team = { leagueId: "nba", teamId: "13" };

function mockStatus(overrides: Partial<ReturnType<typeof hook.useTeamStatus>>) {
  vi.spyOn(hook, "useTeamStatus").mockReturnValue(
    overrides as ReturnType<typeof hook.useTeamStatus>,
  );
}

const sample: TeamStatus = {
  team: { id: "13", leagueId: "nba", name: "Los Angeles Lakers", abbreviation: "LAL" },
  league: { id: "nba", sport: "basketball", league: "nba", displayName: "NBA", icon: "🏀" },
  standing: { overall: "53-29", summary: "1st in Pacific Division" },
  seasonStatus: { phase: "in_season", label: "IN SEASON" },
  pastGames: [],
  upcomingGames: [],
};

describe("TeamPanel", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("shows a skeleton while loading", () => {
    mockStatus({ isLoading: true, isError: false });
    render(<TeamPanel team={team} onRemove={() => {}} />);
    expect(screen.getByTestId("panel-skeleton")).toBeInTheDocument();
  });

  it("renders banner and game lists on success", () => {
    mockStatus({ isLoading: false, isError: false, isSuccess: true, data: sample });
    render(<TeamPanel team={team} onRemove={() => {}} />);
    expect(screen.getByText("Los Angeles Lakers")).toBeInTheDocument();
    expect(screen.getByText("IN SEASON")).toBeInTheDocument();
  });

  it("renders Past games column before Upcoming", () => {
    mockStatus({ isLoading: false, isError: false, isSuccess: true, data: sample });
    const { container } = render(<TeamPanel team={team} onRemove={() => {}} />);
    const titles = Array.from(
      container.querySelectorAll(".panel-games .game-list-title"),
    ).map((el) => el.textContent);
    expect(titles).toEqual(["Past", "Upcoming"]);
  });

  it("shows an error card with a working Retry button", async () => {
    const refetch = vi.fn();
    mockStatus({ isLoading: false, isError: true, error: new Error("boom"), refetch });
    render(<TeamPanel team={team} onRemove={() => {}} />);
    expect(screen.getByText(/couldn't load/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(refetch).toHaveBeenCalledOnce();
  });
});
