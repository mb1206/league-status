export interface LinkChip {
  kind: "youtube" | "reddit" | "espn" | "ics";
  label: string; // aria-label + title
  href?: string; // for link chips
  onClick?: () => void; // for action chips (rendered as a button)
}

export interface LinkIconsProps {
  links: LinkChip[];
  className?: string;
}

const EMOJI: Record<LinkChip["kind"], string> = {
  youtube: "🎬",
  espn: "📊",
  reddit: "💬",
  ics: "➕",
};

export function LinkIcons({ links, className }: LinkIconsProps) {
  if (links.length === 0) return null;
  return (
    <span className={className ? `link-icons ${className}` : "link-icons"}>
      {links.map((link) =>
        link.onClick ? (
          <button
            key={`${link.kind}:${link.label}`}
            type="button"
            className="link-chip"
            onClick={link.onClick}
            aria-label={link.label}
            title={link.label}
          >
            <span aria-hidden="true">{EMOJI[link.kind]}</span>
          </button>
        ) : (
          <a
            key={`${link.kind}:${link.href}`}
            className="link-chip"
            href={link.href}
            target="_blank"
            rel="noreferrer"
            aria-label={link.label}
            title={link.label}
          >
            <span aria-hidden="true">{EMOJI[link.kind]}</span>
          </a>
        ),
      )}
    </span>
  );
}
