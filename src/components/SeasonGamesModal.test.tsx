import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SeasonGamesModal } from "./SeasonGamesModal";
import type { Game, Team } from "../domain/types";
import { getLeagueModule } from "../leagues/registry";

const league = getLeagueModule("epl").config;

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
  it("defaults to the Past tab and shows past games with a highlights link", () => {
    render(
      <SeasonGamesModal team={team} league={league} pastGames={past} upcomingGames={upcoming} onClose={() => {}} />,
    );
    expect(screen.getByRole("tab", { name: "Past" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText(/LIV/)).toBeInTheDocument();
    expect(screen.queryByText(/EVE/)).toBeNull(); // upcoming hidden until toggled
    expect(screen.getByRole("link", { name: /highlights on YouTube/i })).toBeInTheDocument();
  });

  it("switches to the Upcoming tab, showing upcoming games with a preview link", async () => {
    render(
      <SeasonGamesModal team={team} league={league} pastGames={past} upcomingGames={upcoming} onClose={() => {}} />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("tab", { name: "Upcoming" }));

    expect(screen.getByText(/EVE/)).toBeInTheDocument();
    expect(screen.queryByText(/LIV/)).toBeNull();
    expect(screen.getByRole("link", { name: /preview on YouTube/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /highlights on YouTube/i })).toBeNull();
  });

  it("closes on Escape, backdrop click, and the close button but not on inner click", async () => {
    const onClose = vi.fn();
    render(
      <SeasonGamesModal team={team} league={league} pastGames={past} upcomingGames={upcoming} onClose={onClose} />,
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

  it("toggles to the calendar view, hiding the Past/Upcoming tabs", async () => {
    render(
      <SeasonGamesModal team={team} league={league} pastGames={past} upcomingGames={upcoming} onClose={() => {}} />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /calendar view/i }));

    expect(screen.queryByRole("tab", { name: "Past" })).toBeNull();
    expect(screen.getByRole("button", { name: /list view/i })).toBeInTheDocument();
    // A weekday header proves the calendar rendered.
    expect(screen.getByText("Sun")).toBeInTheDocument();
  });
});
