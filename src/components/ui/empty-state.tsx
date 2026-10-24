import type { ReactNode } from "react";
import { Mascot, type MascotMood } from "@/components/Mascot";
import { cn } from "@/lib/utils";

export function EmptyState({ title, message, mood = "idle", action, className }: { title: string; message?: string; mood?: MascotMood; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-surface px-5 py-10 text-center", className)}>
      <Mascot mood={mood} size={72} />
      <h3 className="text-subheading">{title}</h3>
      {message && <p className="max-w-sm text-muted-foreground">{message}</p>}
      {action}
    </div>
  );
}
