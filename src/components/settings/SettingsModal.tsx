"use client";

import { useEffect, useMemo, useState } from "react";
import { KeyRound, Link2, Settings2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ProviderSettingsDraft {
  providerUrl: string;
  apiKey: string;
}

interface SettingsModalProps {
  open: boolean;
  settings: ProviderSettingsDraft;
  onOpenChange: (open: boolean) => void;
  onSave: (settings: ProviderSettingsDraft) => void;
}

export function SettingsModal({ open, settings, onOpenChange, onSave }: SettingsModalProps) {
  const [draft, setDraft] = useState(settings);

  useEffect(() => {
    if (open) {
      setDraft(settings);
    }
  }, [open, settings]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onOpenChange(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onOpenChange, open]);

  const canSave = useMemo(() => draft.providerUrl.trim().length > 0, [draft.providerUrl]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="关闭设置"
        onClick={() => onOpenChange(false)}
      />

      <section
        role="dialog"
        aria-label="Settings"
        className="relative z-10 grid h-[76vh] w-full max-w-4xl grid-cols-[220px_1fr] overflow-hidden rounded-xl border bg-background shadow-xl"
      >
        <aside className="border-r bg-muted/35 p-3">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Settings
          </p>
          <button
            type="button"
            className={cn(
              "flex h-9 w-full items-center gap-2 rounded-md px-2 text-sm font-medium",
              "bg-accent text-accent-foreground"
            )}
          >
            <Settings2 className="h-4 w-4" />
            Model Provider
          </button>
        </aside>

        <div className="flex h-full flex-col">
          <header className="flex items-center justify-between border-b px-5 py-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Model Provider</h2>
              <p className="text-xs text-muted-foreground">
                配置模型服务商 API Base URL 与 API Key，用于后续接入真实模型。
              </p>
            </div>
            <Button type="button" variant="ghost" size="icon" aria-label="关闭设置" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </header>

          <div className="flex-1 space-y-4 overflow-auto px-5 py-5">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">API Base URL</span>
              <div className="relative">
                <Link2 className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  aria-label="API Base URL"
                  className="h-9 w-full rounded-md border bg-background pl-8 pr-3 text-sm outline-none ring-ring/40 transition focus:ring-2"
                  value={draft.providerUrl}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      providerUrl: event.target.value
                    }))
                  }
                />
              </div>
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">API Key</span>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  aria-label="API Key"
                  type="password"
                  autoComplete="off"
                  className="h-9 w-full rounded-md border bg-background pl-8 pr-3 text-sm outline-none ring-ring/40 transition focus:ring-2"
                  value={draft.apiKey}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      apiKey: event.target.value
                    }))
                  }
                />
              </div>
            </label>
          </div>

          <footer className="flex items-center justify-end gap-2 border-t px-5 py-3">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!canSave}
              onClick={() => {
                onSave({
                  providerUrl: draft.providerUrl.trim(),
                  apiKey: draft.apiKey
                });
                onOpenChange(false);
              }}
            >
              Save
            </Button>
          </footer>
        </div>
      </section>
    </div>
  );
}
