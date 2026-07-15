import { describe, expect, it } from "vitest";
import {
  parseScore,
  mapTeam,
  mapStanding,
  mapGame,
  mapStandings,
} from "./mappers";
import type { EspnEvent, EspnStandingsResponse, EspnTeamResponse } from "./client";

describe("parseScore", () => {
  it("handles number, string, object, and missing", () => {
    expect(parseScore(112)).toBe(112);
    expect(parseScore("104")).toBe(104);
    expect(parseScore({ value: 98 })).toBe(98);
    expect(parseScore(undefined)).toBeUndefined();
  });
});

const teamResponse: EspnTeamResponse = {
  team: {
    id: "13",
    displayName: "Los Angeles Lakers",
    abbreviation: "LAL",
    logos: [{ href: "https://logo/lal.png" }],
    record: { items: [{ summary: "53-29" }] },
    standingSummary: "1st in Pacific Division",
  },
};

describe("mapTeam", () => {
  it("maps team meta into domain Team", () => {
    expect(mapTeam(teamResponse, "nba")).toEqual({
      id: "13",
      leagueId: "nba",
      name: "Los Angeles Lakers",
      abbreviation: "LAL",
      logoUrl: "https://logo/lal.png",
    });
  });
});

describe("mapStandings", () => {
  it("flattens conference→division groups into leaf divisions with ranked entries", () => {
    const res: EspnStandingsResponse = {
      children: [
        {
          name: "American Football Conference",
          children: [
            {
              name: "AFC South",
              standings: {
                entries: [
                  {
                    team: {
                      id: "10",
                      displayName: "Houston Texans",
                      abbreviation: "HOU",
                      logos: [{ href: "https://logo/hou.png" }],
                    },
                    stats: [{ name: "overall", displayValue: "9-4" }],
                  },
                  {
                    team: { id: "34", displayName: "Tennessee Titans", abbreviation: "TEN" },
                    stats: [{ name: "overall", displayValue: "3-10" }],
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    expect(mapStandings(res)).toEqual([
      {
        name: "AFC South",
        entries: [
          {
            teamId: "10",
            name: "Houston Texans",
            abbreviation: "HOU",
            logoUrl: "https://logo/hou.png",
            record: "9-4",
          },
          {
            teamId: "34",
            name: "Tennessee Titans",
            abbreviation: "TEN",
            logoUrl: undefined,
            record: "3-10",
          },
        ],
      },
    ]);
  });

  it("treats a conference with no sub-divisions as its own leaf group (e.g. WNBA)", () => {
    const res: EspnStandingsResponse = {
      children: [
        {
          name: "Western Conference",
          standings: {
            entries: [
              {
                team: { id: "14", displayName: "Seattle Storm", abbreviation: "SEA" },
                stats: [{ name: "overall", displayValue: "6-19" }],
              },
            ],
          },
        },
      ],
    };
    const groups = mapStandings(res);
    expect(groups).toHaveLength(1);
    expect(groups[0].name).toBe("Western Conference");
    expect(groups[0].entries[0].teamId).toBe("14");
  });
});

describe("mapStanding", () => {
  it("extracts record summary and standing text", () => {
    expect(mapStanding(teamResponse)).toEqual({
      recordSummary: "53-29",
      standingSummaryText: "1st in Pacific Division",
    });
  });

  it("falls back to top-level standingSummary when team-level is absent", () => {
    const res: EspnTeamResponse = {
      team: {
        id: "13",
        displayName: "Los Angeles Lakers",
        abbreviation: "LAL",
        record: { items: [{ summary: "53-29" }] },
      },
      standingSummary: "1st in Pacific Division",
    };
    expect(mapStanding(res)).toEqual({
      recordSummary: "53-29",
      standingSummaryText: "1st in Pacific Division",
    });
  });

  it("returns undefined standingSummaryText when neither field is present", () => {
    const res: EspnTeamResponse = {
      team: {
        id: "13",
        displayName: "Los Angeles Lakers",
        abbreviation: "LAL",
        record: { items: [{ summary: "53-29" }] },
      },
    };
    expect(mapStanding(res).standingSummaryText).toBeUndefined();
  });
});

const finalEvent: EspnEvent = {
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
};

describe("mapGame", () => {
  it("maps a final home win relative to followed team 13", () => {
    const g = mapGame(finalEvent, "13");
    expect(g).toMatchObject({
      id: "401",
      status: "final",
      seasonType: "regular",
      isHome: true,
      result: "W",
      homeTeam: { id: "13", abbreviation: "LAL", score: 112 },
      awayTeam: { id: "2", abbreviation: "BOS", score: 104 },
    });
  });

  it("marks postseason and away loss relative to team 2", () => {
    const post: EspnEvent = {
      ...finalEvent,
      seasonType: { type: 3 },
    };
    const g = mapGame(post, "2");
    expect(g.seasonType).toBe("postseason");
    expect(g.isHome).toBe(false);
    expect(g.result).toBe("L");
  });

  it("has no result for a scheduled game", () => {
    const scheduled: EspnEvent = {
      id: "500",
      date: "2026-11-01T02:30Z",
      seasonType: { type: 2 },
      competitions: [
        {
          status: { type: { state: "pre" } },
          competitors: [
            { homeAway: "home", team: { id: "13", abbreviation: "LAL" } },
            { homeAway: "away", team: { id: "9", abbreviation: "GSW" } },
          ],
        },
      ],
    };
    const g = mapGame(scheduled, "13");
    expect(g.status).toBe("scheduled");
    expect(g.result).toBeUndefined();
  });
});
