import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Sidebar } from "./Sidebar";

afterEach(() => {
  cleanup();
});

describe("Sidebar", () => {
  it("renders sidebar-10 aligned sections and settings entry", () => {
    render(<Sidebar activeSection="conversations" />);

    expect(screen.queryByText("Nexa")).not.toBeInTheDocument();
    expect(screen.getByText("Ask AI")).toBeInTheDocument();
    expect(screen.getByText("全部对话")).toBeInTheDocument();
    expect(screen.getByText("全部笔记")).toBeInTheDocument();
    expect(screen.getByText("Favorites")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "设置" })).toBeInTheDocument();
  });

  it("notifies section changes", () => {
    const onSectionChange = vi.fn();
    render(<Sidebar activeSection="conversations" onSectionChange={onSectionChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Ask AI" }));
    fireEvent.click(screen.getByRole("button", { name: "全部笔记" }));

    expect(onSectionChange).toHaveBeenNthCalledWith(1, "ask-ai");
    expect(onSectionChange).toHaveBeenNthCalledWith(2, "notes");
  });
});
