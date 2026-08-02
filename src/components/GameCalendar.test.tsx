import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GameCalendar } from "./GameCalendar";
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
const base = { seasonType: "regular" as const };

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
    <GameCalendar entries={toEntries(lakers, nba, [...past, ...upcoming])} now={NOW} />,
  );
}

describe("GameCalendar", () => {
  it("opens on the nearest month with games and shows the weekday header", () => {
    renderCal();
    expect(screen.getByText(/October 2026/)).toBeInTheDocument();
    expect(screen.getByText("Sun")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /previous month/i })).toBeDisabled();
  });

  it("skips the empty November when navigating to the next month with games", async () => {
    renderCal();
    await userEvent.click(screen.getByRole("button", { name: /next month/i }));
    expect(screen.getByText(/December 2026/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next month/i })).toBeDisabled();
  });

  it("shows the score and result inside the day cell for a played game", () => {
    renderCal();
    expect(screen.getByText("vs BOS")).toBeInTheDocument();
    expect(screen.getByText("W")).toBeInTheDocument();
    expect(screen.getByText("110–99")).toBeInTheDocument();
  });

  it("puts a '+' export chip on an upcoming game's cell but not a played game's", async () => {
    renderCal();
    expect(screen.queryByRole("button", { name: /add .* to calendar/i })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: /next month/i }));
    expect(screen.getByRole("button", { name: /add .* to calendar/i })).toBeInTheDocument();
  });

  it("renders the actions slot in the nav row", () => {
    render(
      <GameCalendar
        entries={toEntries(lakers, nba, past)}
        actions={<button>Add all upcoming</button>}
        now={NOW}
      />,
    );
    expect(screen.getByRole("button", { name: /add all upcoming/i })).toBeInTheDocument();
  });

  it("resyncs to the nearest month when entries arrive after mount", () => {
    // Games in August (earliest, before NOW's month) and December (nearest month >= NOW).
    // Nothing in October itself, so the earliest month and the nearest month differ —
    // an index stuck at the empty-render's default of 0 would land on August, not December.
    const older: Game[] = [
      { ...base, id: "p0", date: "2026-08-10T02:30:00Z", status: "final", result: "L",
        isHome: true, homeTeam: { id: "13", abbreviation: "LAL", score: 90 }, awayTeam: { id: "2", abbreviation: "BOS", score: 95 } },
    ];
    const { rerender } = render(<GameCalendar entries={[]} now={NOW} />);
    expect(screen.getByText(/no games/i)).toBeInTheDocument();
    rerender(<GameCalendar entries={toEntries(lakers, nba, [...older, ...upcoming])} now={NOW} />);
    // NOW is in October; nearest month with games >= now is December, not August (the earliest).
    expect(screen.getByText(/December 2026/)).toBeInTheDocument();
  });

  it("shows a team badge per game only when multiple teams are present", () => {
    // Two teams with a game in the same October: Lakers (logo) + Devils (icon fallback).
    const devilsGame: Game = {
      ...base, id: "d1", date: "2026-10-16T23:00:00Z", status: "scheduled",
      isHome: true, homeTeam: { id: "11", abbreviation: "NJD" }, awayTeam: { id: "18", abbreviation: "SJS" },
    };
    render(
      <GameCalendar
        entries={[...toEntries(lakers, nba, past), ...toEntries(devils, nhl, [devilsGame])]}
        now={NOW}
      />,
    );
    // Lakers logo rendered as an img with the team abbreviation as alt.
    expect(screen.getByAltText("LAL")).toBeInTheDocument();
    // Devils have no logoUrl → league icon fallback text present.
    expect(screen.getByText("🏒")).toBeInTheDocument();
  });
});
