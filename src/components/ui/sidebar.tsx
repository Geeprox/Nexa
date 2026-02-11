"use client";

import { PanelLeft } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

const SIDEBAR_WIDTH = "17.5rem";
const SIDEBAR_WIDTH_ICON = "3.5rem";
const MOBILE_BREAKPOINT_PX = 768;

interface SidebarContextValue {
  open: boolean;
  setOpen: (value: boolean | ((value: boolean) => boolean)) => void;
  openMobile: boolean;
  setOpenMobile: (value: boolean) => void;
  state: "expanded" | "collapsed";
  isMobile: boolean;
  toggleSidebar: () => void;
}

const fallbackContext: SidebarContextValue = {
  open: true,
  setOpen: () => undefined,
  openMobile: false,
  setOpenMobile: () => undefined,
  state: "expanded",
  isMobile: false,
  toggleSidebar: () => undefined
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }

    const media = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`);
    const handleChange = () => {
      setIsMobile(media.matches);
    };

    handleChange();
    media.addEventListener("change", handleChange);
    return () => {
      media.removeEventListener("change", handleChange);
    };
  }, []);

  return isMobile;
}

export function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange,
  className,
  style,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const isMobile = useIsMobile();
  const [openMobile, setOpenMobile] = React.useState(false);
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const open = openProp ?? uncontrolledOpen;

  const setOpen = React.useCallback(
    (value: boolean | ((value: boolean) => boolean)) => {
      const nextValue = typeof value === "function" ? value(open) : value;
      if (onOpenChange) {
        onOpenChange(nextValue);
        return;
      }

      setUncontrolledOpen(nextValue);
    },
    [onOpenChange, open]
  );

  const toggleSidebar = React.useCallback(() => {
    if (isMobile) {
      setOpenMobile((previous) => !previous);
      return;
    }

    setOpen((previous) => !previous);
  }, [isMobile, setOpen]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "b" || (!event.metaKey && !event.ctrlKey)) {
        return;
      }

      event.preventDefault();
      toggleSidebar();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [toggleSidebar]);

  const state = open ? "expanded" : "collapsed";
  const contextValue = React.useMemo<SidebarContextValue>(
    () => ({
      open,
      setOpen,
      openMobile,
      setOpenMobile,
      state,
      isMobile,
      toggleSidebar
    }),
    [open, setOpen, openMobile, state, isMobile, toggleSidebar]
  );

  return (
    <SidebarContext.Provider value={contextValue}>
      <div
        data-slot="sidebar-wrapper"
        style={
          {
            "--sidebar-width": SIDEBAR_WIDTH,
            "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
            ...style
          } as React.CSSProperties
        }
        className={cn("group/sidebar-wrapper flex min-h-svh w-full", className)}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return React.useContext(SidebarContext) ?? fallbackContext;
}

export function Sidebar({ className, children, ...props }: React.ComponentProps<"aside">) {
  const { isMobile, open, openMobile, setOpenMobile, state } = useSidebar();

  if (isMobile) {
    return (
      <>
        <button
          type="button"
          aria-label="关闭侧边栏"
          className={cn(
            "fixed inset-0 z-40 bg-black/20 transition-opacity duration-200 ease-out motion-reduce:transition-none md:hidden",
            openMobile ? "opacity-100" : "pointer-events-none opacity-0"
          )}
          onClick={() => setOpenMobile(false)}
        />
        <aside
          data-slot="sidebar"
          data-mobile="true"
          data-testid="sidebar-mobile"
          data-state={openMobile ? "expanded" : "collapsed"}
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-[var(--sidebar-width)] max-w-[85vw] -translate-x-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-200 ease-out motion-reduce:transition-none md:hidden",
            openMobile ? "translate-x-0" : "",
            className
          )}
          {...props}
        >
          {children}
        </aside>
      </>
    );
  }

  return (
    <aside
      data-slot="sidebar"
      data-testid="sidebar-desktop"
      data-state={state}
      className={cn(
        "relative hidden h-svh shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-linear motion-reduce:transition-none md:flex",
        open ? "w-[var(--sidebar-width)]" : "w-[var(--sidebar-width-icon)]",
        className
      )}
      {...props}
    >
      {children}
    </aside>
  );
}

export function SidebarInset({ className, ...props }: React.ComponentProps<"main">) {
  return (
    <main
      data-slot="sidebar-inset"
      className={cn("flex min-w-0 flex-1 flex-col bg-background", className)}
      {...props}
    />
  );
}

export function SidebarTrigger({
  className,
  onClick,
  ...props
}: React.ComponentProps<"button">) {
  const { toggleSidebar } = useSidebar();

  return (
    <button
      type="button"
      aria-label="切换侧边栏"
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-md text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        className
      )}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      <PanelLeft className="h-4 w-4" />
      <span className="sr-only">切换侧边栏</span>
    </button>
  );
}

export function SidebarRail({ className, ...props }: React.ComponentProps<"button">) {
  const { toggleSidebar, state } = useSidebar();

  return (
    <button
      type="button"
      aria-label="切换侧边栏"
      className={cn(
        "absolute inset-y-0 top-0 hidden w-3 -translate-x-1/2 cursor-ew-resize md:block",
        state === "expanded" ? "right-0" : "right-[-6px]",
        className
      )}
      onClick={toggleSidebar}
      {...props}
    />
  );
}
