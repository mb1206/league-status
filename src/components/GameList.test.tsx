import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { GameList } from "./GameList";
import type { Game, Team } from "../domain/types";

const past: Game = {
  id: "1",
  date: "2026-04-01T02:30Z",
  status: "final",
  seasonType: "regular",
  isHome: true,
  result: "W",
  homeTeam: { id: "13", abbreviation: "LAL", score: 112 },
  awayTeam: { id: "2", abbreviation: "BOS", score: 104 },
};

describe("GameList", () => {
  it("renders a past game with opponent, W/L, and score", () => {
    render(<GameList title="Past" games={[past]} />);
    expect(screen.getByText("Past")).toBeInTheDocument();
    expect(screen.getByText(/BOS/)).toBeInTheDocument();
    expect(screen.getByText(/W/)).toBeInTheDocument();
    expect(screen.getByText(/112.?104/)).toBeInTheDocument();
  });

  it("shows an empty message when there are no games", () => {
    render(<GameList title="Upcoming" games={[]} />);
    expect(screen.getByText(/no games/i)).toBeInTheDocument();
  });

  const upcoming: Game = {
    id: "u1",
    date: "2026-04-04T23:00:00Z",
    status: "scheduled",
    seasonType: "regular",
    isHome: true,
    homeTeam: { id: "13", abbreviation: "LAL" },
    awayTeam: { id: "2", abbreviation: "GSW" },
  };

  it("shows the game time when showTime is set", () => {
    render(<GameList title="Upcoming" games={[upcoming]} showTime />);
    const expected = new Date(upcoming.date).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
    expect(screen.getByText(new RegExp(expected.replace(/\s/g, "\\s")))).toBeInTheDocument();
  });

  it("omits the time by default", () => {
    render(<GameList title="Upcoming" games={[upcoming]} />);
    expect(screen.queryByText(/\d?\d:\d\d/)).toBeNull();
  });

  it("renders a competition badge when the game is competition-tagged", () => {
    const tagged: Game = {
      ...upcoming,
      competition: { shortName: "UCL", name: "UEFA Champions League", primary: false },
    };
    render(<GameList title="Upcoming" games={[tagged]} />);
    const badge = screen.getByText("UCL");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute("title", "UEFA Champions League");
  });

  it("omits the badge when the game has no competition", () => {
    render(<GameList title="Upcoming" games={[upcoming]} />);
    expect(screen.queryByText("UCL")).toBeNull();
  });

  const lakers: Team = { id: "13", leagueId: "nba", name: "Los Angeles Lakers", abbreviation: "LAL" };

  it("renders per-game YouTube and Reddit links when a team is passed", () => {
    render(<GameList title="Past" games={[past]} team={lakers} />);
    const yt = screen.getByRole("link", { name: /highlights on YouTube/i });
    expect(yt).toHaveAttribute("href", expect.stringContaining("youtube.com"));
    const reddit = screen.getByRole("link", { name: /on Reddit/i });
    expect(reddit).toHaveAttribute("href", expect.stringContaining("reddit.com"));
  });

  it("renders no per-game links when no team is passed", () => {
    render(<GameList title="Past" games={[past]} />);
    expect(screen.queryByRole("link")).toBeNull();
  });
});
