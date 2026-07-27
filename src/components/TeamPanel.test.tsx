import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TeamPanel } from "./TeamPanel";
import * as hook from "../hooks/useTeamStatus";
import * as standingsHook from "../hooks/useLeagueStandings";
import type { TeamStatus } from "../domain/types";

const team = { leagueId: "nba", teamId: "13" };

function mockStatus(overrides: Partial<ReturnType<typeof hook.useTeamStatus>>) {
  vi.spyOn(hook, "useTeamStatus").mockReturnValue(
    overrides as ReturnType<typeof hook.useTeamStatus>,
  );
}

const sample: TeamStatus = {
  team: { id: "13", leagueId: "nba", name: "Los Angeles Lakers", abbreviation: "LAL" },
  league: { id: "nba", sport: "basketball", league: "nba", displayName: "NBA", icon: "🏀", hasPlayoffs: true },
  standing: { overall: "53-29", summary: "1st in Pacific Division" },
  seasonStatus: { phase: "in_season", label: "IN SEASON" },
  pastGames: [],
  upcomingGames: [],
};

describe("TeamPanel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(standingsHook, "useLeagueStandings").mockReturnValue({
      data: undefined,
    } as ReturnType<typeof standingsHook.useLeagueStandings>);
  });

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

  it("hides away games in both columns when 'Home only' is toggled on", async () => {
    const g = (id: string, isHome: boolean, oppAbbr: string): TeamStatus["upcomingGames"][number] => ({
      id,
      date: "2026-04-01T23:30:00Z",
      status: "scheduled",
      seasonType: "regular",
      isHome,
      homeTeam: { id: "13", abbreviation: isHome ? "LAL" : oppAbbr },
      awayTeam: { id: "2", abbreviation: isHome ? oppAbbr : "LAL" },
    });
    mockStatus({
      isLoading: false,
      isError: false,
      isSuccess: true,
      data: {
        ...sample,
        upcomingGames: [g("u1", true, "GSW"), g("u2", false, "BOS")],
        pastGames: [g("p1", true, "MIA"), g("p2", false, "NYK")],
      },
    });
    render(<TeamPanel team={team} onRemove={() => {}} />);
    // Both home (vs) and away (@) games visible initially.
    expect(screen.getByText("@ BOS")).toBeInTheDocument();
    expect(screen.getByText("@ NYK")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("checkbox", { name: /home only/i }));

    expect(screen.queryByText("@ BOS")).toBeNull();
    expect(screen.queryByText("@ NYK")).toBeNull();
    expect(screen.getByText("vs GSW")).toBeInTheDocument();
    expect(screen.getByText("vs MIA")).toBeInTheDocument();
  });

  it("caps Past at 3 games and Upcoming at 6", () => {
    const g = (id: string): TeamStatus["upcomingGames"][number] => ({
      id,
      date: "2026-04-01T23:30:00Z",
      status: "scheduled",
      seasonType: "regular",
      isHome: true,
      homeTeam: { id: "13", abbreviation: "LAL" },
      awayTeam: { id: "2", abbreviation: "GSW" },
    });
    mockStatus({
      isLoading: false,
      isError: false,
      isSuccess: true,
      data: {
        ...sample,
        pastGames: Array.from({ length: 5 }, (_, i) => g(`p${i}`)),
        upcomingGames: Array.from({ length: 8 }, (_, i) => g(`u${i}`)),
      },
    });
    const { container } = render(<TeamPanel team={team} onRemove={() => {}} />);
    const lists = container.querySelectorAll(".panel-games .game-list");
    expect(lists[0].querySelectorAll(".game-row")).toHaveLength(3); // Past
    expect(lists[1].querySelectorAll(".game-row")).toHaveLength(6); // Upcoming
  });

  it("renders ESPN and YouTube season links in the header", () => {
    mockStatus({ isLoading: false, isError: false, isSuccess: true, data: sample });
    render(<TeamPanel team={team} onRemove={() => {}} />);
    expect(
      screen.getByRole("link", { name: /Los Angeles Lakers on ESPN/i }),
    ).toHaveAttribute("href", "https://www.espn.com/nba/team/_/id/13");
    expect(
      screen.getByRole("link", { name: /season highlights on YouTube/i }),
    ).toBeInTheDocument();
  });

  it("renders per-game links in Past but not Upcoming", () => {
    const g = (id: string): TeamStatus["pastGames"][number] => ({
      id,
      date: "2026-04-01T02:30:00Z",
      status: "final",
      seasonType: "regular",
      isHome: true,
      result: "W",
      homeTeam: { id: "13", abbreviation: "LAL", score: 110 },
      awayTeam: { id: "2", abbreviation: "BOS", score: 100 },
    });
    mockStatus({
      isLoading: false,
      isError: false,
      isSuccess: true,
      data: { ...sample, pastGames: [g("p1")], upcomingGames: [{ ...g("u1"), status: "scheduled", result: undefined }] },
    });
    const { container } = render(<TeamPanel team={team} onRemove={() => {}} />);
    const lists = container.querySelectorAll(".panel-games .game-list");
    expect(lists[0].querySelectorAll(".game-links")).toHaveLength(1); // Past
    expect(lists[1].querySelectorAll(".game-links")).toHaveLength(0); // Upcoming
  });

  it("shows an error card with a working Retry button", async () => {
    const refetch = vi.fn();
    mockStatus({ isLoading: false, isError: true, error: new Error("boom"), refetch });
    render(<TeamPanel team={team} onRemove={() => {}} />);
    expect(screen.getByText(/couldn't load/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it("gives the panel an anchor id for scroll targeting", () => {
    mockStatus({ isLoading: false, isError: false, isSuccess: true, data: sample });
    const { container } = render(<TeamPanel team={team} onRemove={() => {}} />);
    expect(container.querySelector("#team-nba-13")).not.toBeNull();
  });

  it("opens the all-games modal when View all is clicked", async () => {
    mockStatus({ isLoading: false, isError: false, isSuccess: true, data: sample });
    render(<TeamPanel team={team} onRemove={() => {}} />);
    const user = userEvent.setup();

    expect(screen.queryByRole("dialog")).toBeNull();
    await user.click(screen.getByRole("button", { name: /view all/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
