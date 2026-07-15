import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useTeamStatus } from "./useTeamStatus";
import * as registry from "../leagues/registry";
import type { LeagueModule } from "../leagues/types";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const fakeModule = {
  config: { id: "nba", sport: "basketball", league: "nba", displayName: "NBA", icon: "🏀" },
  adapter: {
    fetchTeam: vi.fn(),
    fetchSchedule: vi.fn(),
    searchTeams: vi.fn(),
  },
  derivations: {
    standingSummary: vi.fn(() => ({ overall: "53-29" })),
    splitGames: vi.fn(() => ({ past: [], upcoming: [] })),
    seasonStatus: vi.fn(() => ({ phase: "in_season", label: "IN SEASON" })),
  },
} as unknown as LeagueModule;

describe("useTeamStatus", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("fetches team and schedule in parallel and assembles TeamStatus", async () => {
    const team = { id: "13", leagueId: "nba", name: "Lakers", abbreviation: "LAL" };
    (fakeModule.adapter.fetchTeam as ReturnType<typeof vi.fn>).mockResolvedValue({
      team,
      standing: { recordSummary: "53-29" },
    });
    (fakeModule.adapter.fetchSchedule as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    vi.spyOn(registry, "getLeagueModule").mockReturnValue(fakeModule);

    const { result } = renderHook(
      () => useTeamStatus({ leagueId: "nba", teamId: "13" }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.team.name).toBe("Lakers");
    expect(result.current.data?.seasonStatus.label).toBe("IN SEASON");
    expect(fakeModule.adapter.fetchTeam).toHaveBeenCalledWith("13");
    expect(fakeModule.adapter.fetchSchedule).toHaveBeenCalledWith("13");
  });

  it("surfaces errors (isError) when a fetch rejects", async () => {
    (fakeModule.adapter.fetchTeam as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("boom"),
    );
    (fakeModule.adapter.fetchSchedule as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    vi.spyOn(registry, "getLeagueModule").mockReturnValue(fakeModule);

    const { result } = renderHook(
      () => useTeamStatus({ leagueId: "nba", teamId: "13" }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
