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
