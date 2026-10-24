import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, CheckCircle2 } from "lucide-react";
import { useMe } from "@/hooks/use-me";
import { PageTitle } from "@/components/AppShell";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingBlock, ErrorBlock } from "@/components/StateViews";
import { cq } from "@/lib/community";
import { categoryLabel } from "@/lib/categories";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/projects/")({
  head: () => pageHead("Projects", "Every JCI project, its team, progress and open tasks."),
  component: ProjectsPage,
});

const sel = "min-h-11 rounded-xl border border-border bg-jci-white px-3 text-sm";

function ProjectsPage() {
  const { chapters } = useMe();
  const projects = useQuery(cq.projects());
  const stats = useQuery(cq.projectStats());
  const [chapter, setChapter] = useState("");
  const [country, setCountry] = useState("");
  const [status, setStatus] = useState<"" | "active" | "closed">("");
  const [cat, setCat] = useState("");

  const countries = [...new Set(chapters.map((c) => c.country))].sort();
  const cats = useMemo(() => [...new Set((stats.data ?? []).flatMap((s) => s.categories ?? []))].sort(), [stats.data]);
  const statOf = (id: number) => stats.data?.find((s) => s.project_id === id);
  const list = (projects.data ?? []).filter((p) => {
    const ch = chapters.find((c) => c.id === p.chapter_id);
    if (chapter && String(p.chapter_id) !== chapter) return false;
    if (country && ch?.country !== country) return false;
    if (status && p.status !== status) return false;
    if (cat && !(statOf(p.id)?.categories ?? []).includes(cat)) return false;
    return true;
  });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <PageTitle title="Projects" subtitle="Join a team, see what's moving, pick up a task." />
      <div className="flex flex-wrap gap-2">
        <select aria-label="Chapter" className={sel} value={chapter} onChange={(e) => setChapter(e.target.value)}>
          <option value="">All chapters</option>
          {chapters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select aria-label="Country" className={sel} value={country} onChange={(e) => setCountry(e.target.value)}>
          <option value="">All countries</option>
          {countries.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select aria-label="Task category" className={sel} value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">All task types</option>
          {cats.map((c) => <option key={c} value={c}>{categoryLabel(c)}</option>)}
        </select>
      </div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4" role="group" aria-label="Status">
        {([["", "All"], ["active", "Active"], ["closed", "Closed"]] as const).map(([k, l]) => (
          <Chip key={k} selected={status === k} onClick={() => setStatus(k)}>{l}</Chip>
        ))}
      </div>
      {projects.isLoading || stats.isLoading ? <LoadingBlock label="Gathering projects…" /> : projects.error || stats.error ? (
        <ErrorBlock error={projects.error ?? stats.error} onRetry={() => { void projects.refetch(); void stats.refetch(); }} />
      ) : list.length === 0 ? (
        <EmptyState mood="sleep" title="No projects match" message="Try clearing a filter." />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => {
            const s = statOf(p.id);
            const ch = chapters.find((c) => c.id === p.chapter_id);
            return (
              <li key={p.id}>
                <Link to="/projects/$id" params={{ id: String(p.id) }} className="flex h-full flex-col overflow-hidden rounded-xl border border-border hover:border-jci-blue">
                  {p.cover_url ? <img src={p.cover_url} alt="" loading="lazy" className="h-36 w-full object-cover" /> : <div className="h-36 bg-surface" />}
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold">{p.name}</p>
                      {p.status === "closed" && <Chip tone="navy" className="shrink-0 py-0 text-xs">Closed</Chip>}
                    </div>
                    <p className="text-sm text-muted-foreground">{ch?.name}{ch && ` · ${ch.country}`}</p>
                    {s && (
                      <>
                        <div className="h-1.5 rounded-full bg-surface"><div className="h-full rounded-full bg-jci-blue" style={{ width: `${Math.min(100, s.progress_pct)}%` }} /></div>
                        <p className="flex flex-wrap gap-x-3 text-sm text-muted-foreground">
                          <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />{s.tasks_done}/{s.task_count} done</span>
                          <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" strokeWidth={1.75} />{s.participant_count}</span>
                          {s.open_tasks > 0 && <span>{s.open_tasks} open</span>}
                        </p>
                      </>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
