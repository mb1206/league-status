import { describe, expect, it } from "vitest";
import {
  parseScore,
  parseStandingSummary,
  mapTeam,
  mapStanding,
  mapGame,
} from "./mappers";
import type { EspnEvent, EspnTeamResponse } from "./client";

describe("parseScore", () => {
  it("handles number, string, object, and missing", () => {
    expect(parseScore(112)).toBe(112);
    expect(parseScore("104")).toBe(104);
    expect(parseScore({ value: 98 })).toBe(98);
    expect(parseScore(undefined)).toBeUndefined();
  });
});

describe("parseStandingSummary", () => {
  it("parses rank and division, stripping 'Division'", () => {
    expect(parseStandingSummary("1st in Pacific Division")).toEqual({
      divisionRank: 1,
      divisionName: "Pacific",
    });
  });
  it("parses NFL-style without 'Division'", () => {
    expect(parseStandingSummary("2nd in NFC West")).toEqual({
      divisionRank: 2,
      divisionName: "NFC West",
    });
  });
  it("returns empty object when unparseable", () => {
    expect(parseStandingSummary("")).toEqual({});
  });
});

const teamResponse: EspnTeamResponse = {
  team: {
    id: "13",
    displayName: "Los Angeles Lakers",
    abbreviation: "LAL",
    logos: [{ href: "https://logo/lal.png" }],
    record: { items: [{ summary: "53-29" }] },
  },
  standingSummary: "1st in Pacific Division",
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

describe("mapStanding", () => {
  it("extracts record summary and standing text", () => {
    expect(mapStanding(teamResponse)).toEqual({
      recordSummary: "53-29",
      standingSummaryText: "1st in Pacific Division",
    });
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
