import {
  Blocks,
  Calendar,
  Home,
  Inbox,
  MessageCircleQuestion,
  Search,
  Settings2,
  Sparkles,
  Star,
  Tag,
  Trash2,
  X
} from "lucide-react";
import { useState } from "react";
import { NoteSearchHit } from "@/lib/db/types";
import { ConversationSearchRecord } from "@/lib/search/ftsSearchRepository";
import { Sidebar as SidebarShell, SidebarRail, useSidebar } from "@/components/ui/sidebar";
import { TagChip } from "@/components/ui/tag-chip";
import { cn } from "@/lib/utils";

const navMainItems = [
  { label: "搜索", icon: Search },
  { label: "Ask AI", icon: Sparkles },
  { label: "全部对话", icon: Home, isActive: true },
  { label: "收件箱", icon: Inbox, badge: "10" }
];

const navSecondaryItems = [
  { label: "自动标签", icon: Sparkles },
  { label: "标签", icon: Tag },
  { label: "收藏", icon: Star },
  { label: "日历", icon: Calendar },
  { label: "模板", icon: Blocks },
  { label: "回收站", icon: Trash2 },
  { label: "帮助", icon: MessageCircleQuestion },
  { label: "设置", icon: Settings2 }
];

const favorites = [
  "研究框架对比",
  "论文阅读清单",
  "季度复盘笔记",
  "模型评测样例"
];

interface SidebarProps {
  searchQuery?: string;
  searchResults?: ConversationSearchRecord[];
  noteResults?: NoteSearchHit[];
  searchError?: string | null;
  manualTags?: string[];
  autoTags?: string[];
  onSearchQueryChange?: (query: string) => void;
  onSelectSearchResult?: (result: ConversationSearchRecord) => void;
  onSelectNoteResult?: (result: NoteSearchHit) => void;
  onAddManualTag?: (name: string) => void;
  onRemoveManualTag?: (name: string) => void;
  onRemoveAutoTag?: (name: string) => void;
}

export function Sidebar({
  searchQuery = "",
  searchResults = [],
  noteResults = [],
  searchError = null,
  manualTags = [],
  autoTags = [],
  onSearchQueryChange,
  onSelectSearchResult,
  onSelectNoteResult,
  onAddManualTag,
  onRemoveManualTag,
  onRemoveAutoTag
}: SidebarProps) {
  const { open, isMobile, setOpenMobile } = useSidebar();
  const collapsed = !open && !isMobile;
  const [newManualTag, setNewManualTag] = useState("");

  const menuButtonClass =
    "group flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm text-sidebar-foreground/85 outline-none transition-colors duration-150 motion-reduce:transition-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring";

  return (
    <SidebarShell className="bg-sidebar/95 backdrop-blur supports-[backdrop-filter]:bg-sidebar/90">
      <div className="flex h-full flex-1 flex-col">
        <div className="flex items-center gap-2 p-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground text-sm font-semibold">
            N
          </div>
          <div className={cn("min-w-0", collapsed ? "hidden" : "")}>
            <p className="truncate text-sm font-semibold text-sidebar-foreground">Nexa</p>
            <p className="truncate text-xs text-sidebar-foreground/70">研究与沉淀</p>
          </div>
        </div>

        <div className={cn("px-2 pb-2", collapsed ? "hidden" : "")}>
          <label className="flex h-8 items-center gap-2 rounded-md border border-sidebar-border bg-background px-2 text-sm text-sidebar-foreground/80 focus-within:ring-2 focus-within:ring-sidebar-ring">
            <Search className="h-4 w-4" />
            <input
              aria-label="搜索聊天记录"
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              placeholder="搜索对话或标签"
              value={searchQuery}
              onChange={(event) => onSearchQueryChange?.(event.target.value)}
            />
          </label>
        </div>

        {searchQuery && !collapsed ? (
          <div className="max-h-52 overflow-y-auto px-2 pb-2">
            {searchError ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {searchError}
              </p>
            ) : searchResults.length > 0 || noteResults.length > 0 ? (
              <div className="space-y-1">
                {searchResults.length > 0 ? (
                  <p className="px-1 text-[11px] font-medium text-sidebar-foreground/60">
                    对话命中
                  </p>
                ) : null}
                {searchResults.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    data-testid={`search-conversation-result-${item.messageId}`}
                    className="w-full rounded-md border border-sidebar-border bg-background px-2 py-2 text-left hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                    onClick={() => {
                      onSelectSearchResult?.(item);
                      if (isMobile) {
                        setOpenMobile(false);
                      }
                    }}
                  >
                    <p className="text-xs font-medium text-foreground">{item.nodeTitle}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.snippet}</p>
                  </button>
                ))}
                {noteResults.length > 0 ? (
                  <p className="px-1 pt-2 text-[11px] font-medium text-sidebar-foreground/60">
                    笔记命中
                  </p>
                ) : null}
                {noteResults.map((item) => (
                  <button
                    key={item.noteId}
                    type="button"
                    data-testid={`search-note-result-${item.noteId}`}
                    className="w-full rounded-md border border-sidebar-border bg-background px-2 py-2 text-left hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                    onClick={() => {
                      onSelectNoteResult?.(item);
                      if (isMobile) {
                        setOpenMobile(false);
                      }
                    }}
                  >
                    <p className="text-xs font-medium text-foreground">{item.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.snippet}</p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="rounded-md border border-dashed border-sidebar-border bg-background px-3 py-2 text-xs text-muted-foreground">
                未找到匹配内容
              </p>
            )}
          </div>
        ) : null}

        <nav className="flex-1 overflow-y-auto px-2 pb-2">
          <div className="space-y-1">
            {navMainItems.map((item) => (
              <button
                key={item.label}
                type="button"
                title={collapsed ? item.label : undefined}
                className={cn(
                  menuButtonClass,
                  collapsed ? "justify-center px-0" : "",
                  item.isActive ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground" : ""
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className={cn("truncate", collapsed ? "sr-only" : "")}>{item.label}</span>
                {!collapsed && item.badge ? (
                  <span className="ml-auto rounded-md px-1 text-xs text-sidebar-foreground/70">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          <div className={cn("mt-4 space-y-1", collapsed ? "hidden" : "")}>
            <p className="px-2 text-xs font-medium text-sidebar-foreground/70">收藏</p>
            {favorites.map((favorite) => (
              <button
                key={favorite}
                type="button"
                className={cn(menuButtonClass, "text-sidebar-foreground/75")}
              >
                <Star className="h-4 w-4 shrink-0" />
                <span className="truncate">{favorite}</span>
              </button>
            ))}
          </div>

          <div className="mt-4 border-t border-sidebar-border pt-2">
            {navSecondaryItems.map((item) => (
              <button
                key={item.label}
                type="button"
                title={collapsed ? item.label : undefined}
                className={cn(menuButtonClass, collapsed ? "justify-center px-0" : "")}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className={cn("truncate", collapsed ? "sr-only" : "")}>{item.label}</span>
              </button>
            ))}
          </div>
        </nav>

        <div className={cn("space-y-2 border-t border-sidebar-border p-3", collapsed ? "hidden" : "")}>
          <p className="text-xs text-sidebar-foreground/70">
            标签将用于生成智能视图，支持自动标签与手动标签并行管理。
          </p>
          <div className="flex gap-1.5">
            <input
              aria-label="新增手动标签"
              className="h-7 w-full rounded-md border border-sidebar-border bg-background px-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
              value={newManualTag}
              onChange={(event) => setNewManualTag(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") {
                  return;
                }
                const tag = newManualTag.trim();
                if (!tag) {
                  return;
                }
                onAddManualTag?.(tag);
                setNewManualTag("");
              }}
              placeholder="新增手动标签"
            />
            <button
              type="button"
              className="h-7 shrink-0 rounded-md border border-sidebar-border px-2 text-xs text-sidebar-foreground/75 hover:bg-sidebar-accent"
              onClick={() => {
                const tag = newManualTag.trim();
                if (!tag) {
                  return;
                }
                onAddManualTag?.(tag);
                setNewManualTag("");
              }}
            >
              添加
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5" aria-label="标签示例">
            {manualTags.map((label) => (
              <span
                key={`manual-${label}`}
                className="inline-flex items-center gap-1 rounded-full bg-transparent"
              >
                <TagChip source="manual" label={label} />
                <button
                  type="button"
                  aria-label={`删除手动标签 ${label}`}
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  onClick={() => onRemoveManualTag?.(label)}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            {autoTags.map((label) => (
              <span
                key={`auto-${label}`}
                className="inline-flex items-center gap-1 rounded-full bg-transparent"
              >
                <TagChip source="auto" label={label} />
                <button
                  type="button"
                  aria-label={`删除系统标签 ${label}`}
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  onClick={() => onRemoveAutoTag?.(label)}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>
      <SidebarRail />
    </SidebarShell>
  );
}
