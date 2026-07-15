import { useCallback, useEffect, useState } from "react";

export interface FollowedTeam {
  leagueId: string;
  teamId: string;
}

const STORAGE_KEY = "league-status:followed";

function load(): FollowedTeam[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as FollowedTeam[]) : [];
  } catch {
    return [];
  }
}

function sameTeam(a: FollowedTeam, b: FollowedTeam): boolean {
  return a.leagueId === b.leagueId && a.teamId === b.teamId;
}

export function useFollowedTeams() {
  const [followed, setFollowed] = useState<FollowedTeam[]>(load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(followed));
  }, [followed]);

  const add = useCallback((team: FollowedTeam) => {
    setFollowed((prev) =>
      prev.some((t) => sameTeam(t, team)) ? prev : [...prev, team],
    );
  }, []);

  const remove = useCallback((team: FollowedTeam) => {
    setFollowed((prev) => prev.filter((t) => !sameTeam(t, team)));
  }, []);

  return { followed, add, remove };
}
