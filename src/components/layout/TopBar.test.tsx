import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { TopBar } from "./TopBar";

afterEach(() => {
  cleanup();
});

describe("TopBar", () => {
  it("shows session status", () => {
    render(<TopBar />);

    expect(screen.getByText("深度研究会话")).toBeInTheDocument();
    expect(screen.getByText("自动标签已开启")).toBeInTheDocument();
  });

  it("opens overflow menu for low-frequency actions", () => {
    render(<TopBar />);

    fireEvent.click(screen.getByRole("button", { name: "更多操作" }));

    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "导出" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "设置" })).toBeInTheDocument();
  });

  it("closes overflow menu on outside click and escape", () => {
    render(<TopBar />);

    fireEvent.click(screen.getByRole("button", { name: "更多操作" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.mouseDown(window.document.body);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "更多操作" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("shows graph toggle label in compact layout", () => {
    const onToggleGraphPanel = vi.fn();
    render(
      <TopBar
        isCompactLayout
        isGraphPanelOpen={false}
        onToggleGraphPanel={onToggleGraphPanel}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "显示图谱" }));
    expect(onToggleGraphPanel).toHaveBeenCalledTimes(1);
  });

  it("supports keyboard navigation in overflow menu", async () => {
    render(<TopBar />);

    const trigger = screen.getByRole("button", { name: "更多操作" });
    fireEvent.click(trigger);

    const exportItem = screen.getByRole("menuitem", { name: "导出" });
    const settingsItem = screen.getByRole("menuitem", { name: "设置" });

    await waitFor(() => {
      expect(exportItem).toHaveFocus();
    });

    fireEvent.keyDown(screen.getByRole("menu"), { key: "ArrowDown" });
    expect(settingsItem).toHaveFocus();

    fireEvent.keyDown(screen.getByRole("menu"), { key: "ArrowUp" });
    expect(exportItem).toHaveFocus();

    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("triggers tag generation action", () => {
    const onGenerateTags = vi.fn();
    render(<TopBar onGenerateTags={onGenerateTags} />);

    fireEvent.click(screen.getByRole("button", { name: "生成标签" }));
    expect(onGenerateTags).toHaveBeenCalledTimes(1);
  });

  it("shows generating state and disables action button", () => {
    const onGenerateTags = vi.fn();
    render(<TopBar isGeneratingTags onGenerateTags={onGenerateTags} />);

    const button = screen.getByRole("button", { name: "生成标签" });
    expect(button).toBeDisabled();
    expect(screen.getByText("生成中...")).toBeInTheDocument();
  });

  it("renders error status message", () => {
    render(<TopBar tagStatusMessage="自动标签任务失败，请稍后重试。" tagStatusVariant="error" />);

    expect(screen.getByText("自动标签任务失败，请稍后重试。")).toBeInTheDocument();
  });
});
