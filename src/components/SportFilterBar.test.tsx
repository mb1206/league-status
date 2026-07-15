import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SportFilterBar } from "./SportFilterBar";

describe("SportFilterBar", () => {
  it("renders an 'All' chip plus one deduped chip per followed sport in registry order", () => {
    render(
      <SportFilterBar
        followedLeagueIds={["nfl", "nba", "nba"]}
        activeLeague={null}
        onSelect={() => {}}
      />,
    );
    const labels = screen.getAllByRole("button").map((b) => b.textContent);
    expect(labels).toEqual(["All", "🏀 NBA", "🏈 NFL"]);
  });

  it("calls onSelect with the league id when a sport chip is clicked", async () => {
    const onSelect = vi.fn();
    render(
      <SportFilterBar
        followedLeagueIds={["nba", "nfl"]}
        activeLeague={null}
        onSelect={onSelect}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "🏈 NFL" }));
    expect(onSelect).toHaveBeenCalledWith("nfl");
  });

  it("calls onSelect with null when 'All' is clicked", async () => {
    const onSelect = vi.fn();
    render(
      <SportFilterBar
        followedLeagueIds={["nba", "nfl"]}
        activeLeague="nba"
        onSelect={onSelect}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "All" }));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it("marks the active league's chip as pressed", () => {
    render(
      <SportFilterBar
        followedLeagueIds={["nba", "nfl"]}
        activeLeague="nfl"
        onSelect={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "🏈 NFL" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("sorts in-season sports ahead of out-of-season ones", () => {
    render(
      <SportFilterBar
        followedLeagueIds={["nba", "nfl"]}
        inSeasonLeagues={new Set(["nfl"])}
        activeLeague={null}
        onSelect={() => {}}
      />,
    );
    const labels = screen.getAllByRole("button").map((b) => b.textContent);
    expect(labels).toEqual(["All", "🏈 NFL", "🏀 NBA"]);
  });

  it("marks out-of-season sports' chips as grayed out", () => {
    render(
      <SportFilterBar
        followedLeagueIds={["nba", "nfl"]}
        inSeasonLeagues={new Set(["nfl"])}
        activeLeague={null}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "🏀 NBA" }).className).toContain(
      "out-of-season",
    );
    expect(
      screen.getByRole("button", { name: "🏈 NFL" }).className,
    ).not.toContain("out-of-season");
  });

  it("renders nothing when one or fewer sports are followed", () => {
    const { container } = render(
      <SportFilterBar
        followedLeagueIds={["nba", "nba"]}
        activeLeague={null}
        onSelect={() => {}}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
