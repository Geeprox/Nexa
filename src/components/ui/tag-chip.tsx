import { Sparkles, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

export type TagChipSource = "manual" | "auto";

interface TagChipProps {
  label: string;
  source: TagChipSource;
  className?: string;
}

export function TagChip({ label, source, className }: TagChipProps) {
  const isAuto = source === "auto";

  return (
    <span
      data-testid={`tag-chip-${source}`}
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-full border px-2 text-[11px] leading-none transition-colors duration-150 motion-reduce:transition-none",
        isAuto
          ? "border-dashed border-[hsl(var(--auto-tag)/0.48)] bg-[hsl(var(--auto-tag)/0.14)] text-foreground/80"
          : "border-[hsl(var(--manual-tag)/0.28)] bg-[hsl(var(--manual-tag)/0.08)] text-[hsl(var(--manual-tag))]",
        className
      )}
    >
      {isAuto ? (
        <Sparkles className="h-3 w-3 text-[hsl(var(--auto-tag)/0.92)]" aria-hidden="true" />
      ) : (
        <Tag className="h-3 w-3 text-[hsl(var(--manual-tag))]" aria-hidden="true" />
      )}
      <span className="truncate">{label}</span>
    </span>
  );
}
