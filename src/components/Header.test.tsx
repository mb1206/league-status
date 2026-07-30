import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Header } from "./Header";

describe("Header", () => {
  it("fires onAddClick when the Add team button is clicked", async () => {
    const onAddClick = vi.fn();
    render(<Header onAddClick={onAddClick} onAddSampleTeams={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /add team/i }));
    expect(onAddClick).toHaveBeenCalledTimes(1);
  });

  it("fires onAddSampleTeams when the 🫧 sample-teams button is clicked", async () => {
    const onAddSampleTeams = vi.fn();
    render(<Header onAddClick={vi.fn()} onAddSampleTeams={onAddSampleTeams} />);
    await userEvent.click(screen.getByRole("button", { name: /add sample teams/i }));
    expect(onAddSampleTeams).toHaveBeenCalledTimes(1);
  });
});
