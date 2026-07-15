import { listLeagues } from "../leagues/registry";

interface SportFilterBarProps {
  followedLeagueIds: string[];
  activeLeague: string | null;
  inSeasonLeagues?: Set<string>;
  onSelect: (leagueId: string | null) => void;
}

export function SportFilterBar({
  followedLeagueIds,
  activeLeague,
  inSeasonLeagues = new Set(),
  onSelect,
}: SportFilterBarProps) {
  const followed = new Set(followedLeagueIds);
  // Registry order gives a stable chip order; then float in-season sports to the
  // front (stable within each group).
  const sports = listLeagues()
    .filter((c) => followed.has(c.id))
    .sort(
      (a, b) =>
        Number(inSeasonLeagues.has(b.id)) - Number(inSeasonLeagues.has(a.id)),
    );

  if (sports.length <= 1) return null;

  return (
    <nav className="sport-filter-bar" aria-label="Filter teams by sport">
      <button
        className="sport-chip"
        aria-pressed={activeLeague === null}
        onClick={() => onSelect(null)}
      >
        All
      </button>
      {sports.map((c) => (
        <button
          key={c.id}
          className={`sport-chip${inSeasonLeagues.has(c.id) ? "" : " out-of-season"}`}
          aria-pressed={activeLeague === c.id}
          onClick={() => onSelect(c.id)}
        >
          {c.icon} {c.displayName}
        </button>
      ))}
    </nav>
  );
}
