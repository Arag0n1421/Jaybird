import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Clock, CalendarDays } from "lucide-react";
import { useMe } from "@/hooks/use-me";
import { Mascot } from "@/components/Mascot";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { XpBadge } from "@/components/ui/xp-badge";
import { LevelRing } from "@/components/ui/level-ring";
import { Stars } from "@/components/ui/stars";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";
import { LoadingBlock, ErrorBlock } from "@/components/StateViews";
import { q } from "@/lib/queries";
import { submitTask, type Task, type XpReason } from "@/lib/db";
import { formatDeadline, relativeTime, timeLabel } from "@/lib/format";
import { categoryLabel } from "@/lib/categories";
import { pageHead } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/task/$id")({
  head: () => pageHead("Task", "Task details on Jaybird."),
  component: TaskPage,
});

const XP_LABELS: Partial<Record<XpReason, string>> = {
  task: "Task done",
  peer_badge_received: "Peer badge received", peer_badge_given: "Gave a peer badge",
  spark_bonus: "Spark x2: social task, none done in 14 days",
  gap_bonus: "Your chapter needed this, x1.5",
  first_step: "First step!",
  streak_bonus: "Weekly streak",
  role_bonus: "Leadership bonus",
  reviewer: "Reviewer bonus",
  delegator: "Delegator bonus",
};

function TaskPage() {
  const { id } = Route.useParams();
  const taskId = Number(id);
  const { me, members } = useMe();
  const task = useQuery(q.task(taskId));
  const projects = useQuery(q.projects());
  const feedback = useQuery(q.taskFeedback(taskId));

  if (task.isLoading || !me) return <LoadingBlock label="Opening the task…" />;
  if (task.error) return <ErrorBlock error={task.error} onRetry={() => void task.refetch()} />;
  const t = task.data;
  if (!t) return <EmptyState mood="nudge" title="We couldn't find that task" message="It may have been removed." action={<Link to="/" className="text-jci-blue">Back home</Link>} />;

  const project = projects.data?.find((p) => p.id === t.project_id);
  const lead = members.find((m) => m.id === project?.lead_id);
  const fb = feedback.data ?? [];
  const mine = t.assignee_id === me.id;
  const changes = fb.find((f) => f.kind === "changes_requested" && (!t.submitted_at || new Date(f.created_at) > new Date(t.submitted_at)));
  const step = t.status === "done" ? 3 : t.status === "review" && !changes ? 2 : ["in_progress", "review"].includes(t.status) ? 1 : 0;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      {mine && t.status === "done" ? (
        <Celebration task={t} review={fb.find((f) => f.kind === "review")} />
      ) : (
        <>
          {step > 0 && <Stepper step={step} />}
          <header>
            <p className="text-sm text-jci-blue">{categoryLabel(t.category)}</p>
            <h1 className="text-subtitle mt-1">{t.title}</h1>
          </header>

          {changes && mine && t.status !== "done" && (
            <Card className="border-2 border-jci-navy">
              <p className="text-subheading">Small fix needed</p>
              <p className="mt-1">{changes.comment}</p>
              <p className="mt-2 text-xs text-muted-foreground">{relativeTime(changes.created_at)}</p>
            </Card>
          )}

          <Card className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4 text-jci-blue" /> {timeLabel(t.time_tag)}</span>
              <XpBadge xp={t.xp} />
              <span className="inline-flex items-center gap-1 text-muted-foreground"><CalendarDays className="h-4 w-4" /> {formatDeadline(t.deadline)}</span>
            </div>
            {t.description && <p className="whitespace-pre-line">{t.description}</p>}
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Project</dt><dd>{project?.name ?? "—"}</dd>
              <dt className="text-muted-foreground">Lead</dt><dd>{lead?.name ?? "—"}</dd>
              {!mine && <><dt className="text-muted-foreground">Status</dt><dd className="capitalize">{t.status.replace("_", " ")}</dd></>}
            </dl>
            {t.tags.length > 0 && <div className="flex flex-wrap gap-2">{t.tags.map((g) => <Chip key={g}>{g}</Chip>)}</div>}
          </Card>

          {mine && t.status === "in_progress" && <DoneButton task={t} meId={me.id} />}
          {mine && t.status === "review" && !changes && (
            <Mascot mood="idle" size={56} message="Waiting for review. Leads usually answer within 2 days." />
          )}
          {!mine && <p className="text-center text-sm text-muted-foreground">You're viewing this task.</p>}
        </>
      )}
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  const labels = ["Accepted", "Submitted", "Approved"];
  return (
    <ol className="flex items-center gap-2" aria-label="Progress">
      {labels.map((l, i) => {
        const done = step > i + 1 || (step === 3 && i === 2);
        const active = step === i + 1;
        return (
          <li key={l} className="flex flex-1 items-center gap-2">
            <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold",
              done ? "border-jci-blue bg-jci-blue text-jci-white" : active ? "border-jci-blue text-jci-blue" : "border-border text-muted-foreground")}>
              {done ? <Check className="h-4 w-4" /> : i + 1}
            </span>
            <span className={cn("text-xs", active || done ? "text-jci-black" : "text-muted-foreground")}>{l}</span>
            {i < 2 && <span className={cn("h-0.5 flex-1 rounded", step > i + 1 ? "bg-jci-blue" : "bg-border")} />}
          </li>
        );
      })}
    </ol>
  );
}

function DoneButton({ task, meId }: { task: Task; meId: number }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [clarity, setClarity] = useState(0);
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: () => submitTask(task.id, meId, note.trim(), clarity || null),
    onSuccess: (ok) => {
      if (!ok) {
        toast.error("Couldn't submit", "This task may have changed. Refresh and try again.");
        return;
      }
      setOpen(false);
      toast.success("Nice work! Sent for review.");
      void qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error("Couldn't submit", e.message),
  });
  return (
    <>
      <PrimaryButton block onClick={() => setOpen(true)}>I'm done</PrimaryButton>
      <BottomSheet open={open} onClose={() => setOpen(false)} title="Nice! Tell your lead">
        <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); if (note.trim()) m.mutate(); }}>
          <label className="flex flex-col gap-2">
            <span className="font-medium">What did you do?</span>
            <textarea required rows={3} maxLength={400} value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="Posted the recap on Instagram, link in chat."
              className="rounded-xl border border-border p-3 focus:border-jci-blue focus:outline-none" />
          </label>
          <div className="flex flex-col gap-2">
            <span className="font-medium">How clear was this task?</span>
            <Stars value={clarity} onChange={setClarity} />
          </div>
          <PrimaryButton type="submit" block disabled={!note.trim() || m.isPending}>{m.isPending ? "Sending…" : "Submit"}</PrimaryButton>
        </form>
      </BottomSheet>
    </>
  );
}

function useCountUp(target: number, ms = 1200) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setV(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

function Celebration({ task, review }: { task: Task; review?: { rating: number | null; comment: string | null; from_member: number } | undefined }) {
  const { me, members } = useMe();
  const navigate = useNavigate();
  const xp = useQuery(q.myXp(me!.id));
  const myBadges = useQuery(q.myBadges(me!.id));
  const badges = useQuery(q.badges());
  const rows = (xp.data ?? []).filter((r) => r.task_id === task.id);
  const total = rows.reduce((s, r) => s + r.xp, 0);
  const shown = useCountUp(total);
  const fired = useRef(false);
  const [ring, setRing] = useState(0);
  const stats = me!.stats;

  useEffect(() => {
    if (fired.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    fired.current = true;
    void import("canvas-confetti").then(({ default: confetti }) =>
      confetti({ particleCount: 120, spread: 75, origin: { y: 0.3 }, colors: ["#0097D7", "#57BCBC", "#EFC40F", "#1F4789"] }),
    );
  }, []);
  useEffect(() => {
    const id = setTimeout(() => setRing(stats ? stats.xp_in_level / stats.xp_per_level : 0), 200);
    return () => clearTimeout(id);
  }, [stats]);

  const recent = (myBadges.data ?? []).filter((b) => Date.now() - new Date(b.earned_at).getTime() < 10 * 60_000);
  const newBadges = recent.map((b) => badges.data?.find((x) => x.id === b.badge_id)).filter(Boolean);
  const reviewer = members.find((m) => m.id === review?.from_member);

  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <Stepper step={3} />
      <Mascot mood="cheer" size={96} message="You did it! 🎉" />
      <h1 className="text-subtitle">{task.title}</h1>
      <p className="text-title rounded-full bg-jci-black px-6 py-1" aria-live="polite">
        <span className="font-semibold text-jci-yellow">+{shown}</span> <span className="text-jci-white">XP</span>
      </p>
      {rows.length > 0 && (
        <Card className="w-full text-left">
          <ul className="flex flex-col gap-2">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3">
                <span>{XP_LABELS[r.reason] ?? r.reason}</span>
                <XpBadge xp={r.xp} />
              </li>
            ))}
          </ul>
        </Card>
      )}
      {newBadges.length > 0 && (
        <div className="flex flex-wrap justify-center gap-3">
          {newBadges.map((b) => (
            <div key={b!.id} className="flex w-24 flex-col items-center gap-1">
              <div className="flex h-16 w-14 items-center justify-center bg-jci-navy text-jci-yellow [clip-path:polygon(50%_0,100%_25%,100%_75%,50%_100%,0_75%,0_25%)]">★</div>
              <span className="text-xs font-medium">{b!.name}</span>
            </div>
          ))}
        </div>
      )}
      {review && (
        <Card className="w-full text-left">
          <Stars value={review.rating ?? 0} size={18} />
          {review.comment && <p className="mt-2">“{review.comment}”</p>}
          {reviewer && <p className="mt-1 text-sm text-muted-foreground">— {reviewer.name}</p>}
        </Card>
      )}
      {stats && (
        <div className="flex items-center gap-4">
          <LevelRing level={stats.level} progress={ring} size={72} />
          <p className="text-left">You're <span className="font-semibold">#{stats.chapter_rank}</span> in {stats.chapter_name}</p>
        </div>
      )}
      <SecondaryButton block onClick={() => void navigate({ to: "/" })}>Find my next one</SecondaryButton>
    </div>
  );
}
