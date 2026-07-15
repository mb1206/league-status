import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Banner } from "./Banner";

describe("Banner", () => {
  it("shows league icon, team name, phase label, standing and record", () => {
    render(
      <Banner
        icon="🏀"
        leagueName="NBA"
        teamName="Los Angeles Lakers"
        seasonStatus={{ phase: "playoffs_upcoming", label: "PLAYOFFS IN 3 WEEKS", weeksUntilPlayoffs: 3 }}
        standing={{ overall: "53-29", summary: "1st in Pacific Division", divisionRank: 1, divisionName: "Pacific" }}
      />,
    );
    expect(screen.getByText("Los Angeles Lakers")).toBeInTheDocument();
    expect(screen.getByText("PLAYOFFS IN 3 WEEKS")).toBeInTheDocument();
    expect(screen.getByText(/1st in Pacific Division/)).toBeInTheDocument();
    expect(screen.getByText(/53-29/)).toBeInTheDocument();
  });

  it("renders the team logo image when a logoUrl is provided", () => {
    const { container } = render(
      <Banner
        icon="🏀"
        logoUrl="https://a.espncdn.com/lakers.png"
        leagueName="NBA"
        teamName="Los Angeles Lakers"
        seasonStatus={{ phase: "in_season", label: "IN SEASON" }}
        standing={{ overall: "53-29" }}
      />,
    );
    const img = container.querySelector("img.banner-logo") as HTMLImageElement | null;
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe("https://a.espncdn.com/lakers.png");
    expect(screen.queryByText("🏀")).toBeNull();
  });

  it("falls back to the league emoji when no logoUrl is provided", () => {
    const { container } = render(
      <Banner
        icon="🏀"
        leagueName="NBA"
        teamName="Los Angeles Lakers"
        seasonStatus={{ phase: "in_season", label: "IN SEASON" }}
        standing={{ overall: "53-29" }}
      />,
    );
    expect(container.querySelector("img.banner-logo")).toBeNull();
    expect(screen.getByText("🏀")).toBeInTheDocument();
  });

  const progressStatus = {
    phase: "in_season" as const,
    label: "IN SEASON",
    progress: { played: 41, total: 44, percent: 93, endDate: "2026-09-12T00:00:00Z" },
  };

  it("shows the season progress percent with 'Playoffs start' detail for a playoff league", () => {
    render(
      <Banner
        icon="🏀"
        leagueName="WNBA"
        teamName="Seattle Storm"
        hasPlayoffs
        seasonStatus={progressStatus}
        standing={{ overall: "6-19" }}
      />,
    );
    expect(screen.getByText("93%")).toBeInTheDocument();
    expect(screen.getByText(/41 of 44 games · Playoffs start/)).toBeInTheDocument();
  });

  it("uses 'Season ends' detail for a league without playoffs", () => {
    render(
      <Banner
        icon="🏀"
        leagueName="TestLeague"
        teamName="Some Team"
        seasonStatus={progressStatus}
        standing={{ overall: "6-19" }}
      />,
    );
    expect(screen.getByText(/41 of 44 games · Season ends/)).toBeInTheDocument();
  });

  it("omits progress when the season status has none", () => {
    render(
      <Banner
        icon="🏀"
        leagueName="NBA"
        teamName="Lakers"
        seasonStatus={{ phase: "offseason", label: "OFF SEASON" }}
        standing={{ overall: "0-0" }}
      />,
    );
    expect(screen.queryByText(/%/)).toBeNull();
  });

  it("applies a phase-specific data attribute for styling", () => {
    const { container } = render(
      <Banner
        icon="🏀"
        leagueName="NBA"
        teamName="Lakers"
        seasonStatus={{ phase: "offseason", label: "OFF SEASON" }}
        standing={{ overall: "0-0" }}
      />,
    );
    expect(container.querySelector('[data-phase="offseason"]')).not.toBeNull();
  });
});
