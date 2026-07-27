import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SeasonGamesModal } from "./SeasonGamesModal";
import type { Game, Team } from "../domain/types";

const team: Team = { id: "384", leagueId: "epl", name: "Crystal Palace", abbreviation: "CRY" };

const upcoming: Game[] = [
  {
    id: "u1",
    date: "2026-08-22T14:00Z",
    status: "scheduled",
    seasonType: "regular",
    isHome: false,
    homeTeam: { id: "368", abbreviation: "EVE" },
    awayTeam: { id: "384", abbreviation: "CRY" },
    competition: { shortName: "PL", name: "Premier League", primary: true },
  },
];

const past: Game[] = [
  {
    id: "p1",
    date: "2026-05-24T15:00Z",
    status: "final",
    seasonType: "regular",
    isHome: true,
    result: "W",
    homeTeam: { id: "384", abbreviation: "CRY", score: 2 },
    awayTeam: { id: "999", abbreviation: "LIV", score: 1 },
    competition: { shortName: "PL", name: "Premier League", primary: true },
  },
];

describe("SeasonGamesModal", () => {
  it("renders all upcoming and past games with per-game links", () => {
    render(
      <SeasonGamesModal team={team} pastGames={past} upcomingGames={upcoming} onClose={() => {}} />,
    );
    expect(screen.getByText("Upcoming")).toBeInTheDocument();
    expect(screen.getByText("Past")).toBeInTheDocument();
    expect(screen.getByText(/EVE/)).toBeInTheDocument();
    expect(screen.getByText(/LIV/)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /highlights on YouTube/i }).length).toBe(2);
  });

  it("closes on Escape, backdrop click, and the close button but not on inner click", async () => {
    const onClose = vi.fn();
    render(
      <SeasonGamesModal team={team} pastGames={past} upcomingGames={upcoming} onClose={onClose} />,
    );
    const user = userEvent.setup();

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("dialog"));
    expect(onClose).toHaveBeenCalledTimes(1); // inner click ignored

    await user.click(screen.getByRole("dialog").parentElement!);
    expect(onClose).toHaveBeenCalledTimes(2); // backdrop click closes

    await user.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(3);
  });
});
