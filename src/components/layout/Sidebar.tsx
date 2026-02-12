import {
  Plus,
  MessageSquare,
  Search,
  Settings,
  Sparkles,
  StickyNote
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  { id: "conversations", label: "全部对话", icon: MessageSquare },
  { id: "notes", label: "全部笔记", icon: StickyNote }
];

export interface SidebarConversationItem {
  id: string;
  title: string;
}

interface SidebarProps {
  activeSection?: SidebarSection;
  activeConversationId?: string;
  conversations?: SidebarConversationItem[];
  onSectionChange?: (section: SidebarSection) => void;
  onSelectConversation?: (conversationId: string) => void;
  onCreateConversation?: () => void;
  onOpenSettings?: () => void;
}

export function Sidebar({
  activeSection = "conversations",
  activeConversationId,
  conversations = [],
  onSectionChange,
  onSelectConversation,
  onCreateConversation,
  onOpenSettings
}: SidebarProps) {
  const { open, isMobile, setOpenMobile } = useSidebar();
  const collapsed = !open && !isMobile;

  const navButtonClass =
    "h-8 w-full justify-start gap-2 rounded-md px-2 text-[13px] font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring";

  const handleSelect = (section: SidebarSection) => {
    onSectionChange?.(section);
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <SidebarShell className="bg-sidebar">
      <div className="flex h-full flex-1 flex-col">
        <nav className="flex-1 overflow-y-auto px-2 pb-2 pt-2">
          <div className="space-y-1">
            {navMainItems.map((item) => (
              <Button
                key={item.id}
                type="button"
                variant="ghost"
                title={collapsed ? item.label : undefined}
                className={cn(
                  navButtonClass,
                  collapsed ? "justify-center px-0" : "",
                  item.id === activeSection ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""
                )}
                onClick={() => handleSelect(item.id)}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className={cn("truncate", collapsed ? "sr-only" : "")}>{item.label}</span>
              </Button>
            ))}
          </div>

          <div className={cn("mt-4 space-y-1", collapsed ? "hidden" : "")}>
            <div className="flex items-center justify-between px-2">
              <p className="text-xs font-semibold text-sidebar-foreground/70">Conversations</p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="New conversation"
                className="h-6 w-6"
                onClick={onCreateConversation}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {conversations.map((conversation) => (
              <Button
                key={conversation.id}
                type="button"
                variant="ghost"
                className={cn(
                  navButtonClass,
                  "text-sidebar-foreground/90",
                  conversation.id === activeConversationId ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""
                )}
                onClick={() => onSelectConversation?.(conversation.id)}
              >
                <MessageSquare className="h-4 w-4 shrink-0" />
                <span className="truncate">{conversation.title}</span>
              </Button>
            ))}
          </div>
        </nav>

        <div className="border-t border-sidebar-border p-2">
          <Button
            type="button"
            variant="ghost"
            title={collapsed ? "设置" : undefined}
            className={cn(navButtonClass, collapsed ? "justify-center px-0" : "")}
            onClick={onOpenSettings}
          >
            <Settings className="h-4 w-4 shrink-0" />
            <span className={cn("truncate", collapsed ? "sr-only" : "")}>设置</span>
          </Button>
        </div>
      </div>
      <SidebarRail />
    </SidebarShell>
  );
}
