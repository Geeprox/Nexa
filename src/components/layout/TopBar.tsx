"use client";

import { LayoutPanelLeft, MoreHorizontal, Settings, Share2, Wand2 } from "lucide-react";
import { KeyboardEvent as ReactKeyboardEvent, useEffect, useRef, useState } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface TopBarProps {
  isCompactLayout?: boolean;
  isGraphPanelOpen?: boolean;
  isGeneratingTags?: boolean;
  tagStatusMessage?: string;
  tagStatusVariant?: "default" | "error";
  onToggleGraphPanel?: () => void;
  onGenerateTags?: () => void;
}

export function TopBar({
  isCompactLayout = false,
  isGraphPanelOpen = true,
  isGeneratingTags = false,
  tagStatusMessage = "自动标签已开启",
  tagStatusVariant = "default",
  onToggleGraphPanel,
  onGenerateTags
}: TopBarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const menuItemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const rafId = window.requestAnimationFrame(() => {
      menuItemRefs.current[0]?.focus();
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
        menuTriggerRef.current?.focus();
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  const focusMenuItem = (index: number) => {
    const count = menuItemRefs.current.length;
    if (count === 0) {
      return;
    }

    const nextIndex = ((index % count) + count) % count;
    menuItemRefs.current[nextIndex]?.focus();
  };

  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!isMenuOpen) {
      return;
    }

    const currentIndex = menuItemRefs.current.findIndex((item) => item === document.activeElement);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusMenuItem(currentIndex < 0 ? 0 : currentIndex + 1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      focusMenuItem(currentIndex < 0 ? 0 : currentIndex - 1);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      focusMenuItem(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      focusMenuItem(menuItemRefs.current.length - 1);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setIsMenuOpen(false);
      menuTriggerRef.current?.focus();
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      const activeElement = document.activeElement;
      const menuItem = menuItemRefs.current.find((item) => item === activeElement);
      if (!menuItem) {
        return;
      }

      event.preventDefault();
      menuItem.click();
    }
  };

  return (
    <div className="flex h-14 shrink-0 items-center justify-between border-b bg-background/90 px-3 backdrop-blur">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <span className="h-4 w-px bg-border" />
        <span className="text-sm font-semibold">深度研究会话</span>
        <span
          className={cn(
            "rounded-full px-2 py-1 text-[11px]",
            tagStatusVariant === "error"
              ? "bg-destructive/10 text-destructive"
              : "bg-muted text-muted-foreground"
          )}
        >
          {tagStatusMessage}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-pressed={isCompactLayout ? isGraphPanelOpen : undefined}
          className={cn(
            "inline-flex h-8 items-center gap-2 rounded-md px-2 text-xs text-muted-foreground transition-colors duration-150 motion-reduce:transition-none hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
            isCompactLayout && isGraphPanelOpen ? "bg-accent text-accent-foreground" : ""
          )}
          onClick={() => onToggleGraphPanel?.()}
        >
          <LayoutPanelLeft className="h-4 w-4" />
          {isCompactLayout ? (isGraphPanelOpen ? "隐藏图谱" : "显示图谱") : "切换布局"}
        </button>
        <button
          type="button"
          aria-label="生成标签"
          disabled={isGeneratingTags}
          className="inline-flex h-8 items-center gap-2 rounded-md px-2 text-xs text-muted-foreground transition-colors duration-150 motion-reduce:transition-none hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={onGenerateTags}
        >
          <Wand2 className="h-4 w-4" />
          {isGeneratingTags ? "生成中..." : "生成标签"}
        </button>
        <div className="relative" ref={menuRef}>
          <button
            ref={menuTriggerRef}
            type="button"
            aria-label="更多操作"
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 motion-reduce:transition-none hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          {isMenuOpen ? (
            <div
              role="menu"
              aria-label="更多操作菜单"
              onKeyDown={handleMenuKeyDown}
              className="absolute right-0 top-9 z-30 min-w-[140px] rounded-md border bg-card p-1 shadow-md"
            >
              <button
                ref={(element) => {
                  menuItemRefs.current[0] = element;
                }}
                type="button"
                role="menuitem"
                className="flex h-8 w-full items-center gap-2 rounded-sm px-2 text-xs text-foreground/85 transition-colors duration-150 motion-reduce:transition-none hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                onClick={() => setIsMenuOpen(false)}
              >
                <Share2 className="h-4 w-4 text-muted-foreground" />
                导出
              </button>
              <button
                ref={(element) => {
                  menuItemRefs.current[1] = element;
                }}
                type="button"
                role="menuitem"
                className="flex h-8 w-full items-center gap-2 rounded-sm px-2 text-xs text-foreground/85 transition-colors duration-150 motion-reduce:transition-none hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                onClick={() => setIsMenuOpen(false)}
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
                设置
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
