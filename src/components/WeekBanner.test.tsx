import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { WeekBanner } from "./WeekBanner";
import type { DayGroup } from "../leagues/upcomingWeek";

const groups: DayGroup[] = [
  {
    key: "2026-07-25",
    label: "TODAY",
    games: [
      { leagueId: "nba", teamId: "13", teamAbbr: "LAL", icon: "🏀", opponent: "vs GSW", date: "2026-07-25T23:30:00Z" },
      { leagueId: "nfl", teamId: "25", teamAbbr: "SF", icon: "🏈", opponent: "@ LAR", date: "2026-07-25T20:00:00Z" },
    ],
  },
];

describe("WeekBanner", () => {
  it("renders a card per game linking to that team's anchor", () => {
    render(<WeekBanner groups={groups} />);
    const lal = screen.getByRole("link", { name: "LAL vs GSW" });
    expect(lal).toHaveAttribute("href", "#team-nba-13");
    const sf = screen.getByRole("link", { name: "SF @ LAR" });
    expect(sf).toHaveAttribute("href", "#team-nfl-25");
  });

  it("narrows to the active league when it has games", () => {
    render(<WeekBanner groups={groups} activeLeague="nfl" />);
    expect(screen.getByRole("link", { name: "SF @ LAR" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "LAL vs GSW" })).toBeNull();
  });

  it("shows all games when the active league has none here (stale filter)", () => {
    render(<WeekBanner groups={groups} activeLeague="mlb" />);
    expect(screen.getByRole("link", { name: "LAL vs GSW" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "SF @ LAR" })).toBeInTheDocument();
  });

  it("shows an empty message when there are no games", () => {
    render(<WeekBanner groups={[]} />);
    expect(screen.getByText(/no games in the next 7 days/i)).toBeInTheDocument();
  });
});
