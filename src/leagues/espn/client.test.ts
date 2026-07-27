import { describe, expect, it, vi, afterEach } from "vitest";
import { espnUrls, fetchJson } from "./client";

const cfg = { sport: "basketball", league: "nba" };

describe("espnUrls", () => {
  it("builds team, schedule, and teams-list urls", () => {
    const base =
      "https://site.api.espn.com/apis/site/v2/sports/basketball/nba";
    expect(espnUrls.team(cfg, "13")).toBe(`${base}/teams/13`);
    expect(espnUrls.schedule(cfg, "13")).toBe(`${base}/teams/13/schedule`);
    expect(espnUrls.teams(cfg)).toBe(`${base}/teams`);
  });

  it("builds the standings url on the core (apis/v2) base, which serves the real tree", () => {
    // The site/v2 standings path returns only a stub link, so standings must use apis/v2.
    expect(espnUrls.standings(cfg)).toBe(
      "https://site.api.espn.com/apis/v2/sports/basketball/nba/standings?level=3",
    );
  });

  it("builds the scoreboard url with a dates range", () => {
    expect(espnUrls.scoreboard({ sport: "soccer", league: "eng.1" }, "20260801-20260831")).toBe(
      "https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates=20260801-20260831",
    );
  });
});

describe("fetchJson", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns parsed json on ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ a: 1 }) }),
    );
    await expect(fetchJson("http://x")).resolves.toEqual({ a: 1 });
  });

  it("throws on non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500 }),
    );
    await expect(fetchJson("http://x")).rejects.toThrow("500");
  });
});
