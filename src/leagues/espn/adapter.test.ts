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

  it("searchTeams filters the teams list case-insensitively", async () => {
    mockFetchOnce({
      sports: [
        {
          leagues: [
            {
              teams: [
                {
                  team: {
                    id: "13",
                    displayName: "Los Angeles Lakers",
                    abbreviation: "LAL",
                    logos: [{ href: "https://logo/lal.png" }],
                  },
                },
                {
                  team: {
                    id: "2",
                    displayName: "Boston Celtics",
                    abbreviation: "BOS",
                    logos: [{ href: "https://logo/bos.png" }],
                  },
                },
              ],
            },
          ],
        },
      ],
    });
    const adapter = createEspnAdapter(config);
    const results = await adapter.searchTeams("laker");
    expect(results).toHaveLength(1);
    expect(results[0].abbreviation).toBe("LAL");
  });
});
