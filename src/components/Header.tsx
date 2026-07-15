interface HeaderProps {
  onAddClick: () => void;
}

export function Header({ onAddClick }: HeaderProps) {
  return (
    <header className="app-header">
      <h1>track my teamzzz</h1>
      <button className="add-team-btn" onClick={onAddClick}>
        + Add team
      </button>
    </header>
  );
}
