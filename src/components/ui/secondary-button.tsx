import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Secondary action: jci-blue outline. */
export const SecondaryButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { block?: boolean }>(
  ({ className, block, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-jci-blue bg-jci-white px-6 text-base font-medium text-jci-blue transition hover:bg-surface active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        block && "w-full",
        className,
      )}
      {...props}
    />
  ),
);
SecondaryButton.displayName = "SecondaryButton";
