import {
  Home,
  Search,
  Settings2,
  Sparkles,
  StickyNote
} from "lucide-react";
import { Sidebar as SidebarShell, SidebarRail, useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export type SidebarSection = "search" | "ask-ai" | "conversations" | "notes";

const navMainItems: Array<{
  id: SidebarSection;
  label: string;
  icon: typeof Search;
}> = [
  { id: "search", label: "搜索", icon: Search },
  { id: "ask-ai", label: "Ask AI", icon: Sparkles },
  { id: "conversations", label: "全部对话", icon: Home },
  { id: "notes", label: "全部笔记", icon: StickyNote }
];

const favorites = [
  { emoji: "📊", label: "Research Comparison Matrix" },
  { emoji: "📚", label: "Paper Reading Ledger" },
  { emoji: "🧪", label: "Model Eval Notes" },
  { emoji: "🧠", label: "Prompt Iteration Lab" }
];

interface SidebarProps {
  activeSection?: SidebarSection;
  onSectionChange?: (section: SidebarSection) => void;
  onOpenSettings?: () => void;
}

export function Sidebar({
  activeSection = "conversations",
  onSectionChange,
  onOpenSettings
}: SidebarProps) {
  const { open, isMobile, setOpenMobile } = useSidebar();
  const collapsed = !open && !isMobile;

  const menuButtonClass =
    "group flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm text-sidebar-foreground/85 outline-none transition-colors duration-150 motion-reduce:transition-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring";

  const handleSelect = (section: SidebarSection) => {
    onSectionChange?.(section);
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <SidebarShell className="bg-sidebar/95 backdrop-blur supports-[backdrop-filter]:bg-sidebar/90">
      <div className="flex h-full flex-1 flex-col">
        <nav className="flex-1 overflow-y-auto px-2 pb-2 pt-2">
          <div className="space-y-1">
            {navMainItems.map((item) => (
              <button
                key={item.id}
                type="button"
                title={collapsed ? item.label : undefined}
                className={cn(
                  menuButtonClass,
                  collapsed ? "justify-center px-0" : "",
                  item.id === activeSection
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : ""
                )}
                onClick={() => handleSelect(item.id)}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className={cn("truncate", collapsed ? "sr-only" : "")}>{item.label}</span>
              </button>
            ))}
          </div>

          <div className={cn("mt-4 space-y-1", collapsed ? "hidden" : "") }>
            <p className="px-2 text-xs font-medium text-sidebar-foreground/70">Favorites</p>
            {favorites.map((favorite) => (
              <button
                key={favorite.label}
                type="button"
                className={cn(menuButtonClass, "text-sidebar-foreground/75")}
              >
                <span className="text-sm leading-none">{favorite.emoji}</span>
                <span className="truncate">{favorite.label}</span>
              </button>
            ))}
            <button type="button" className={cn(menuButtonClass, "text-sidebar-foreground/70")}>
              <span className="text-sm leading-none">⋯</span>
              <span>More</span>
            </button>
          </div>
        </nav>

        <div className="border-t border-sidebar-border p-2">
          <button
            type="button"
            title={collapsed ? "设置" : undefined}
            className={cn(menuButtonClass, collapsed ? "justify-center px-0" : "")}
            onClick={onOpenSettings}
          >
            <Settings2 className="h-4 w-4 shrink-0" />
            <span className={cn("truncate", collapsed ? "sr-only" : "")}>设置</span>
          </button>
        </div>
      </div>
      <SidebarRail />
    </SidebarShell>
  );
}
