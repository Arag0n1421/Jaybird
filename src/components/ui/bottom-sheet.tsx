import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Slides up from the bottom on mobile; centered dialog on desktop. */
export function BottomSheet({ open, onClose, title, children, className, side = false }: { open: boolean; onClose: () => void; title?: string | undefined; children: ReactNode; className?: string; side?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className={cn("fixed inset-0 z-50 flex items-end justify-center", side ? "lg:items-stretch lg:justify-end" : "lg:items-center")} role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="Close" className="absolute inset-0 bg-jci-black/40 animate-in fade-in" onClick={onClose} />
      <div className={cn("relative max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-jci-white p-5 pb-8 animate-in slide-in-from-bottom", side ? "lg:max-h-none lg:max-w-xl lg:rounded-none lg:slide-in-from-right" : "lg:max-w-lg lg:rounded-2xl", className)}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border lg:hidden" />
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="text-subheading">{title}</h2>}
          <button onClick={onClose} aria-label="Close" className="ml-auto rounded-full p-2 hover:bg-surface"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
