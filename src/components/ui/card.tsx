import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Jaybird card: white, 1px border, 12px radius, 20px padding. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-xl border border-border bg-card p-5 text-card-foreground", className)} {...props} />;
}
