import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TopBar } from "./TopBar";

afterEach(() => {
  cleanup();
});

describe("TopBar", () => {
  it("renders sidebar-10 aligned header actions", () => {
    render(<TopBar title="LLM 文献对比会话" />);

    expect(screen.getByText("LLM 文献对比会话")).toBeInTheDocument();
    expect(screen.getByText("Edit Oct 08")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Favorite" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "More actions" })).toBeInTheDocument();
  });

  it("toggles favorite visual state", () => {
    render(<TopBar title="会话标题" />);

    const favorite = screen.getByRole("button", { name: "Favorite" });
    expect(favorite).toHaveAttribute("aria-pressed", "false");
    expect(favorite).toHaveAttribute("data-favorited", "false");

    fireEvent.click(favorite);
    expect(favorite).toHaveAttribute("aria-pressed", "true");
    expect(favorite).toHaveAttribute("data-favorited", "true");
  });

  it("opens more menu with original english actions", () => {
    render(<TopBar title="会话标题" />);

    const trigger = screen.getByRole("button", { name: "More actions" });
    fireEvent.click(trigger);

    expect(screen.getByRole("menuitem", { name: "Customize Page" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Move to Trash" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Version History" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Export" })).toBeInTheDocument();
  });
});
