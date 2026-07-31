interface HeaderProps {
  onAddClick: () => void;
  onAddSampleTeams: () => void;
}

export function Header({ onAddClick, onAddSampleTeams }: HeaderProps) {
  return (
    <header className="app-header">
      <h1>track my teamzzz</h1>
      <div className="app-header-actions">
        <button
          className="debug-teams-btn"
          aria-label="Add sample teams"
          title="Add sample teams"
          onClick={onAddSampleTeams}
        >
          🫧
        </button>
        <button className="add-team-btn" onClick={onAddClick}>
          + Add team
        </button>
      </div>
    </header>
  );
}
