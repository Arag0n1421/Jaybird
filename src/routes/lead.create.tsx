import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, Lightbulb, Plus } from "lucide-react";
import { useMe } from "@/hooks/use-me";
import { useLeadProjects } from "@/hooks/use-lead";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { Avatar } from "@/components/ui/member-avatar";
import { toast } from "@/components/ui/toast";
import { EmptyState } from "@/components/ui/empty-state";
import { useCategories } from "@/lib/categories";
import { askTopMatches, getSkills, insertTask, parseTask, rankMatches, type Task, type TimeTag } from "@/lib/db";
import { TIME_CHIPS } from "@/lib/queries";
import { pageHead } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/lead/create")({
  head: () => pageHead("New task", "Turn a WhatsApp message into tasks for your project."),
  component: Create,
});

const XP_BY_TIME: Record<TimeTag, number> = { "15m": 30, "1h": 60, half_day: 120 };
type Draft = { key: number; title: string; description: string; category: string; tags: string[]; time_tag: TimeTag; xp: number; deadline: string; project_id: number | null };
let seq = 0;
const blank = (project: number | null): Draft => ({ key: ++seq, title: "", description: "", category: "project", tags: [], time_tag: "1h", xp: 60, deadline: "", project_id: project });

function Create() {
  const { me } = useMe();
  const qc = useQueryClient();
  const projects = useLeadProjects();
  const defaultProject = projects.data[0]?.id ?? null;
  const [tab, setTab] = useState<"paste" | "manual">("paste");
  const [text, setText] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [engineNote, setEngineNote] = useState(false);
  const [published, setPublished] = useState<Task[]>([]);

  const parse = useMutation({
    mutationFn: () => parseTask(text.trim()),
    onSuccess: (res) => {
      setEngineNote(res.engine === "rules");
      if (!res.tasks?.length) {
        toast.info("Jay couldn't find a task in that. Try describing it a bit more.");
        return;
      }
      setDrafts(res.tasks.map((t) => ({ key: ++seq, title: t.title, description: t.description ?? "", category: t.category, tags: (t.tags ?? []).slice(0, 3), time_tag: t.time_tag, xp: t.xp || XP_BY_TIME[t.time_tag], deadline: t.deadline?.slice(0, 10) ?? "", project_id: defaultProject })));
    },
    onError: (e: Error) => toast.error("Jay couldn't read that one", e.message),
  });

  const publish = useMutation({
    mutationFn: async () => {
      const out: Task[] = [];
      for (const d of drafts) {
        const p = projects.data.find((x) => x.id === d.project_id);
        if (!p) throw new Error(`Pick a project for "${d.title || "untitled"}"`);
        out.push(await insertTask({
          title: d.title.trim(), description: d.description.trim() || null, category: d.category, tags: d.tags, time_tag: d.time_tag,
          xp: d.xp, deadline: d.deadline || null, project_id: p.id, chapter_id: p.chapter_id, created_by: me!.id, verifier_id: me!.id,
          status: "open", source: tab === "paste" ? "whatsapp" : "manual",
        }));
      }
      return out;
    },
    onSuccess: (tasks) => {
      setText("");
      setDrafts([]);
      setPublished(tasks);
      toast.success(`${tasks.length} ${tasks.length === 1 ? "task is" : "tasks are"} live. Want to ask the best matches?`);
      void qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error("Couldn't publish", e.message),
  });

  const update = (key: number, patch: Partial<Draft>) => setDrafts((ds) => ds.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  const canPublish = drafts.length > 0 && drafts.every((d) => d.title.trim() && d.project_id);

  if (!projects.isLoading && projects.data.length === 0) return <EmptyState title="No projects to post into" message="Tasks belong to a project you lead." />;

  return (
    <div className="flex flex-col gap-5">
      <div className="inline-flex self-start rounded-xl bg-surface p-1">
        {(["paste", "manual"] as const).map((t) => (
          <button key={t} onClick={() => { setTab(t); setDrafts(t === "manual" ? [blank(defaultProject)] : []); setPublished([]); }}
            className={cn("min-h-11 rounded-lg px-4 py-2 text-sm", tab === t ? "bg-jci-white font-medium text-jci-blue shadow-sm" : "text-muted-foreground")}>
            {t === "paste" ? "Paste a message" : "Write it myself"}
          </button>
        ))}
      </div>

      {tab === "paste" && (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-2">
            <span>Paste a WhatsApp message or just describe what you need</span>
            <textarea rows={5} value={text} onChange={(e) => setText(e.target.value)}
              placeholder="Hey all! We need someone to design a poster for Family Day by Friday, and two people to call cafés about sponsorship 🙏"
              className="rounded-xl border border-border p-3 focus:border-jci-blue focus:outline-none" />
          </label>
          <SecondaryButton className="self-start" disabled={!text.trim() || parse.isPending} onClick={() => parse.mutate()}>
            {parse.isPending ? "Reading your message…" : "Turn into tasks"}
          </SecondaryButton>
          {engineNote && <p className="text-xs text-muted-foreground">Basic reading. An admin can switch on the AI key for smarter results.</p>}
        </div>
      )}

      {drafts.map((d) => (
        <DraftCard key={d.key} d={d} projects={projects.data} onChange={(p) => update(d.key, p)} onRemove={() => setDrafts((ds) => ds.filter((x) => x.key !== d.key))} />
      ))}

      {tab === "manual" && <button className="inline-flex items-center gap-1 self-start text-sm text-jci-blue" onClick={() => setDrafts((ds) => [...ds, blank(defaultProject)])}><Plus className="h-4 w-4" /> Add another</button>}

      {drafts.length > 0 && (
        <PrimaryButton block disabled={!canPublish || publish.isPending} onClick={() => publish.mutate()}>
          {publish.isPending ? "Publishing…" : drafts.length > 1 ? `Publish all ${drafts.length}` : "Publish"}
        </PrimaryButton>
      )}

      {published.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-subheading">Now ask the right people</h2>
          {published.map((t) => <PublishedRow key={t.id} task={t} />)}
        </section>
      )}
    </div>
  );
}

function DraftCard({ d, projects, onChange, onRemove }: { d: Draft; projects: { id: number; name: string }[]; onChange: (p: Partial<Draft>) => void; onRemove: () => void }) {
  const cats = useCategories();
  const skills = useQuery({ queryKey: ["skills"], queryFn: getSkills, staleTime: Infinity });
  const input = "w-full rounded-xl border border-border bg-jci-white px-3 py-2 focus:border-jci-blue focus:outline-none";
  const tips = [
    d.time_tag === "half_day" && "Tasks under an hour get picked up faster. Can you split it?",
    d.tags.length === 0 && "Add a skill so the right people see it",
    d.description.trim().length < 30 && "Add one line on what 'done' looks like",
  ].filter(Boolean) as string[];
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start gap-2">
        <input aria-label="Title" placeholder="Task title" className={cn(input, "font-medium")} value={d.title} onChange={(e) => onChange({ title: e.target.value })} />
        <button aria-label="Remove draft" onClick={onRemove} className="rounded-lg p-2 text-muted-foreground hover:bg-surface"><Trash2 className="h-5 w-5" /></button>
      </div>
      <textarea aria-label="Description" rows={2} placeholder="What needs doing, and what 'done' looks like" className={input} value={d.description} onChange={(e) => onChange({ description: e.target.value })} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">Category
          <select className={input} value={d.category} onChange={(e) => onChange({ category: e.target.value })}>
            {(cats.data ?? []).map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">Project
          <select className={input} value={d.project_id ?? ""} onChange={(e) => onChange({ project_id: Number(e.target.value) })}>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
      </div>
      <div className="flex flex-col gap-1 text-sm">Skills (up to 3)
        <div className="flex flex-wrap gap-1.5">
          {(skills.data ?? []).map((s) => {
            const on = d.tags.includes(s.key);
            return <Chip key={s.key} selected={on} onClick={() => onChange({ tags: on ? d.tags.filter((t) => t !== s.key) : d.tags.length < 3 ? [...d.tags, s.key] : d.tags })}>{s.label}</Chip>;
          })}
        </div>
      </div>
      <div className="flex flex-col gap-1 text-sm">Time
        <div className="inline-flex self-start rounded-xl bg-surface p-1">
          {TIME_CHIPS.map((c) => (
            <button key={c.tag} onClick={() => onChange({ time_tag: c.tag as TimeTag, xp: XP_BY_TIME[c.tag as TimeTag] })}
              className={cn("rounded-lg px-3 py-1.5", d.time_tag === c.tag ? "bg-jci-white font-medium text-jci-blue shadow-sm" : "text-muted-foreground")}>{c.label}</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">XP<input type="number" min={5} max={500} className={input} value={d.xp} onChange={(e) => onChange({ xp: Number(e.target.value) })} /></label>
        <label className="flex flex-col gap-1 text-sm">Deadline<input type="date" className={input} value={d.deadline} onChange={(e) => onChange({ deadline: e.target.value })} /></label>
      </div>
      {tips.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-xl bg-surface p-3 text-sm">
          {tips.map((t) => <li key={t} className="flex gap-2"><Lightbulb className="h-4 w-4 shrink-0 text-jci-blue" />{t}</li>)}
        </ul>
      )}
    </Card>
  );
}

function PublishedRow({ task }: { task: Task }) {
  const { me } = useMe();
  const top = useQuery({ queryKey: ["matches", task.id, 1], queryFn: () => rankMatches(task.id, 1) });
  const [asked, setAsked] = useState(false);
  const ask = useMutation({
    mutationFn: () => askTopMatches(task.id, me!.id, 3),
    onSuccess: (n) => { setAsked(true); toast.success(`Asked ${n} ${n === 1 ? "person" : "people"} personally.`); },
    onError: (e: Error) => toast.error("Couldn't ask", e.message),
  });
  const m = top.data?.[0];
  return (
    <Card className="flex flex-col gap-3 p-4">
      <p className="font-medium">{task.title}</p>
      {m ? (
        <div className="flex items-center gap-2 text-sm"><Avatar name={m.name} color={m.avatar_color} size="sm" /> Top match: {m.name} · {m.match_pct}%</div>
      ) : top.isLoading ? <div className="h-8 animate-pulse rounded bg-surface" /> : <p className="text-sm text-muted-foreground">No match yet.</p>}
      <SecondaryButton className="min-h-10 self-start px-4" disabled={asked || ask.isPending} onClick={() => ask.mutate()}>{asked ? "Asked ✓" : "Ask top 3"}</SecondaryButton>
    </Card>
  );
}
