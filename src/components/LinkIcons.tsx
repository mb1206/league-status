import type { ReactNode } from "react";

export interface LinkChip {
  href: string;
  label: string; // aria-label + title
  kind: "youtube" | "reddit" | "espn";
}

export interface LinkIconsProps {
  links: LinkChip[];
  className?: string;
}

function chipGlyph(kind: LinkChip["kind"]): ReactNode {
  switch (kind) {
    case "youtube":
      return (
        <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
          <rect width="20" height="20" rx="5" fill="#CC0000" />
          <path d="M8 6.5l5 3.5-5 3.5z" fill="#fff" />
        </svg>
      );
    case "espn":
      return (
        <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
          <rect width="20" height="20" rx="5" fill="#CC0000" />
          <text
            x="10"
            y="14.5"
            textAnchor="middle"
            fontSize="12"
            fontWeight="700"
            fontFamily="Arial, sans-serif"
            fill="#fff"
          >
            E
          </text>
        </svg>
      );
    case "reddit":
      return (
        <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
          <rect width="20" height="20" rx="5" fill="#FF4500" />
          <circle cx="10" cy="11" r="4.6" fill="#fff" />
          <circle cx="8.2" cy="10.6" r="0.9" fill="#FF4500" />
          <circle cx="11.8" cy="10.6" r="0.9" fill="#FF4500" />
          <circle cx="14" cy="6" r="1.4" fill="#fff" />
        </svg>
      );
  }
}

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
          {chipGlyph(link.kind)}
        </a>
      ))}
    </span>
  );
}
