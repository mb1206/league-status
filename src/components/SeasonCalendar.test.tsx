import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SeasonCalendar } from "./SeasonCalendar";
import { icsBulkFilename } from "../leagues/ics";
import type { Game, LeagueConfig, Team } from "../domain/types";

const nba: LeagueConfig = {
  id: "nba", sport: "basketball", league: "nba", displayName: "NBA", icon: "🏀", hasPlayoffs: true,
};
const team: Team = { id: "13", leagueId: "nba", name: "Los Angeles Lakers", abbreviation: "LAL" };
const base = { seasonType: "regular" as const, homeTeam: { id: "13", abbreviation: "LAL" } };

// Games sit in October (past) and December (upcoming); November is empty so the
// nav must skip it. `now` is fixed in October so the calendar opens there.
const NOW = new Date("2026-10-20T12:00:00Z");
const past: Game[] = [
  { ...base, id: "p1", date: "2026-10-15T02:30:00Z", status: "final", result: "W",
    isHome: true, homeTeam: { id: "13", abbreviation: "LAL", score: 110 }, awayTeam: { id: "2", abbreviation: "BOS", score: 99 } },
];
const upcoming: Game[] = [
  { ...base, id: "u1", date: "2026-12-03T02:30:00Z", status: "scheduled",
    isHome: false, homeTeam: { id: "5", abbreviation: "GSW" }, awayTeam: { id: "13", abbreviation: "LAL" } },
];

function renderCal() {
  return render(
    <SeasonCalendar team={team} league={nba} pastGames={past} upcomingGames={upcoming} now={NOW} />,
  );
}

describe("SeasonCalendar", () => {
  it("opens on the nearest month with games and shows the weekday header", () => {
    renderCal();
    expect(screen.getByText(/October 2026/)).toBeInTheDocument();
    expect(screen.getByText("Sun")).toBeInTheDocument();
    // At the first month, previous is disabled.
    expect(screen.getByRole("button", { name: /previous month/i })).toBeDisabled();
  });

  it("skips the empty November when navigating to the next month with games", async () => {
    renderCal();
    await userEvent.click(screen.getByRole("button", { name: /next month/i }));
    expect(screen.getByText(/December 2026/)).toBeInTheDocument();
    // Last month with games -> next disabled.
    expect(screen.getByRole("button", { name: /next month/i })).toBeDisabled();
  });

  it("shows the score and result inside the day cell for a played game", () => {
    renderCal();
    // Oct 15: LAL (home) 110, BOS 99 -> "vs BOS", result W, score 110–99.
    expect(screen.getByText("vs BOS")).toBeInTheDocument();
    expect(screen.getByText("W")).toBeInTheDocument();
    expect(screen.getByText("110–99")).toBeInTheDocument();
  });

  it("puts a '+' export chip on an upcoming game's cell but not a played game's", async () => {
    renderCal();
    // October's game is played -> no per-game add-to-calendar chip in the grid.
    expect(screen.queryByRole("button", { name: /add .* to calendar/i })).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: /next month/i }));
    // December's game is upcoming -> its cell carries the add-to-calendar chip.
    expect(
      screen.getByRole("button", { name: /add .* to calendar/i }),
    ).toBeInTheDocument();
  });

  it("bulk-exports all upcoming games", async () => {
    const createUrl = vi.fn(() => "blob:x");
    vi.stubGlobal("URL", { createObjectURL: createUrl, revokeObjectURL: vi.fn() });
    let downloadName: string | undefined;
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function (this: HTMLAnchorElement) {
        downloadName = this.download;
      });
    renderCal();
    await userEvent.click(screen.getByRole("button", { name: /add all upcoming/i }));
    expect(createUrl).toHaveBeenCalledTimes(1);
    expect(downloadName).toBe(icsBulkFilename(team));
    clickSpy.mockRestore();
    vi.unstubAllGlobals();
  });
});
