export interface LinkChip {
  href: string;
  label: string; // aria-label + title
  kind: "youtube" | "reddit" | "espn";
}

export interface LinkIconsProps {
  links: LinkChip[];
  className?: string;
}

const EMOJI: Record<LinkChip["kind"], string> = {
  youtube: "🎬",
  espn: "📊",
  reddit: "💬",
};

export function LinkIcons({ links, className }: LinkIconsProps) {
  if (links.length === 0) return null;
  return (
    <span className={className ? `link-icons ${className}` : "link-icons"}>
      {links.map((link) => (
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
      ))}
    </span>
  );
}
