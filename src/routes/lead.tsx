import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useIsLead } from "@/hooks/use-is-lead";
import { useReviewQueue } from "@/hooks/use-lead";
import { useMe } from "@/hooks/use-me";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingBlock } from "@/components/StateViews";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/lead")({
  component: LeadLayout,
});

const TABS = [
  { to: "/lead", label: "Dashboard" },
  { to: "/lead/create", label: "Create" },
  { to: "/lead/review", label: "Review" },
  { to: "/lead/insights", label: "Insights" },
] as const;

function LeadLayout() {
  const { me } = useMe();
  const isLead = useIsLead();
  const pathname = useRouterState({ select: (s) => s.location.pathname.replace(/\/$/, "") });
  const queue = useReviewQueue();

  if (!me) return <LoadingBlock />;
  if (!isLead) return <EmptyState mood="nudge" title="This area is for project leads." message="Switch member in the header." />;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <nav aria-label="Lead" className="-mx-4 flex gap-1 overflow-x-auto border-b border-border px-4">
        {TABS.map((t) => {
          const active = pathname === t.to;
          return (
            <Link
              key={t.to}
              to={t.to}
              className={cn("flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm", active ? "border-jci-blue font-medium text-jci-blue" : "border-transparent text-muted-foreground hover:text-jci-black")}
            >
              {t.label}
              {t.to === "/lead/review" && queue.data.length > 0 && (
                <span className="rounded-full bg-jci-blue px-1.5 text-xs text-jci-white">{queue.data.length}</span>
              )}
            </Link>
          );
        })}
      </nav>
      <Outlet />
    </div>
  );
}
