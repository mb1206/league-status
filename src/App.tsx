import { useState } from "react";
import { Header } from "./components/Header";
import { SportFilterBar } from "./components/SportFilterBar";
import { TeamPanelList } from "./components/TeamPanelList";
import { AddTeamDialog } from "./components/AddTeamDialog";
import { useFollowedTeams } from "./hooks/useFollowedTeams";
import { useInSeasonLeagues } from "./hooks/useInSeasonLeagues";
import { WeekBanner } from "./components/WeekBanner";
import { useUpcomingWeek } from "./hooks/useUpcomingWeek";

export default function App() {
  const { followed, add, remove } = useFollowedTeams();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeLeague, setActiveLeague] = useState<string | null>(null);
  const inSeasonLeagues = useInSeasonLeagues(followed);
  const week = useUpcomingWeek(followed);

  return (
    <div className="app">
      <Header onAddClick={() => setDialogOpen(true)} />
      <SportFilterBar
        followedLeagueIds={followed.map((t) => t.leagueId)}
        activeLeague={activeLeague}
        inSeasonLeagues={inSeasonLeagues}
        onSelect={setActiveLeague}
        onAddSport={() => setDialogOpen(true)}
      />
      {followed.length > 0 && (
        <WeekBanner groups={week} activeLeague={activeLeague} />
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
    </div>
  );
}
