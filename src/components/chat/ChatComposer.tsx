"use client";

import {
  ArrowUp,
  ImagePlus,
  Lightbulb,
  Mic,
  MoreHorizontal,
  Paperclip,
  Plus,
  ShoppingBag,
  Telescope,
  X
} from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const toolActions = [
  { label: "添加照片和文件", icon: Paperclip, shortcut: "⌘U", emphasized: true },
  { label: "创建图片", icon: ImagePlus },
  { label: "思考", icon: Lightbulb },
  { label: "深度研究", icon: Telescope },
  { label: "智能购物", icon: ShoppingBag },
  { label: "更多", icon: MoreHorizontal }
] as const;

interface ChatComposerProps {
  quotePreview?: string | null;
  onClearQuote?: () => void;
  onSendMessage: (value: string) => void;
}

export function ChatComposer({ quotePreview, onClearQuote, onSendMessage }: ChatComposerProps) {
  const [draft, setDraft] = useState("");
  const [isToolsOpen, setIsToolsOpen] = useState(false);

  const handleSubmitDraft = useCallback(() => {
    const value = draft.trim();
    if (!value) {
      return;
    }

    onSendMessage(value);
    setDraft("");
    setIsToolsOpen(false);
  }, [draft, onSendMessage]);

  return (
    <div className="border-t bg-background/90 px-6 py-4">
      <div className="mx-auto max-w-4xl rounded-3xl border bg-card p-2 shadow-sm">
        {quotePreview ? (
          <div className="mb-2 flex items-start gap-2 rounded-xl border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <span className="mt-0.5 text-[13px] leading-none">↳</span>
            <span className="min-w-0 flex-1 whitespace-pre-wrap break-words">{quotePreview}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Clear quoted context"
              className="h-5 w-5 shrink-0"
              onClick={onClearQuote}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <Popover open={isToolsOpen} onOpenChange={setIsToolsOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="打开附件菜单"
                className="h-9 w-9 rounded-full"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[320px] rounded-2xl p-2">
              <div className="space-y-1">
                {toolActions.map((action, index) => (
                  <div key={action.label}>
                    <button
                      type="button"
                      className={cn(
                        "flex h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground",
                        action.emphasized ? "bg-muted" : ""
                      )}
                      onClick={() => setIsToolsOpen(false)}
                    >
                      <action.icon className="h-5 w-5 text-foreground/90" />
                      <span className="flex-1">{action.label}</span>
                      {action.shortcut ? (
                        <span className="text-xs text-muted-foreground">{action.shortcut}</span>
                      ) : null}
                    </button>
                    {index === 0 ? <Separator className="my-1" /> : null}
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <input
            aria-label="聊天输入"
            className="h-9 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            placeholder="输入你的问题，按 Enter 发送"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleSubmitDraft();
              }
            }}
          />

          <Button type="button" variant="ghost" size="icon" aria-label="语音输入" className="h-9 w-9 rounded-full">
            <Mic className="h-5 w-5" />
          </Button>

          <Button
            type="button"
            size="icon"
            aria-label="发送消息"
            className="h-9 w-9 rounded-full bg-foreground text-background hover:bg-foreground/90"
            onClick={handleSubmitDraft}
          >
            <ArrowUp className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
