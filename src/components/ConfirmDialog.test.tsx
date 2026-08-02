import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDialog } from "./ConfirmDialog";

function setup(overrides: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <ConfirmDialog
      message="Are you sure you want to remove Seattle Storm from your roster?"
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...overrides}
    />,
  );
  return { onConfirm, onCancel };
}

describe("ConfirmDialog", () => {
  it("shows the message and confirm/cancel actions", () => {
    setup();
    expect(screen.getByText(/remove Seattle Storm from your roster/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("centers the dialog on the page via the centered backdrop modifier", () => {
    setup();
    const backdrop = screen.getByRole("alertdialog").parentElement!;
    expect(backdrop).toHaveClass("dialog-backdrop", "centered");
  });

  it("calls onConfirm when Remove is clicked", async () => {
    const { onConfirm, onCancel } = setup();
    await userEvent.setup().click(screen.getByRole("button", { name: "Remove" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("calls onCancel on Cancel, Escape, and backdrop click", async () => {
    const { onConfirm, onCancel } = setup();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);

    await user.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledTimes(2);

    await user.click(screen.getByRole("alertdialog").parentElement!);
    expect(onCancel).toHaveBeenCalledTimes(3);

    expect(onConfirm).not.toHaveBeenCalled();
  });
});
