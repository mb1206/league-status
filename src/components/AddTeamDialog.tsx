import { useEffect, useMemo, useState } from "react";
import type { Team } from "../domain/types";
import type { FollowedTeam } from "../hooks/useFollowedTeams";
import { getLeagueModule, listLeagues } from "../leagues/registry";

interface AddTeamDialogProps {
  onAdd: (team: FollowedTeam) => void;
  onClose: () => void;
}

export function AddTeamDialog({ onAdd, onClose }: AddTeamDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Team[]>([]);
  const leagues = useMemo(() => listLeagues(), []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    // Search every league in parallel; ignore leagues that error.
    Promise.all(
      leagues.map((c) =>
        getLeagueModule(c.id)
          .adapter.searchTeams(q)
          .catch(() => [] as Team[]),
      ),
    ).then((lists) => {
      if (!cancelled) setResults(lists.flat());
    });
    return () => {
      cancelled = true;
    };
  }, [query, leagues]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          type="text"
          placeholder="Search teams…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <ul className="search-results">
          {results.map((t) => (
            <li key={`${t.leagueId}:${t.id}`}>
              <button
                onClick={() => {
                  onAdd({ leagueId: t.leagueId, teamId: t.id });
                  onClose();
                }}
              >
                {t.logoUrl && <img src={t.logoUrl} alt="" width={20} height={20} />}
                {t.name} <span className="result-league">{t.leagueId.toUpperCase()}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
