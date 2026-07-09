import { describe, expect, it, vi, afterEach } from "vitest";
import { createEspnAdapter } from "./adapter";
import type { LeagueConfig } from "../../domain/types";

const config: LeagueConfig = {
  id: "nba",
  sport: "basketball",
  league: "nba",
  displayName: "NBA",
  icon: "🏀",
};

function mockFetchOnce(payload: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, json: async () => payload }),
  );
}

describe("createEspnAdapter", () => {
  afterEach(() => vi.restoreAllMocks());

  it("fetchTeam returns mapped team and raw standing", async () => {
    mockFetchOnce({
      team: {
        id: "13",
        displayName: "Los Angeles Lakers",
        abbreviation: "LAL",
        logos: [{ href: "https://logo/lal.png" }],
        record: { items: [{ summary: "53-29" }] },
      },
      standingSummary: "1st in Pacific Division",
    });
    const adapter = createEspnAdapter(config);
    const { team, standing } = await adapter.fetchTeam("13");
    expect(team.name).toBe("Los Angeles Lakers");
    expect(team.leagueId).toBe("nba");
    expect(standing).toEqual({
      recordSummary: "53-29",
      standingSummaryText: "1st in Pacific Division",
    });
  });

  it("fetchSchedule maps events relative to the followed team", async () => {
    mockFetchOnce({
      events: [
        {
          id: "401",
          date: "2026-04-01T02:30Z",
          seasonType: { type: 2 },
          competitions: [
            {
              status: { type: { state: "post" } },
              competitors: [
                {
                  homeAway: "home",
                  winner: true,
                  score: { value: 112 },
                  team: { id: "13", abbreviation: "LAL" },
                },
                {
                  homeAway: "away",
                  winner: false,
                  score: { value: 104 },
                  team: { id: "2", abbreviation: "BOS" },
                },
              ],
            },
          ],
        },
      ],
    });
    const adapter = createEspnAdapter(config);
    const games = await adapter.fetchSchedule("13");
    expect(games).toHaveLength(1);
    expect(games[0]).toMatchObject({ isHome: true, result: "W" });
  });

  // ESPN's /teams list endpoint is not CORS-enabled, so search filters bundled
  // reference data (src/leagues/teamsData.ts) client-side — no network fetch.
  it("searchTeams filters bundled team data without any network fetch", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const adapter = createEspnAdapter(config);

    const results = await adapter.searchTeams("laker");
    expect(results).toHaveLength(1);
    expect(results[0].abbreviation).toBe("LAL");
    expect(results[0].leagueId).toBe("nba");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("searchTeams returns all teams for an empty query", async () => {
    const adapter = createEspnAdapter(config);
    const results = await adapter.searchTeams("");
    expect(results).toHaveLength(30); // all NBA teams
  });
});
