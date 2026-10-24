import { cn } from "@/lib/utils";

/** jci-black pill with a yellow XP number. */
export function XpBadge({ xp, className, prefix = "+" }: { xp: number; className?: string; prefix?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full bg-jci-black px-3 py-1 text-sm", className)}>
      <span className="font-semibold text-jci-yellow">
        {prefix}
        {xp}
      </span>
      <span className="text-jci-white">XP</span>
    </span>
  );
}
