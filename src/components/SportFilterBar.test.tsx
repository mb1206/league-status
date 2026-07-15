import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SportFilterBar } from "./SportFilterBar";

describe("SportFilterBar", () => {
  // Filter chips (All + followed sports) carry aria-pressed; add-chips do not.
  const filterLabels = () =>
    screen
      .getAllByRole("button")
      .filter((b) => b.hasAttribute("aria-pressed"))
      .map((b) => b.textContent);

  it("renders an 'All' chip plus one deduped chip per followed sport in registry order", () => {
    render(
      <SportFilterBar
        followedLeagueIds={["nfl", "nba", "nba"]}
        activeLeague={null}
        onSelect={() => {}}
      />,
    );
    expect(filterLabels()).toEqual(["All", "🏀 NBA", "🏈 NFL"]);
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
    expect(filterLabels()).toEqual(["All", "🏈 NFL", "🏀 NBA"]);
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

  it("hides the filter chips (no 'All') when one or fewer sports are followed", () => {
    render(
      <SportFilterBar
        followedLeagueIds={["nba", "nba"]}
        activeLeague={null}
        onSelect={() => {}}
        onAddSport={() => {}}
      />,
    );
    expect(screen.queryByRole("button", { name: "All" })).toBeNull();
  });

  it("shows a dotted, grayed add-chip for each league with no followed team", () => {
    render(
      <SportFilterBar
        followedLeagueIds={["nba", "nfl"]}
        activeLeague={null}
        onSelect={() => {}}
        onAddSport={() => {}}
      />,
    );
    // WNBA/MLB/NHL/MLS are unfollowed → add-chips; NBA/NFL are not.
    const wnba = screen.getByRole("button", { name: "Add a WNBA team" });
    expect(wnba.className).toContain("empty");
    expect(screen.queryByRole("button", { name: "Add a NBA team" })).toBeNull();
  });

  it("invokes onAddSport when an add-chip is clicked", async () => {
    const onAddSport = vi.fn();
    render(
      <SportFilterBar
        followedLeagueIds={["nba", "nfl"]}
        activeLeague={null}
        onSelect={() => {}}
        onAddSport={onAddSport}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Add a MLB team" }));
    expect(onAddSport).toHaveBeenCalled();
  });
});
