import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Sidebar } from "./Sidebar";

afterEach(() => {
  cleanup();
});

describe("Sidebar", () => {
  it("renders navigation items", () => {
    render(<Sidebar manualTags={["文献综述"]} autoTags={["方法学"]} />);

    expect(screen.getByText("全部对话")).toBeInTheDocument();
    expect(screen.getByText("自动标签")).toBeInTheDocument();
    expect(screen.getByLabelText("标签示例")).toBeInTheDocument();
    expect(screen.getByText("文献综述")).toBeInTheDocument();
    expect(screen.getByText("方法学")).toBeInTheDocument();
  });

  it("renders search results and handles result click", () => {
    const onSelectSearchResult = vi.fn();
    const onSelectNoteResult = vi.fn();
    const onAddManualTag = vi.fn();
    const onRemoveManualTag = vi.fn();
    const onRemoveAutoTag = vi.fn();

    render(
      <Sidebar
        searchQuery="方法"
        searchResults={[
          {
            id: "result-1",
            nodeId: "node-1",
            messageId: "m-1",
            nodeTitle: "方法分支",
            role: "assistant",
            snippet: "可以按方法、数据、结论三个层面逐步对照。"
          }
        ]}
        noteResults={[
          {
            noteId: "note-1",
            title: "方法笔记",
            snippet: "记录方法对照逻辑",
            sourceNodeId: "node-1",
            sourceMessageId: "m-1",
            createdAt: "2025-01-01T00:00:00.000Z"
          }
        ]}
        manualTags={["文献综述"]}
        autoTags={["方法学"]}
        onSelectSearchResult={onSelectSearchResult}
        onSelectNoteResult={onSelectNoteResult}
        onAddManualTag={onAddManualTag}
        onRemoveManualTag={onRemoveManualTag}
        onRemoveAutoTag={onRemoveAutoTag}
      />
    );

    const desktopSidebar = screen.getAllByTestId("sidebar-desktop")[0];
    const sidebarView = within(desktopSidebar);

    expect(sidebarView.getByText("对话命中")).toBeInTheDocument();
    expect(sidebarView.getByText("笔记命中")).toBeInTheDocument();

    fireEvent.click(sidebarView.getByRole("button", { name: /方法分支/ }));
    expect(onSelectSearchResult).toHaveBeenCalledTimes(1);
    expect(onSelectSearchResult.mock.calls[0][0]).toMatchObject({
      nodeId: "node-1",
      messageId: "m-1"
    });

    fireEvent.click(sidebarView.getByRole("button", { name: /方法笔记/ }));
    expect(onSelectNoteResult).toHaveBeenCalledTimes(1);
    expect(onSelectNoteResult.mock.calls[0][0]).toMatchObject({
      noteId: "note-1",
      sourceNodeId: "node-1"
    });

    fireEvent.change(sidebarView.getByLabelText("新增手动标签"), {
      target: { value: "研究方法" }
    });
    fireEvent.click(sidebarView.getByRole("button", { name: "添加" }));
    expect(onAddManualTag).toHaveBeenCalledWith("研究方法");

    fireEvent.click(sidebarView.getByRole("button", { name: "删除手动标签 文献综述" }));
    expect(onRemoveManualTag).toHaveBeenCalledWith("文献综述");

    fireEvent.click(sidebarView.getByRole("button", { name: "删除系统标签 方法学" }));
    expect(onRemoveAutoTag).toHaveBeenCalledWith("方法学");
  });

  it("shows search error state", () => {
    render(<Sidebar searchQuery="方法" searchError="搜索失败，请稍后重试。" />);

    const desktopSidebar = screen.getAllByTestId("sidebar-desktop")[0];
    const sidebarView = within(desktopSidebar);
    expect(sidebarView.getByText("搜索失败，请稍后重试。")).toBeInTheDocument();
  });
});
