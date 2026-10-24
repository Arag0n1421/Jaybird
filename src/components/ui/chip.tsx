import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "default" | "blue" | "teal" | "navy";
const tones: Record<Tone, string> = {
  default: "bg-surface text-jci-black border-border",
  blue: "bg-jci-blue-25 text-jci-black border-transparent",
  teal: "bg-jci-teal-25 text-jci-black border-transparent",
  navy: "bg-jci-navy text-jci-white border-transparent",
};

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: Tone;
  selected?: boolean;
}

/** Small pill. Becomes a toggle when onClick is passed. */
export function Chip({ tone = "default", selected, className, onClick, ...props }: ChipProps) {
  const cls = cn(
    "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm whitespace-nowrap transition-colors",
    selected ? "bg-jci-blue text-jci-white border-jci-blue" : tones[tone],
    onClick && "min-h-11 cursor-pointer hover:border-jci-blue",
    className,
  );
  if (!onClick) return <span className={cls}>{props.children}</span>;
  return <button type="button" aria-pressed={selected} className={cls} onClick={onClick} {...props} />;
}
