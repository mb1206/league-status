import { useState } from "react";
import { Header } from "./components/Header";
import { SportFilterBar } from "./components/SportFilterBar";
import { TeamPanelList } from "./components/TeamPanelList";
import { AddTeamDialog } from "./components/AddTeamDialog";
import { useFollowedTeams } from "./hooks/useFollowedTeams";

export default function App() {
  const { followed, add, remove } = useFollowedTeams();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeLeague, setActiveLeague] = useState<string | null>(null);

  return (
    <div className="app">
      <Header onAddClick={() => setDialogOpen(true)} />
      <SportFilterBar
        followedLeagueIds={followed.map((t) => t.leagueId)}
        activeLeague={activeLeague}
        onSelect={setActiveLeague}
      />
      <main>
        <TeamPanelList
          teams={followed}
          activeLeague={activeLeague}
          onRemove={remove}
        />
      </main>
      {dialogOpen && (
        <AddTeamDialog onAdd={add} onClose={() => setDialogOpen(false)} />
      )}
    </div>
  );
}
