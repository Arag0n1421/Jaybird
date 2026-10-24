import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/** 1-5 stars. Interactive when onChange is given, read-only otherwise. */
export function Stars({ value, onChange, size = 24, className }: { value: number; onChange?: (v: number) => void; size?: number; className?: string }) {
  return (
    <div className={cn("inline-flex gap-1", className)} role={onChange ? "radiogroup" : "img"} aria-label={`${value} of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const icon = (
          <Star
            width={size} height={size}
            className={n <= value ? "fill-jci-yellow stroke-jci-yellow" : "fill-transparent stroke-jci-black-25"}
          />
        );
        return onChange ? (
          <button key={n} type="button" role="radio" aria-checked={n === value} aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => onChange(n)} className="rounded p-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {icon}
          </button>
        ) : (
          <span key={n}>{icon}</span>
        );
      })}
    </div>
  );
}
