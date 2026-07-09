import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { GameList } from "./GameList";
import type { Game } from "../domain/types";

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
});
