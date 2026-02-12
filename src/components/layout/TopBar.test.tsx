import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TopBar } from "./TopBar";

afterEach(() => {
  cleanup();
});

describe("TopBar", () => {
  it("renders title with sidebar-10 nav-actions summary", () => {
    render(<TopBar title="LLM 文献对比会话" />);

    expect(screen.getByText("LLM 文献对比会话")).toBeInTheDocument();
    expect(screen.getByText("Edit Oct 08")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Favorite" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "More actions" })).toBeInTheDocument();
  });

  it("opens more menu with original english actions", () => {
    render(<TopBar title="会话标题" />);

    fireEvent.click(screen.getByRole("button", { name: "More actions" }));

    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Customize Page" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Move to Trash" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Version History" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Export" })).toBeInTheDocument();
  });

  it("supports keyboard navigation in more menu", async () => {
    render(<TopBar title="会话标题" />);

    const trigger = screen.getByRole("button", { name: "More actions" });
    fireEvent.click(trigger);

    const firstItem = screen.getByRole("menuitem", { name: "Customize Page" });
    const secondItem = screen.getByRole("menuitem", { name: "Turn into wiki" });

    await waitFor(() => {
      expect(firstItem).toHaveFocus();
    });

    fireEvent.keyDown(screen.getByRole("menu"), { key: "ArrowDown" });
    expect(secondItem).toHaveFocus();

    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
