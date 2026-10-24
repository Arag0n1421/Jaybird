import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Lightbulb } from "lucide-react";
import { useMe } from "@/hooks/use-me";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Avatar } from "@/components/ui/member-avatar";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { toast } from "@/components/ui/toast";
import { ErrorBlock } from "@/components/StateViews";
import { askTopMatches, cancelTask, createAsk, getAsksForTask, getRecommendations, rankMatches, updateOpenTask, type Recommendation, type Task, type TaskInsight, type TimeTag } from "@/lib/db";
import { relativeTime, timeLabel } from "@/lib/format";
import { TIME_CHIPS } from "@/lib/queries";
import { cn } from "@/lib/utils";

const REASON: Record<string, string> = { not_now: "Not now", not_my_thing: "Not my thing", too_long: "Too long" };

function MatchRecs({ memberId, recs, linkedin }: { memberId: number; recs: Recommendation[]; linkedin: string | null }) {
  const [open, setOpen] = useState(false);
  if (recs.length === 0) return null;
  const r = recs[0]!;
  return (
    <div className="flex flex-col gap-2">
      <button type="button" aria-expanded={open} aria-controls={`recs-${memberId}`} onClick={() => setOpen((o) => !o)} className="min-h-9 self-start rounded-full border border-jci-navy px-3 text-xs text-jci-navy">
        {recs.length} {recs.length === 1 ? "recommendation" : "recommendations"}
      </button>
      {open && (
        <blockquote id={`recs-${memberId}`} className="border-l-2 border-jci-teal pl-3 text-sm">
          <p>“{r.text}”</p>
          <footer className="mt-1 text-xs text-muted-foreground">{r.author_name}{r.author_title ? `, ${r.author_title}` : ""}</footer>
          {linkedin && <a href={linkedin} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs text-jci-blue underline">View LinkedIn</a>}
        </blockquote>
      )}
    </div>
  );
}

export function TaskPanel({ task, insight }: { task: Task; insight?: TaskInsight | undefined }) {
  const { me, members } = useMe();
  const qc = useQueryClient();
  const asks = useQuery({ queryKey: ["asks", "task", task.id], queryFn: () => getAsksForTask(task.id) });
  const isOpen = task.status === "open" || task.status === "asked";
  const matches = useQuery({ queryKey: ["matches", task.id], queryFn: () => rankMatches(task.id, 5), enabled: isOpen });
  const recs = useQuery({ queryKey: ["recommendations"], queryFn: getRecommendations, enabled: isOpen });
  const pending = (asks.data ?? []).filter((a) => a.status === "pending").length;
  const full = pending >= 3;
  const done = () => void qc.invalidateQueries();
  // A refused ask (for example the server's three-pending limit) means our copy of
  // the ask list is out of date: show the reason, then refetch so the screen
  // matches what the server actually holds.
  const onErr = (e: Error) => {
    toast.error("That didn't go through", e.message);
    void qc.invalidateQueries({ queryKey: ["asks"] });
  };

  const ask = useMutation({ mutationFn: (m: number) => createAsk(task.id, m, me!.id), onSuccess: () => { toast.success("Asked! They'll see it on their Home."); done(); }, onError: onErr });
  const top3 = useMutation({ mutationFn: () => askTopMatches(task.id, me!.id, 3), onSuccess: (n) => { toast.success(n ? `Asked ${n} ${n === 1 ? "person" : "people"} personally.` : "Everyone good is already asked."); done(); }, onError: onErr });

  const hint = (() => {
    if (!insight) return null;
    if (insight.too_long_count >= 2) return { text: "Members say it's too long. Split it." };
    if (insight.declined_count >= 3 && insight.yes_count === 0) return { text: `Asked ${insight.asked_count} people, no takers. Add a skill, shorten it or raise the XP.` };
    if (insight.days_open >= 5 && isOpen) return { text: `Open ${insight.days_open} days. Share it in the chat?`, share: true };
    return null;
  })();

  function copyShare() {
    const msg = `🙋 ${task.title} · ${timeLabel(task.time_tag)} · +${task.xp} XP -> claim it in Jaybird: ${window.location.origin}/task/${task.id}`;
    navigator.clipboard.writeText(msg).then(() => toast.success("Copied. Paste it in WhatsApp!"), () => toast.error("Couldn't copy"));
  }

  return (
    <div className="flex flex-col gap-6">
      {hint && (
        <div className="flex flex-col gap-2 rounded-xl border border-jci-teal bg-jci-teal-25 p-3 text-sm">
          <p className="flex gap-2"><Lightbulb className="h-4 w-4 shrink-0" /> {hint.text}</p>
          {hint.share && <SecondaryButton className="min-h-9 self-start px-3 text-sm" onClick={copyShare}><Copy className="h-4 w-4" /> Copy for WhatsApp</SecondaryButton>}
        </div>
      )}

      <Details task={task} editable={task.status === "open"} />

      {isOpen && (
        <section className="flex flex-col gap-3">
          <h3 className="text-subheading">Best matches</h3>
          {full && <p className="text-sm text-muted-foreground">3 people are already asked. Wait for an answer.</p>}
          {matches.isLoading ? <div className="h-24 animate-pulse rounded-xl bg-surface" /> : matches.error ? <ErrorBlock error={matches.error} /> :
            (matches.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No good matches yet. Try adding a skill tag.</p> :
            matches.data!.map((m) => (
              <Card key={m.member_id} className="flex flex-col gap-2 p-4">
                <div className="flex items-center gap-3">
                  <Avatar name={m.name} color={m.avatar_color} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{m.name}{m.is_new && <span className="ml-1 text-xs text-jci-blue">new</span>}</p>
                    <p className="truncate text-xs text-muted-foreground">{m.chapter_name} · {m.role}</p>
                  </div>
                  <SecondaryButton className="min-h-9 px-3 text-sm" disabled={full || ask.isPending} onClick={() => ask.mutate(m.member_id)}>Ask</SecondaryButton>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-jci-blue-25"><div className="h-full rounded-full bg-jci-blue" style={{ width: `${m.match_pct}%` }} /></div>
                  <span className="text-xs font-medium">{m.match_pct}%</span>
                </div>
                <div className="flex flex-wrap gap-1.5">{m.reasons.map((r) => <Chip key={r} tone="teal" className="text-xs">{r}</Chip>)}</div>
                <MatchRecs memberId={m.member_id} recs={(recs.data ?? []).filter((r) => r.member_id === m.member_id)} linkedin={members.find((x) => x.id === m.member_id)?.linkedin_url ?? null} />
                {m.pending_asks > 0 && <p className="text-xs text-muted-foreground">{m.pending_asks} other asks open</p>}
              </Card>
            ))}
          <PrimaryButton block disabled={full || top3.isPending} onClick={() => top3.mutate()}>Ask top 3</PrimaryButton>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h3 className="text-subheading">Who we asked</h3>
        {(asks.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Nobody yet.</p> : (
          <ol className="flex flex-col gap-3 border-l-2 border-border pl-4">
            {asks.data!.map((a) => {
              const m = members.find((x) => x.id === a.member_id);
              return (
                <li key={a.id} className="flex flex-col gap-0.5">
                  {a.auto && <p className="text-xs text-jci-blue">Jaybird asked the next best match</p>}
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate font-medium">{m?.name ?? "Member"}</span>
                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs", a.status === "accepted" ? "bg-jci-teal-25" : a.status === "declined" ? "bg-surface" : "bg-jci-blue-25")}>
                      {a.status === "pending" ? "Waiting" : a.status === "accepted" ? "Said yes" : REASON[a.reason ?? "not_now"] ?? "Not now"}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">{relativeTime(a.asked_at)}</span>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}

function Details({ task, editable }: { task: Task; editable: boolean }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ title: task.title, description: task.description ?? "", time_tag: task.time_tag, xp: task.xp, deadline: task.deadline?.slice(0, 10) ?? "" });
  useEffect(() => setF({ title: task.title, description: task.description ?? "", time_tag: task.time_tag, xp: task.xp, deadline: task.deadline?.slice(0, 10) ?? "" }), [task]);
  const save = useMutation({
    mutationFn: () => updateOpenTask(task.id, { title: f.title.trim(), description: f.description.trim() || null, time_tag: f.time_tag, xp: f.xp, deadline: f.deadline || null }),
    onSuccess: () => { toast.success("Saved"); void qc.invalidateQueries(); },
    onError: (e: Error) => toast.error("Couldn't save", e.message),
  });
  const cancel = useMutation({
    mutationFn: () => cancelTask(task.id),
    onSuccess: () => { toast.info("Task cancelled"); void qc.invalidateQueries(); },
    onError: (e: Error) => toast.error("Couldn't cancel", e.message),
  });
  if (!editable) {
    return (
      <section className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">{timeLabel(task.time_tag)} · +{task.xp} XP</p>
        {task.description && <p className="whitespace-pre-line">{task.description}</p>}
      </section>
    );
  }
  const input = "w-full rounded-xl border border-border px-3 py-2 focus:border-jci-blue focus:outline-none";
  return (
    <section className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">Title<input className={input} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></label>
      <label className="flex flex-col gap-1 text-sm">Description<textarea rows={3} className={input} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></label>
      <div className="flex flex-wrap gap-2">{TIME_CHIPS.map((c) => <Chip key={c.tag} selected={f.time_tag === c.tag} onClick={() => setF({ ...f, time_tag: c.tag as TimeTag })}>{c.label}</Chip>)}</div>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">XP<input type="number" min={5} max={500} className={input} value={f.xp} onChange={(e) => setF({ ...f, xp: Number(e.target.value) })} /></label>
        <label className="flex flex-col gap-1 text-sm">Deadline<input type="date" className={input} value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} /></label>
      </div>
      <div className="flex items-center justify-between gap-2">
        <button className="text-sm text-destructive" disabled={cancel.isPending} onClick={() => { if (confirm("Cancel this task?")) cancel.mutate(); }}>Cancel task</button>
        <SecondaryButton className="min-h-10 px-4" disabled={!f.title.trim() || save.isPending} onClick={() => save.mutate()}>Save changes</SecondaryButton>
      </div>
    </section>
  );
}
