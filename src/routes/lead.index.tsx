import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMe } from "@/hooks/use-me";
import { useLeadProjects } from "@/hooks/use-lead";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Avatar } from "@/components/ui/member-avatar";
import { XpBadge } from "@/components/ui/xp-badge";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingBlock, ErrorBlock } from "@/components/StateViews";
import { TaskPanel } from "@/components/lead/TaskPanel";
import { q } from "@/lib/queries";
import { getTaskInsights, getXpLedger, type TaskStatus } from "@/lib/db";
import { timeLabel } from "@/lib/format";
import { pageHead } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/lead/")({
  head: () => pageHead("Lead dashboard", "Post tasks and personally ask the best-fit members."),
  component: Dashboard,
});

const FILTERS: { key: TaskStatus | "all"; label: string }[] = [
  { key: "all", label: "All" }, { key: "open", label: "Open" }, { key: "asked", label: "Asked" },
  { key: "in_progress", label: "In progress" }, { key: "review", label: "Review" }, { key: "done", label: "Done" },
];
const STATUS_PILL: Record<TaskStatus, { label: string; cls: string }> = {
  open: { label: "Open", cls: "bg-surface border border-border" },
  asked: { label: "Asked", cls: "bg-jci-blue-25" },
  in_progress: { label: "In progress", cls: "bg-jci-blue-50" },
  review: { label: "Review", cls: "bg-jci-teal-25" },
  done: { label: "Done", cls: "bg-jci-teal" },
  cancelled: { label: "Cancelled", cls: "bg-surface text-muted-foreground" },
};

function Dashboard() {
  const { members } = useMe();
  const projects = useLeadProjects();
  const tasks = useQuery(q.tasks());
  const insights = useQuery({ queryKey: ["task_insights"], queryFn: getTaskInsights });
  const ledger = useQuery({ queryKey: ["xp_ledger", "all"], queryFn: getXpLedger });
  const [projectId, setProjectId] = useState<number | null>(null);
  const [filter, setFilter] = useState<TaskStatus | "all">("all");
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    if (projectId === null && projects.data.length) setProjectId(projects.data[0]!.id);
  }, [projects.data, projectId]);

  const projTasks = useMemo(() => (tasks.data ?? []).filter((t) => t.project_id === projectId && t.status !== "cancelled"), [tasks.data, projectId]);
  if (projects.isLoading || tasks.isLoading) return <LoadingBlock label="Loading your projects…" />;
  if (tasks.error) return <ErrorBlock error={tasks.error} onRetry={() => void tasks.refetch()} />;
  if (projects.data.length === 0) return <EmptyState title="No projects yet" message="Once you lead a project, its tasks show up here." />;

  const ids = new Set(projTasks.map((t) => t.id));
  const kpis = [
    { label: "Done", value: projTasks.filter((t) => t.status === "done").length },
    { label: "Waiting for review", value: projTasks.filter((t) => t.status === "review").length },
    { label: "Open", value: projTasks.filter((t) => t.status === "open" || t.status === "asked").length },
    { label: "XP awarded", value: (ledger.data ?? []).filter((r) => r.task_id && ids.has(r.task_id)).reduce((s, r) => s + r.xp, 0) },
  ];
  const shown = projTasks.filter((t) => filter === "all" || t.status === filter);
  const insightOf = (id: number) => insights.data?.find((i) => i.task_id === id);
  const openTask = projTasks.find((t) => t.id === openId);

  return (
    <div className="flex flex-col gap-5">
      <select
        aria-label="Project"
        className="min-h-11 rounded-xl border border-border bg-jci-white px-3 text-subheading focus:border-jci-blue focus:outline-none"
        value={projectId ?? ""}
        onChange={(e) => setProjectId(Number(e.target.value))}
      >
        {projects.data.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="p-4">
            <p className="text-sm text-muted-foreground">{k.label}</p>
            <p className="text-subtitle mt-1">{k.value}</p>
          </Card>
        ))}
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {FILTERS.map((f) => <Chip key={f.key} selected={filter === f.key} onClick={() => setFilter(f.key)}>{f.label}</Chip>)}
      </div>

      {shown.length === 0 ? (
        <EmptyState mood="sleep" title="Nothing here" message="No tasks with this status. Create one in a minute!" />
      ) : (
        <ul className="flex flex-col gap-2">
          {shown.map((t) => {
            const a = members.find((m) => m.id === t.assignee_id);
            const ins = insightOf(t.id);
            return (
              <li key={t.id}>
                <button onClick={() => setOpenId(t.id)} className="w-full text-left">
                  <Card className="flex flex-col gap-2 p-4 hover:border-jci-blue">
                    <div className="flex items-start gap-2">
                      <span className="min-w-0 flex-1 font-medium">{t.title}</span>
                      <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs", STATUS_PILL[t.status].cls)}>{STATUS_PILL[t.status].label}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                      {a && <span className="inline-flex items-center gap-1.5 text-jci-black"><Avatar name={a.name} color={a.avatar_color} size="sm" className="h-6 w-6 text-[10px]" />{a.name}</span>}
                      <span>{timeLabel(t.time_tag)}</span>
                      <XpBadge xp={t.xp} className="py-0.5" />
                      {ins && (t.status === "open" || t.status === "asked") && <span>open {ins.days_open} days</span>}
                    </div>
                  </Card>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <BottomSheet side open={!!openTask} onClose={() => setOpenId(null)} title={openTask?.title}>
        {openTask && <TaskPanel task={openTask} insight={insightOf(openTask.id)} />}
      </BottomSheet>
    </div>
  );
}
