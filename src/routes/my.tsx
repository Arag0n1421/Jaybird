import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { useMe } from "@/hooks/use-me";
import { PageTitle } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { XpBadge } from "@/components/ui/xp-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingBlock, ErrorBlock } from "@/components/StateViews";
import { q } from "@/lib/queries";
import { pageHead } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/my")({
  head: () => pageHead("My tasks", "Tasks you said yes to, in progress and in review."),
  component: MyTasks,
});

function MyTasks() {
  const { me } = useMe();
  const tasks = useQuery(q.tasks());
  const xp = useQuery({ ...q.myXp(me?.id ?? 0), enabled: !!me });

  if (!me || tasks.isLoading) return <LoadingBlock label="Gathering your tasks…" />;
  if (tasks.error) return <ErrorBlock error={tasks.error} onRetry={() => void tasks.refetch()} />;

  const mine = (tasks.data ?? []).filter((t) => t.assignee_id === me.id);
  const active = mine.filter((t) => t.status === "in_progress" || t.status === "review");
  const season = Math.max(0, ...(xp.data ?? []).map((r) => r.season));
  const seasonXp = (xp.data ?? []).filter((r) => r.season === season);
  const done = mine
    .filter((t) => t.status === "done" && (seasonXp.some((r) => r.task_id === t.id) || !xp.data?.length))
    .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""));

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <PageTitle title="My tasks" />
      <section className="flex flex-col gap-2">
        <h2 className="text-subheading">In progress</h2>
        {active.length === 0 ? (
          <EmptyState title="Nothing on your plate" message="Pick one small thing on Home. Every bit helps!" action={<Link to="/" className="text-jci-blue">Find my one task</Link>} />
        ) : (
          active.map((t) => (
            <Link key={t.id} to="/task/$id" params={{ id: String(t.id) }}>
              <Card className="flex items-center gap-3 p-4 hover:border-jci-blue">
                <span className="min-w-0 flex-1 truncate font-medium">{t.title}</span>
                <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs", t.status === "review" ? "bg-jci-teal-25" : "bg-jci-blue-25")}>
                  {t.status === "review" ? "In review" : "In progress"}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Card>
            </Link>
          ))
        )}
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-subheading">Done this season</h2>
        {done.length === 0 ? (
          <EmptyState mood="cheer" title="Your first win is waiting" message="Finish a task and it'll show up here with your XP." />
        ) : (
          done.map((t) => {
            const earned = seasonXp.filter((r) => r.task_id === t.id).reduce((s, r) => s + r.xp, 0);
            return (
              <Link key={t.id} to="/task/$id" params={{ id: String(t.id) }}>
                <Card className="flex items-center gap-3 p-4 hover:border-jci-blue">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{t.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {t.completed_at ? new Date(t.completed_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : ""}
                    </p>
                  </div>
                  <XpBadge xp={earned || t.xp} />
                </Card>
              </Link>
            );
          })
        )}
      </section>
    </div>
  );
}
