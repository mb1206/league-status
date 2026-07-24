import { describe, expect, it, vi, afterEach } from "vitest";
import { createEspnAdapter } from "./adapter";
import type { LeagueConfig } from "../../domain/types";

const config: LeagueConfig = {
  id: "nba",
  sport: "basketball",
  league: "nba",
  displayName: "NBA",
  icon: "🏀",
  hasPlayoffs: true,
};

function mockFetchOnce(payload: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, json: async () => payload }),
  );
}

// Route fetch responses by URL substring. A value of `null` simulates a failed
// (non-ok) response for that competition.
function mockFetchByUrl(routes: { match: string; payload: unknown }[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const route = routes.find((r) => url.includes(r.match));
      if (!route || route.payload === null) {
        return { ok: false, status: 404, json: async () => ({}) };
      }
      return { ok: true, json: async () => route.payload };
    }),
  );
}

function scheduleEvent(id: string, date: string, homeId: string) {
  return {
    id,
    date,
    seasonType: { type: 13481 },
    competitions: [
      {
        status: { type: { state: "pre" } },
        competitors: [
          { homeAway: "home", team: { id: homeId, abbreviation: "ARS" } },
          { homeAway: "away", team: { id: "999", abbreviation: "OPP" } },
        ],
      },
    ],
  };
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

  it("fetchSchedule skips malformed events and keeps well-formed ones", async () => {
    mockFetchOnce({
      events: [
        {
          id: "bad",
          date: "2026-04-01T02:30Z",
          seasonType: { type: 2 },
          competitions: [
            {
              status: { type: { state: "pre" } },
              competitors: [
                { homeAway: "away", team: { id: "2", abbreviation: "BOS" } },
              ],
            },
          ],
        },
        {
          id: "good",
          date: "2026-04-02T02:30Z",
          seasonType: { type: 2 },
          competitions: [
            {
              status: { type: { state: "pre" } },
              competitors: [
                { homeAway: "home", team: { id: "13", abbreviation: "LAL" } },
                { homeAway: "away", team: { id: "2", abbreviation: "BOS" } },
              ],
            },
          ],
        },
      ],
    });
    const adapter = createEspnAdapter(config);
    const games = await adapter.fetchSchedule("13");
    expect(games.map((g) => g.id)).toEqual(["good"]);
  });

  it("fetchSchedule fans out across competitions, tags badges, merges by date, and drops empties", async () => {
    const eplConfig: LeagueConfig = {
      id: "epl",
      sport: "soccer",
      league: "eng.1",
      displayName: "Premier League",
      icon: "⚽",
      hasPlayoffs: false,
      competitions: [
        { slug: "eng.1", shortName: "PL", name: "Premier League", primary: true },
        { slug: "uefa.champions", shortName: "UCL", name: "UEFA Champions League" },
        { slug: "eng.fa", shortName: "FA CUP", name: "FA Cup" },
      ],
    };
    mockFetchByUrl([
      // Chronologically the UCL game is first, so a correct merge reorders it ahead
      // of the later PL game even though PL is fetched first.
      { match: "eng.1", payload: { events: [scheduleEvent("pl1", "2026-03-10T15:00Z", "359")] } },
      { match: "uefa.champions", payload: { events: [scheduleEvent("ucl1", "2026-03-05T20:00Z", "359")] } },
      { match: "eng.fa", payload: { events: [] } }, // empty competition drops out
    ]);
    const adapter = createEspnAdapter(eplConfig);
    const games = await adapter.fetchSchedule("359");

    expect(games.map((g) => g.id)).toEqual(["ucl1", "pl1"]);
    expect(games.map((g) => g.competition?.shortName)).toEqual(["UCL", "PL"]);
    expect(games.find((g) => g.id === "pl1")?.competition?.primary).toBe(true);
    expect(games.find((g) => g.id === "ucl1")?.competition?.primary).toBe(false);
  });

  it("fetchSchedule ignores a competition whose request fails", async () => {
    const eplConfig: LeagueConfig = {
      id: "epl",
      sport: "soccer",
      league: "eng.1",
      displayName: "Premier League",
      icon: "⚽",
      hasPlayoffs: false,
      competitions: [
        { slug: "eng.1", shortName: "PL", name: "Premier League", primary: true },
        { slug: "uefa.champions", shortName: "UCL", name: "UEFA Champions League" },
      ],
    };
    mockFetchByUrl([
      { match: "eng.1", payload: { events: [scheduleEvent("pl1", "2026-03-10T15:00Z", "359")] } },
      { match: "uefa.champions", payload: null }, // 404 → ignored
    ]);
    const adapter = createEspnAdapter(eplConfig);
    const games = await adapter.fetchSchedule("359");
    expect(games.map((g) => g.id)).toEqual(["pl1"]);
  });

  it("fetchStandings maps the standings tree into division groups", async () => {
    mockFetchOnce({
      children: [
        {
          name: "Pacific Division",
          standings: {
            entries: [
              {
                team: { id: "13", displayName: "Los Angeles Lakers", abbreviation: "LAL" },
                stats: [{ name: "overall", displayValue: "53-29" }],
              },
            ],
          },
        },
      ],
    });
    const adapter = createEspnAdapter(config);
    const groups = await adapter.fetchStandings();
    expect(groups).toEqual([
      {
        name: "Pacific Division",
        entries: [
          {
            teamId: "13",
            name: "Los Angeles Lakers",
            abbreviation: "LAL",
            logoUrl: undefined,
            record: "53-29",
          },
        ],
      },
    ]);
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
