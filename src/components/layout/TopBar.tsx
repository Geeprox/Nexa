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
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

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
  const [isFavorite, setIsFavorite] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  return (
    <div className="relative z-20 flex h-14 shrink-0 items-center justify-between border-b bg-background/90 px-3 backdrop-blur">
      <div className="flex min-w-0 flex-1 items-center gap-2 px-1">
        <SidebarTrigger data-testid="topbar-sidebar-trigger" className="h-7 w-7 rounded-md text-foreground/80" />
        <Separator orientation="vertical" className="h-4" />
        <span className="line-clamp-1 text-sm font-semibold text-foreground">{title}</span>
      </div>

      <div className="relative z-10 ml-auto flex items-center gap-1 text-sm">
        <div className="hidden font-medium text-muted-foreground md:inline-block">Edit Oct 08</div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Favorite"
          aria-pressed={isFavorite}
          data-favorited={isFavorite ? "true" : "false"}
          className={cn(
            "h-7 w-7 transition-colors",
            isFavorite
              ? "bg-accent text-accent-foreground hover:bg-accent"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setIsFavorite((value) => !value)}
        >
          <Star className={cn("h-4 w-4 transition-all", isFavorite ? "fill-current" : "")} />
        </Button>

        <DropdownMenu open={isMoreMenuOpen} onOpenChange={setIsMoreMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="More actions"
              className="h-7 w-7 text-muted-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground"
              onClick={() => setIsMoreMenuOpen((value) => !value)}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56"
            aria-label="More actions menu"
            data-testid="topbar-more-menu"
          >
            {actionGroups.map((group, groupIndex) => (
              <div key={`group-${groupIndex}`}>
                {group.map((action) => (
                  <DropdownMenuItem key={action.label} className="text-xs">
                    <action.icon className="h-4 w-4 text-muted-foreground" />
                    <span>{action.label}</span>
                  </DropdownMenuItem>
                ))}
                {groupIndex < actionGroups.length - 1 ? <DropdownMenuSeparator /> : null}
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
