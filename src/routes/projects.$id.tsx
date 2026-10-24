import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, X, Users, ArrowLeft } from "lucide-react";
import { useMe } from "@/hooks/use-me";
import { Chip } from "@/components/ui/chip";
import { Avatar } from "@/components/ui/member-avatar";
import { PrimaryButton } from "@/components/ui/primary-button";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";
import { LoadingBlock, ErrorBlock } from "@/components/StateViews";
import { SampleTag } from "@/components/home/HomeFeed";
import { cq, isDemoText } from "@/lib/community";
import { q } from "@/lib/queries";
import { joinProject, leaveProject, type ProjectPhoto, type Task, type TaskStatus } from "@/lib/db";
import { timeLabel } from "@/lib/format";
import { pageHead } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/projects/$id")({
  head: () => pageHead("Project", "Project team, progress, tasks and gallery on Jaybird."),
  component: ProjectPage,
});

const GROUPS: { key: string; label: string; statuses: TaskStatus[] }[] = [
  { key: "open", label: "Open", statuses: ["open", "asked"] },
  { key: "progress", label: "In progress", statuses: ["in_progress"] },
  { key: "review", label: "Review", statuses: ["review"] },
  { key: "done", label: "Done", statuses: ["done"] },
  { key: "cancelled", label: "Cancelled", statuses: ["cancelled"] },
];

function ProjectPage() {
  const { id } = Route.useParams();
  const pid = Number(id);
  const { me, members, chapters } = useMe();
  const qc = useQueryClient();
  const projects = useQuery(cq.projects());
  const stats = useQuery(cq.projectStats());
  const pm = useQuery(cq.projectMembers());
  const tasks = useQuery(q.tasks());
  const photos = useQuery(cq.photos(pid));
  const [group, setGroup] = useState("open");

  const membership = useMutation({
    mutationFn: (join: boolean) => (join ? joinProject(pid, me!.id) : leaveProject(pid, me!.id)),
    onSuccess: async (ok, join) => {
      await qc.invalidateQueries({ predicate: (x) => ["project_members", "project_stats"].includes(String(x.queryKey[0])) });
      if (join) toast[ok ? "success" : "info"](ok ? "You're on the team!" : "Couldn't join this project", ok ? undefined : "It may be closed.");
      else toast.info(ok ? "You left the project." : "You weren't on this team.");
    },
    onError: (e: Error) => toast.error("That didn't go through", e.message),
  });

  if (projects.isLoading) return <LoadingBlock label="Opening the project…" />;
  if (projects.error) return <ErrorBlock error={projects.error} onRetry={() => void projects.refetch()} />;
  const p = projects.data?.find((x) => x.id === pid);
  if (!p) return <EmptyState mood="sleep" title="Project not found" message="It may have been removed." action={<Link to="/projects" className="min-h-11 font-bold text-jci-blue underline">All projects</Link>} />;

  const s = stats.data?.find((x) => x.project_id === pid);
  const chapter = chapters.find((c) => c.id === p.chapter_id);
  const lead = members.find((m) => m.id === p.lead_id);
  const projectTasks = (tasks.data ?? []).filter((t) => t.project_id === pid);
  // Team = joins + lead + assignees (deduplicated); the view already does this, fall back locally if missing.
  const teamIds = s?.participant_ids ?? [...new Set([...(pm.data ?? []).filter((x) => x.project_id === pid).map((x) => x.member_id), ...(p.lead_id ? [p.lead_id] : []), ...projectTasks.flatMap((t) => (t.assignee_id ? [t.assignee_id] : []))])];
  const team = teamIds.map((mid) => members.find((m) => m.id === mid)).filter(Boolean);
  const joined = (pm.data ?? []).some((x) => x.project_id === pid && x.member_id === me?.id);
  const closed = p.status === "closed";
  const shown = projectTasks.filter((t) => GROUPS.find((g) => g.key === group)!.statuses.includes(t.status));

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <Link to="/projects" className="flex min-h-11 items-center gap-1 self-start text-sm font-bold text-jci-blue"><ArrowLeft className="h-4 w-4" />Projects</Link>
      <section className="overflow-hidden rounded-xl border border-border">
        {p.cover_url && <img src={p.cover_url} alt="" className="h-48 w-full object-cover sm:h-64" />}
        <div className="flex flex-col gap-3 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-subtitle">{p.name}</h1>
            <Chip tone={closed ? "navy" : "teal"} className="py-0 text-xs">{closed ? "Closed" : "Active"}</Chip>
          </div>
          <p className="text-sm text-muted-foreground">{chapter?.name}{chapter && ` · ${chapter.country}`}{lead && ` · Led by ${lead.name}`}</p>
          {p.description && <p>{p.description}</p>}
          {s && (
            <div className="flex flex-col gap-1">
              <div className="h-2 rounded-full bg-surface"><div className="h-full rounded-full bg-jci-blue" style={{ width: `${Math.min(100, s.progress_pct)}%` }} /></div>
              <p className="text-sm text-muted-foreground"><span className="text-number text-jci-black">{Math.round(s.progress_pct)}%</span> done · {s.tasks_done} of {s.task_count} tasks{closed && <> · <span className="text-number text-jci-black">{s.total_xp}</span> XP earned</>}</p>
            </div>
          )}
          {me && !closed && (
            joined ? (
              <button disabled={membership.isPending} onClick={() => membership.mutate(false)} className="min-h-11 self-start rounded-full border border-border px-4 text-sm hover:border-coral">
                {membership.isPending ? "Saving…" : "Leave project"}
              </button>
            ) : (
              <PrimaryButton className="self-start" disabled={membership.isPending || pm.isLoading} onClick={() => membership.mutate(true)}>{membership.isPending ? "Joining…" : "Join project"}</PrimaryButton>
            )
          )}
          {closed && joined && <p className="text-sm text-muted-foreground">You were part of this team.</p>}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-subheading flex items-center gap-2"><Users className="h-5 w-5 text-jci-blue" strokeWidth={1.75} />Team <span className="text-number">{team.length}</span></h2>
        {team.length === 0 ? <p className="text-sm text-muted-foreground">No one yet. Join and be the first.</p> : (
          <ul className="flex flex-wrap gap-2">
            {team.map((m) => (
              <li key={m!.id}>
                <Link to="/people/$id" params={{ id: String(m!.id) }} className="flex min-h-11 items-center gap-2 rounded-full border border-border py-1 pl-1 pr-3 text-sm hover:border-jci-blue">
                  <Avatar name={m!.name} color={m!.avatar_color} size="sm" />{m!.name}{m!.id === p.lead_id && <span className="text-xs text-muted-foreground">Lead</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {(photos.data?.length ?? 0) > 0 && <Gallery photos={photos.data!} closed={closed} />}

      <section className="flex flex-col gap-3">
        <h2 className="text-subheading">Tasks</h2>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4" role="group" aria-label="Task status">
          {GROUPS.map((g) => {
            const n = projectTasks.filter((t) => g.statuses.includes(t.status)).length;
            if (g.key === "cancelled" && n === 0) return null;
            return <Chip key={g.key} selected={group === g.key} onClick={() => setGroup(g.key)}>{g.label} <span className="tabular-nums">{n}</span></Chip>;
          })}
        </div>
        {tasks.isLoading ? <div className="h-24 animate-pulse rounded-xl bg-surface" /> : shown.length === 0 ? <p className="text-sm text-muted-foreground">Nothing here right now.</p> : (
          <ul className="flex flex-col gap-2">{shown.map((t) => <TaskRow key={t.id} t={t} />)}</ul>
        )}
      </section>
    </div>
  );
}

function TaskRow({ t }: { t: Task }) {
  return (
    <li>
      <Link to="/task/$id" params={{ id: String(t.id) }} className="flex min-h-14 items-center gap-3 rounded-xl border border-border px-3 py-2 hover:border-jci-blue">
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{t.title}</p>
          <p className="text-sm text-muted-foreground">{timeLabel(t.time_tag)} · {t.xp} XP</p>
        </div>
      </Link>
    </li>
  );
}

function Gallery({ photos, closed }: { photos: ProjectPhoto[]; closed: boolean }) {
  const [open, setOpen] = useState<number | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const demo = photos.some((ph) => isDemoText(ph.caption));
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-subheading flex flex-wrap items-center gap-2">{closed ? "How it went" : "Gallery"} <span className="text-sm font-normal text-muted-foreground">{photos.length} photos</span>{demo && <SampleTag />}</h2>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {photos.map((ph, i) => (
          <li key={ph.id}>
            <button onClick={(e) => { opener.current = e.currentTarget; setOpen(i); }} className="block w-full overflow-hidden rounded-xl" aria-label={`Open photo ${i + 1}${ph.caption ? `: ${ph.caption}` : ""}`}>
              <img src={ph.url} alt={ph.caption ?? ""} loading="lazy" className="aspect-[4/3] w-full object-cover" />
            </button>
          </li>
        ))}
      </ul>
      {open !== null && <Lightbox photos={photos} index={open} onIndex={setOpen} onClose={() => { setOpen(null); opener.current?.focus(); }} />}
    </section>
  );
}

function Lightbox({ photos, index, onIndex, onClose }: { photos: ProjectPhoto[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const touch = useRef<number | null>(null);
  const n = photos.length;
  const go = (d: number) => onIndex((index + d + n) % n);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }); // re-bind each render so arrows use the current index
  const ph = photos[index]!;
  return (
    <div role="dialog" aria-modal="true" aria-label={`Photo ${index + 1} of ${n}`} className="fixed inset-0 z-50 flex flex-col bg-jci-black/95 text-jci-white"
      onTouchStart={(e) => { touch.current = e.touches[0]?.clientX ?? null; }}
      onTouchEnd={(e) => { const x = e.changedTouches[0]?.clientX; if (touch.current != null && x != null && Math.abs(x - touch.current) > 50) go(x < touch.current ? 1 : -1); touch.current = null; }}>
      <div className="flex items-center justify-between p-2">
        <span className="px-2 text-sm tabular-nums">{index + 1} / {n}</span>
        <button ref={closeRef} onClick={onClose} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-jci-white/10"><X className="h-6 w-6" /></button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2">
        <img src={ph.url} alt={ph.caption ?? ""} className="max-h-full max-w-full rounded-lg object-contain" />
        <button onClick={() => go(-1)} aria-label="Previous photo" className={cn("absolute left-2 flex h-11 w-11 items-center justify-center rounded-full bg-jci-black/60")}><ChevronLeft className="h-6 w-6" /></button>
        <button onClick={() => go(1)} aria-label="Next photo" className="absolute right-2 flex h-11 w-11 items-center justify-center rounded-full bg-jci-black/60"><ChevronRight className="h-6 w-6" /></button>
      </div>
      {ph.caption && <p className="p-4 text-center text-sm">{ph.caption}</p>}
    </div>
  );
}

