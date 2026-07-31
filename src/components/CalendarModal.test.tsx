import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CalendarModal } from "./CalendarModal";
import * as allGames from "../hooks/useAllGames";
import { toEntries } from "../leagues/calendar";
import type { Game, LeagueConfig, Team } from "../domain/types";

const nba: LeagueConfig = {
  id: "nba", sport: "basketball", league: "nba", displayName: "NBA", icon: "🏀", hasPlayoffs: true,
};
const nhl: LeagueConfig = {
  id: "nhl", sport: "hockey", league: "nhl", displayName: "NHL", icon: "🏒", hasPlayoffs: true,
};
const lakers: Team = { id: "13", leagueId: "nba", name: "Los Angeles Lakers", abbreviation: "LAL", logoUrl: "https://logos.example/lal.png" };
const devils: Team = { id: "11", leagueId: "nhl", name: "New Jersey Devils", abbreviation: "NJD" };
const base = { seasonType: "regular" as const, status: "scheduled" as const };

const lakersGame: Game = { ...base, id: "l1", date: "2026-10-15T02:30:00Z", isHome: true, homeTeam: { id: "13", abbreviation: "LAL" }, awayTeam: { id: "2", abbreviation: "BOS" } };
const devilsGame: Game = { ...base, id: "d1", date: "2026-10-16T23:00:00Z", isHome: false, homeTeam: { id: "18", abbreviation: "SJS" }, awayTeam: { id: "11", abbreviation: "NJD" } };

function mockEntries(entries = [...toEntries(lakers, nba, [lakersGame]), ...toEntries(devils, nhl, [devilsGame])]) {
  vi.spyOn(allGames, "useAllGames").mockReturnValue(entries);
}

describe("CalendarModal", () => {
  it("renders a calendar aggregating games from every team", () => {
    mockEntries();
    render(<CalendarModal followed={[]} onClose={() => {}} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Sun")).toBeInTheDocument(); // weekday header → calendar rendered
    expect(screen.getByText("vs BOS")).toBeInTheDocument(); // Lakers game
    expect(screen.getByText("@ SJS")).toBeInTheDocument(); // Devils game
  });

  it("shows the empty state when there are no games", () => {
    mockEntries([]);
    render(<CalendarModal followed={[]} onClose={() => {}} />);
    expect(screen.getByText(/no games/i)).toBeInTheDocument();
  });

  it("closes on Escape, backdrop click, and the close button but not on inner click", async () => {
    mockEntries();
    const onClose = vi.fn();
    render(<CalendarModal followed={[]} onClose={onClose} />);
    const user = userEvent.setup();

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("dialog"));
    expect(onClose).toHaveBeenCalledTimes(1); // inner click ignored

    await user.click(screen.getByRole("dialog").parentElement!);
    expect(onClose).toHaveBeenCalledTimes(2); // backdrop closes

    await user.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(3);
  });
});
