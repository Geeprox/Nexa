import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Sidebar, SidebarInset, SidebarProvider, SidebarTrigger } from "./sidebar";

afterEach(() => {
  cleanup();
});

describe("sidebar ui", () => {
  it("toggles desktop sidebar with trigger", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <div>menu</div>
        </Sidebar>
        <SidebarInset>
          <SidebarTrigger />
        </SidebarInset>
      </SidebarProvider>
    );

    const desktopSidebar = screen.getByTestId("sidebar-desktop");
    expect(desktopSidebar).toHaveAttribute("data-state", "expanded");

    fireEvent.click(screen.getByRole("button", { name: "切换侧边栏" }));
    expect(desktopSidebar).toHaveAttribute("data-state", "collapsed");
  });

  it("supports keyboard shortcut cmd/ctrl + b", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <div>menu</div>
        </Sidebar>
        <SidebarInset>content</SidebarInset>
      </SidebarProvider>
    );

    const desktopSidebar = screen.getByTestId("sidebar-desktop");
    expect(desktopSidebar).toHaveAttribute("data-state", "expanded");

    fireEvent.keyDown(window, { key: "b", ctrlKey: true });
    expect(desktopSidebar).toHaveAttribute("data-state", "collapsed");
  });
});
