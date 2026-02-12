"use client";

import { BookText } from "lucide-react";

export interface NoteListItem {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  sourceConversationTitle: string;
}

interface NotesPaneProps {
  notes: NoteListItem[];
}

export function NotesPane({ notes }: NotesPaneProps) {
  return (
    <div className="h-full overflow-auto px-6 py-6">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <h2 className="text-lg font-semibold text-foreground">All Notes</h2>

        {notes.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card/70 px-4 py-8 text-sm text-muted-foreground">
            暂无笔记。你可以在 LLM 回复下方点击“记录笔记”，或者在选中文字后选择“记录笔记”。
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <article key={note.id} className="rounded-xl border bg-card px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="line-clamp-1 text-sm font-semibold text-foreground">{note.title}</h3>
                    <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                      {note.content}
                    </p>
                  </div>
                  <BookText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{note.sourceConversationTitle}</span>
                  <span>{note.createdAt}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
