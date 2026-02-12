"use client";

import {
  ArrowDown,
  ArrowUp,
  Bell,
  Copy,
  CornerUpLeft,
  CornerUpRight,
  FileText,
  GalleryVerticalEnd,
  LineChart,
  Link,
  MoreHorizontal,
  Settings2,
  Star,
  Trash,
  Trash2
} from "lucide-react";
import { KeyboardEvent as ReactKeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";

const actionGroups = [
  [
    { label: "Customize Page", icon: Settings2 },
    { label: "Turn into wiki", icon: FileText }
  ],
  [
    { label: "Copy Link", icon: Link },
    { label: "Duplicate", icon: Copy },
    { label: "Move to", icon: CornerUpRight },
    { label: "Move to Trash", icon: Trash2 }
  ],
  [
    { label: "Undo", icon: CornerUpLeft },
    { label: "View analytics", icon: LineChart },
    { label: "Version History", icon: GalleryVerticalEnd },
    { label: "Show delete pages", icon: Trash },
    { label: "Notifications", icon: Bell }
  ],
  [
    { label: "Import", icon: ArrowUp },
    { label: "Export", icon: ArrowDown }
  ]
] as const;

interface TopBarProps {
  title: string;
}

export function TopBar({ title }: TopBarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const menuItemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const flatActions = useMemo(() => actionGroups.flat(), []);

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
        <span className="line-clamp-1 text-sm font-semibold">{title}</span>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <div className="hidden font-medium text-muted-foreground md:inline-block">Edit Oct 08</div>

        <button
          type="button"
          aria-label="Favorite"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 motion-reduce:transition-none hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <Star className="h-4 w-4" />
        </button>

        <div className="relative" ref={menuRef}>
          <button
            ref={menuTriggerRef}
            type="button"
            aria-label="More actions"
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 motion-reduce:transition-none hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          {isMenuOpen ? (
            <div
              role="menu"
              aria-label="More actions menu"
              onKeyDown={handleMenuKeyDown}
              className="absolute right-0 top-9 z-30 w-56 overflow-hidden rounded-lg border bg-card p-0 shadow-md"
            >
              {actionGroups.map((group, groupIndex) => (
                <div key={`group-${groupIndex}`} className="border-b last:border-none">
                  {group.map((action) => {
                    const actionIndex = flatActions.findIndex((item) => item.label === action.label);

                    return (
                      <button
                        key={action.label}
                        ref={(element) => {
                          menuItemRefs.current[actionIndex] = element;
                        }}
                        type="button"
                        role="menuitem"
                        className="flex h-8 w-full items-center gap-2 px-2 text-left text-xs text-foreground/85 transition-colors duration-150 motion-reduce:transition-none hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <action.icon className="h-4 w-4 text-muted-foreground" />
                        <span>{action.label}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
