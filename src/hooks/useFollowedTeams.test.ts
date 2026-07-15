import { describe, expect, it, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useFollowedTeams } from "./useFollowedTeams";

describe("useFollowedTeams", () => {
  beforeEach(() => localStorage.clear());

  it("starts empty and adds a team", () => {
    const { result } = renderHook(() => useFollowedTeams());
    expect(result.current.followed).toEqual([]);
    act(() => result.current.add({ leagueId: "nba", teamId: "13" }));
    expect(result.current.followed).toEqual([
      { leagueId: "nba", teamId: "13" },
    ]);
  });

  it("does not add duplicates", () => {
    const { result } = renderHook(() => useFollowedTeams());
    act(() => result.current.add({ leagueId: "nba", teamId: "13" }));
    act(() => result.current.add({ leagueId: "nba", teamId: "13" }));
    expect(result.current.followed).toHaveLength(1);
  });

  it("removes a team", () => {
    const { result } = renderHook(() => useFollowedTeams());
    act(() => result.current.add({ leagueId: "nba", teamId: "13" }));
    act(() => result.current.remove({ leagueId: "nba", teamId: "13" }));
    expect(result.current.followed).toEqual([]);
  });

  it("persists to localStorage", () => {
    const { result } = renderHook(() => useFollowedTeams());
    act(() => result.current.add({ leagueId: "nba", teamId: "13" }));
    expect(localStorage.getItem("league-status:followed")).toContain("13");
  });
});
