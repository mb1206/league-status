import { useState } from "react";
import { Header } from "./components/Header";
import { TeamPanelList } from "./components/TeamPanelList";
import { AddTeamDialog } from "./components/AddTeamDialog";
import { useFollowedTeams } from "./hooks/useFollowedTeams";

export default function App() {
  const { followed, add, remove } = useFollowedTeams();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="app">
      <Header onAddClick={() => setDialogOpen(true)} />
      <main>
        <TeamPanelList teams={followed} onRemove={remove} />
      </main>
      {dialogOpen && (
        <AddTeamDialog onAdd={add} onClose={() => setDialogOpen(false)} />
      )}
    </div>
  );
}
