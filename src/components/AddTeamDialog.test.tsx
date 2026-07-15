import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddTeamDialog } from "./AddTeamDialog";
import * as registry from "../leagues/registry";
import type { LeagueModule } from "../leagues/types";

function moduleWith(id: string, results: unknown[]): LeagueModule {
  return {
    config: { id, sport: "x", league: id, displayName: id.toUpperCase(), icon: "🏀" },
    adapter: {
      fetchTeam: vi.fn(),
      fetchSchedule: vi.fn(),
      searchTeams: vi.fn().mockResolvedValue(results),
    },
    derivations: {} as LeagueModule["derivations"],
  } as unknown as LeagueModule;
}

describe("AddTeamDialog", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("searches every league in parallel and calls onAdd with the pick", async () => {
    const nba = moduleWith("nba", [
      { id: "13", leagueId: "nba", name: "Los Angeles Lakers", abbreviation: "LAL" },
    ]);
    const nfl = moduleWith("nfl", []);
    vi.spyOn(registry, "listLeagues").mockReturnValue([nba.config, nfl.config]);
    vi.spyOn(registry, "getLeagueModule").mockImplementation((leagueId) =>
      leagueId === "nba" ? nba : nfl,
    );

    const onAdd = vi.fn();
    render(<AddTeamDialog onAdd={onAdd} onClose={() => {}} />);

    await userEvent.type(screen.getByRole("textbox"), "laker");
    await waitFor(() =>
      expect(screen.getByText(/Los Angeles Lakers/)).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByText(/Los Angeles Lakers/));
    expect(onAdd).toHaveBeenCalledWith({ leagueId: "nba", teamId: "13" });
  });

  it("closes on Escape", async () => {
    vi.spyOn(registry, "listLeagues").mockReturnValue([]);
    const onClose = vi.fn();
    render(<AddTeamDialog onAdd={() => {}} onClose={onClose} />);
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });
});
