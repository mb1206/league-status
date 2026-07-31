import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LinkIcons } from "./LinkIcons";
import type { LinkChip } from "./LinkIcons";

const links: LinkChip[] = [
  { kind: "espn", href: "https://espn.example/team", label: "Lakers on ESPN" },
  { kind: "youtube", href: "https://yt.example/search", label: "Lakers highlights on YouTube" },
];

describe("LinkIcons", () => {
  it("renders one link per chip with href, aria-label, target and rel", () => {
    render(<LinkIcons links={links} />);
    const espn = screen.getByRole("link", { name: "Lakers on ESPN" });
    expect(espn).toHaveAttribute("href", "https://espn.example/team");
    expect(espn).toHaveAttribute("target", "_blank");
    expect(espn).toHaveAttribute("rel", "noreferrer");
    expect(espn).toHaveAttribute("title", "Lakers on ESPN");
    expect(screen.getByRole("link", { name: "Lakers highlights on YouTube" })).toBeInTheDocument();
  });

  it("renders the emoji glyph for each kind", () => {
    render(
      <LinkIcons
        links={[
          { kind: "espn", href: "#e", label: "ESPN" },
          { kind: "youtube", href: "#y", label: "YouTube" },
          { kind: "reddit", href: "#r", label: "Reddit" },
        ]}
      />,
    );
    expect(screen.getByRole("link", { name: "ESPN" })).toHaveTextContent("📊");
    expect(screen.getByRole("link", { name: "YouTube" })).toHaveTextContent("🎬");
    expect(screen.getByRole("link", { name: "Reddit" })).toHaveTextContent("💬");
  });

  it("renders nothing when there are no links", () => {
    const { container } = render(<LinkIcons links={[]} />);
    expect(container.querySelector(".link-icons")).toBeNull();
  });

  it("applies an extra className to the wrapper", () => {
    const { container } = render(<LinkIcons links={links} className="game-links" />);
    expect(container.querySelector(".link-icons.game-links")).not.toBeNull();
  });

  it("renders an action chip as a button that fires onClick", async () => {
    const onClick = vi.fn();
    render(<LinkIcons links={[{ kind: "ics", label: "Add to calendar", onClick }]} />);
    const btn = screen.getByRole("button", { name: "Add to calendar" });
    expect(btn).toHaveTextContent("➕");
    expect(screen.queryByRole("link")).toBeNull();
    await userEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
