import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

const sizes = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-16 w-16 text-xl" };

/** Member initials on their avatar_color (data-driven color, so inline style). */
export function Avatar({ name, color, size = "md", className }: { name: string; color?: string | null; size?: keyof typeof sizes; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full bg-jci-navy font-semibold text-jci-white", sizes[size], className)}
      style={color ? { backgroundColor: color } : undefined}
    >
      {initials(name)}
    </span>
  );
}
