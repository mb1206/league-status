import { listLeagues } from "../leagues/registry";
import { byInSeasonFirst } from "../hooks/useInSeasonLeagues";

interface SportFilterBarProps {
  followedLeagueIds: string[];
  activeLeague: string | null;
  inSeasonLeagues?: Set<string>;
  onSelect: (leagueId: string | null) => void;
  onAddSport?: () => void;
}

export function SportFilterBar({
  followedLeagueIds,
  activeLeague,
  inSeasonLeagues = new Set(),
  onSelect,
  onAddSport,
}: SportFilterBarProps) {
  const followed = new Set(followedLeagueIds);
  const all = listLeagues(); // registry order = stable chip order
  // Followed sports become filter chips, in-season floated to the front.
  const followedSports = all
    .filter((c) => followed.has(c.id))
    .sort(byInSeasonFirst(inSeasonLeagues, (c) => c.id));
  const unfollowedSports = all.filter((c) => !followed.has(c.id));

  // Filtering only makes sense with 2+ followed sports; the add-chips show
  // regardless as a shortcut to follow a new league.
  const showFilters = followedSports.length >= 2;
  if (!showFilters && unfollowedSports.length === 0) return null;

  return (
    <nav className="sport-filter-bar" aria-label="Filter teams by sport">
      {showFilters && (
        <>
          <button
            className="sport-chip"
            aria-pressed={activeLeague === null}
            onClick={() => onSelect(null)}
          >
            All
          </button>
          {followedSports.map((c) => (
            <button
              key={c.id}
              className={`sport-chip${inSeasonLeagues.has(c.id) ? "" : " out-of-season"}`}
              aria-pressed={activeLeague === c.id}
              onClick={() => onSelect(c.id)}
            >
              {c.icon} {c.displayName}
            </button>
          ))}
        </>
      )}
      {unfollowedSports.map((c) => (
        <button
          key={c.id}
          className="sport-chip empty"
          aria-label={`Add a ${c.displayName} team`}
          onClick={() => onAddSport?.()}
        >
          {c.icon} {c.displayName}
        </button>
      ))}
    </nav>
  );
}
