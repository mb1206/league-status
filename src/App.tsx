import { useState } from "react";
import { Header } from "./components/Header";
import { SportFilterBar } from "./components/SportFilterBar";
import { TeamPanelList } from "./components/TeamPanelList";
import { AddTeamDialog } from "./components/AddTeamDialog";
import { CalendarModal } from "./components/CalendarModal";
import { useFollowedTeams } from "./hooks/useFollowedTeams";
import { useInSeasonLeagues } from "./hooks/useInSeasonLeagues";
import { WeekBanner } from "./components/WeekBanner";
import { useUpcomingWeek } from "./hooks/useUpcomingWeek";
import type { FollowedTeam } from "./hooks/useFollowedTeams";

// Debug helper: a fixed sample roster across every supported league, loaded by
// the 🫧 button next to "Add team". IDs come from the bundled teamsData.ts.
const SAMPLE_TEAMS: FollowedTeam[] = [
  { leagueId: "wnba", teamId: "9" }, // New York Liberty
  { leagueId: "wnba", teamId: "14" }, // Seattle Storm
  { leagueId: "mlb", teamId: "21" }, // New York Mets
  { leagueId: "epl", teamId: "384" }, // Crystal Palace
  { leagueId: "nba", teamId: "18" }, // New York Knicks
  { leagueId: "nfl", teamId: "25" }, // San Francisco 49ers
  { leagueId: "nfl", teamId: "10" }, // Tennessee Titans
  { leagueId: "nhl", teamId: "11" }, // New Jersey Devils
  { leagueId: "nhl", teamId: "18" }, // San Jose Sharks
  { leagueId: "mls", teamId: "190" }, // Red Bull New York
];

export default function App() {
  const { followed, add, remove } = useFollowedTeams();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [activeLeague, setActiveLeague] = useState<string | null>(null);
  const inSeasonLeagues = useInSeasonLeagues(followed);
  const week = useUpcomingWeek(followed);

  return (
    <div className="app">
      <Header
        onAddClick={() => setDialogOpen(true)}
        onAddSampleTeams={() => SAMPLE_TEAMS.forEach(add)}
      />
      <SportFilterBar
        followedLeagueIds={followed.map((t) => t.leagueId)}
        activeLeague={activeLeague}
        inSeasonLeagues={inSeasonLeagues}
        onSelect={setActiveLeague}
        onAddSport={() => setDialogOpen(true)}
      />
      {followed.length > 0 && (
        <WeekBanner
          groups={week}
          activeLeague={activeLeague}
          onOpenCalendar={() => setCalendarOpen(true)}
        />
      )}
      <main>
        <TeamPanelList
          teams={followed}
          activeLeague={activeLeague}
          inSeasonLeagues={inSeasonLeagues}
          onRemove={remove}
        />
      </main>
      {dialogOpen && (
        <AddTeamDialog onAdd={add} onClose={() => setDialogOpen(false)} />
      )}
      {calendarOpen && (
        <CalendarModal followed={followed} onClose={() => setCalendarOpen(false)} />
      )}
    </div>
  );
}
