"use client";

import { MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
  messageCount: number;
  hasBranches: boolean;
}

interface ConversationListPaneProps {
  conversations: ConversationSummary[];
  activeConversationId: string;
  onSelectConversation: (conversationId: string) => void;
  onCreateConversation: () => void;
}

export function ConversationListPane({
  conversations,
  activeConversationId,
  onSelectConversation,
  onCreateConversation
}: ConversationListPaneProps) {
  return (
    <div className="h-full overflow-auto px-6 py-6">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">All Conversations</h2>
          <Button type="button" variant="outline" className="h-8 gap-1 text-xs" onClick={onCreateConversation}>
            <MessageSquarePlus className="h-4 w-4" />
            New Chat
          </Button>
        </div>

        <div className="space-y-2">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              className={cn(
                "w-full rounded-xl border bg-card px-4 py-3 text-left transition-colors",
                conversation.id === activeConversationId
                  ? "border-ring/70 ring-2 ring-ring/30"
                  : "hover:border-foreground/20 hover:bg-muted/30"
              )}
              onClick={() => onSelectConversation(conversation.id)}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="line-clamp-1 text-sm font-medium text-foreground">{conversation.title}</p>
                <span className="text-xs text-muted-foreground">{conversation.updatedAt}</span>
              </div>
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                <span>{`${conversation.messageCount} messages`}</span>
                <span>{conversation.hasBranches ? "Branching Enabled" : "Linear Chat"}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
