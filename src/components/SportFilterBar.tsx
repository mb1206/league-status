import { listLeagues } from "../leagues/registry";

interface SportFilterBarProps {
  followedLeagueIds: string[];
  activeLeague: string | null;
  onSelect: (leagueId: string | null) => void;
}

export function SportFilterBar({
  followedLeagueIds,
  activeLeague,
  onSelect,
}: SportFilterBarProps) {
  const followed = new Set(followedLeagueIds);
  // Registry order gives a stable chip order regardless of follow order.
  const sports = listLeagues().filter((c) => followed.has(c.id));

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
          className="sport-chip"
          aria-pressed={activeLeague === c.id}
          onClick={() => onSelect(c.id)}
        >
          {c.icon} {c.displayName}
        </button>
      ))}
    </nav>
  );
}
