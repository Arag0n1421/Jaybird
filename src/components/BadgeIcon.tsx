import {
  ArrowLeftRight, Award, CalendarCheck, CircleCheck, Compass, Flame, Footprints, Gem, GraduationCap, Handshake,
  HeartHandshake, LifeBuoy, Lightbulb, Link as LinkIcon, Puzzle, ScrollText, Share2, ShieldCheck, Star, UserPlus, Users, Zap,
  type LucideIcon,
} from "lucide-react";
import type { BadgeTier } from "@/lib/db";
import { TIER_COLOR } from "@/lib/community";
import { cn } from "@/lib/utils";

/** Code-based icons first (contract), then the badge's own icon name, both from an allowlist. */
const BY_CODE: Record<string, LucideIcon> = {
  delegator: Share2, spark: Zap, connector: LinkIcon, recruiter: UserPlus, closer: Handshake, rescuer: LifeBuoy,
  quality_gate: ShieldCheck, bridge: ArrowLeftRight, host: CalendarCheck, mentor: GraduationCap, handover_hero: ScrollText,
  streak: Flame, first_step: Footprints, finisher: CircleCheck, gap_filler: Puzzle,
};
const BY_NAME: Record<string, LucideIcon> = {
  HeartHandshake, Users, Lightbulb, Compass, Award, Gem, Share2, Zap, Link: LinkIcon, UserPlus, Handshake, LifeBuoy,
  ShieldCheck, ArrowLeftRight, CalendarCheck, GraduationCap, ScrollText, Flame, Footprints, CircleCheck, Puzzle,
};

export function badgeIcon(code: string, icon?: string | null): LucideIcon {
  return BY_CODE[code] ?? (icon ? BY_NAME[icon] : undefined) ?? Star;
}

export function BadgeIcon({ code, icon, tier, earned = true, size = 48, className }: { code: string; icon?: string | null | undefined; tier?: BadgeTier | null | undefined; earned?: boolean; size?: number; className?: string }) {
  const Icon = badgeIcon(code, icon);
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full border-2", earned ? "bg-jci-navy text-jci-yellow" : "border-dashed border-border bg-surface text-jci-black-25", className)}
      style={{ width: size, height: size, borderColor: earned && tier ? TIER_COLOR[tier] : undefined }}
    >
      <Icon style={{ width: size * 0.45, height: size * 0.45 }} strokeWidth={1.75} />
    </span>
  );
}
