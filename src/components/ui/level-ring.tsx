import { cn } from "@/lib/utils";

/** Circular progress toward the next level, level number in the middle. */
export function LevelRing({ level, progress, size = 72, className }: { level: number; progress: number; size?: number; className?: string }) {
  const stroke = Math.max(4, size / 12);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.min(1, Math.max(0, progress));
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`Level ${level}, ${Math.round(p * 100)}% to next`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-jci-blue-25" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - p)} className="stroke-jci-blue transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <span className="absolute flex flex-col items-center leading-none text-jci-black">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Lvl</span>
        <span className="font-semibold" style={{ fontSize: size / 3.4 }}>{level}</span>
      </span>
    </div>
  );
}
