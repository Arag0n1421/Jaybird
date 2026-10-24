import { Mascot } from "./Mascot";
import { SecondaryButton } from "./ui/secondary-button";

export function LoadingBlock({ label = "Jay is looking…" }: { label?: string }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="h-40 animate-pulse rounded-xl bg-surface" />
      <div className="h-16 animate-pulse rounded-xl bg-surface" />
    </div>
  );
}

export function ErrorBlock({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-border p-6 text-center">
      <Mascot mood="nudge" size={64} />
      <p className="text-subheading">Oops, that didn't load</p>
      <p className="text-sm text-muted-foreground">{error instanceof Error ? error.message : "Something went wrong."}</p>
      {onRetry && <SecondaryButton onClick={onRetry}>Try again</SecondaryButton>}
    </div>
  );
}
