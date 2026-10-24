import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMe } from "@/hooks/use-me";
import { useReviewQueue } from "@/hooks/use-lead";
import { Mascot } from "@/components/Mascot";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/member-avatar";
import { XpBadge } from "@/components/ui/xp-badge";
import { Stars } from "@/components/ui/stars";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";
import { LoadingBlock, ErrorBlock } from "@/components/StateViews";
import { approveTask, getFeedbackForTask, getXpLedger, requestChanges, type Task } from "@/lib/db";
import { firstName } from "@/lib/queries";
import { pageHead } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/lead/review")({
  head: () => pageHead("Review", "Approve finished tasks and give feedback."),
  component: Review,
});

function Review() {
  const queue = useReviewQueue();
  const [cheer, setCheer] = useState(false);
  if (queue.isLoading) return <LoadingBlock label="Checking what's waiting…" />;
  if (queue.error) return <ErrorBlock error={queue.error} onRetry={() => void queue.refetch()} />;
  return (
    <div className="flex flex-col gap-4">
      {cheer && <Mascot mood="cheer" size={56} message="That made someone's day!" />}
      {queue.data.length === 0 ? (
        <EmptyState mood="cheer" title="All reviewed!" message="Nothing waiting. Your team thanks you." />
      ) : (
        queue.data.map((t) => <ReviewItem key={t.id} task={t} onApproved={() => { setCheer(true); setTimeout(() => setCheer(false), 3500); }} />)
      )}
    </div>
  );
}

function waitText(iso: string | null) {
  if (!iso) return { text: "", late: false };
  const h = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000));
  return { text: h < 24 ? `waiting ${h} h` : `waiting ${Math.floor(h / 24)} ${Math.floor(h / 24) === 1 ? "day" : "days"}`, late: h >= 48 };
}

function ReviewItem({ task, onApproved }: { task: Task; onApproved: () => void }) {
  const { me, members } = useMe();
  const qc = useQueryClient();
  const assignee = members.find((m) => m.id === task.assignee_id);
  const fb = useQuery({ queryKey: ["feedback", task.id], queryFn: () => getFeedbackForTask(task.id) });
  const clarity = fb.data?.find((f) => f.kind === "task_clarity")?.rating;
  const [mode, setMode] = useState<"approve" | "fix">("approve");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const wait = waitText(task.submitted_at);

  const approve = useMutation({
    mutationFn: async () => {
      const ok = await approveTask(task.id, me!.id, rating, comment.trim() || null);
      if (!ok) throw new Error("This task may have changed.");
      return (await getXpLedger()).filter((r) => r.task_id === task.id);
    },
    onSuccess: (rows) => {
      const theirs = rows.filter((r) => r.member_id === task.assignee_id);
      const total = theirs.reduce((s, r) => s + r.xp, 0);
      const extra = theirs.some((r) => r.reason === "spark_bonus") ? " with a x2 Spark" : theirs.some((r) => r.reason === "gap_bonus") ? " with a x1.5 chapter bonus" : "";
      const mine = rows.some((r) => r.member_id === me!.id && r.reason === "reviewer");
      toast.success(`Approved. ${firstName(assignee?.name) || "They"} gets +${total} XP${extra}`, mine ? "+5 XP for you for reviewing" : undefined);
      onApproved();
      void qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error("Couldn't approve", e.message),
  });
  const fix = useMutation({
    mutationFn: async () => {
      if (!(await requestChanges(task.id, me!.id, comment.trim()))) throw new Error("This task may have changed.");
    },
    onSuccess: () => { toast.info("Fix requested. Thanks for the clear note!"); void qc.invalidateQueries(); },
    onError: (e: Error) => toast.error("Couldn't send", e.message),
  });

  const input = "w-full rounded-xl border border-border px-3 py-2 focus:border-jci-blue focus:outline-none";
  return (
    <Card className={cn("flex flex-col gap-3", wait.late && "border-2 border-jci-navy")}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-subheading">{task.title}</p>
        <XpBadge xp={task.xp} className="shrink-0" />
      </div>
      {assignee && <div className="flex items-center gap-2"><Avatar name={assignee.name} color={assignee.avatar_color} size="sm" /><span>{assignee.name}</span></div>}
      {task.submission_note && <p className="rounded-xl bg-surface p-3">“{task.submission_note}”</p>}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        {clarity != null && <span className="inline-flex items-center gap-1 text-muted-foreground">Clarity <Stars value={clarity} size={14} /></span>}
        <span className={wait.late ? "font-medium text-jci-navy" : "text-muted-foreground"}>{wait.text}</span>
      </div>
      {wait.late && <p className="text-sm text-jci-navy">People who hear back within 2 days come back.</p>}

      <div className="flex gap-4 border-b border-border text-sm">
        {(["approve", "fix"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)} className={cn("-mb-px min-h-11 border-b-2 py-2", mode === m ? "border-jci-blue text-jci-blue" : "border-transparent text-muted-foreground")}>
            {m === "approve" ? "Approve" : "Request a fix"}
          </button>
        ))}
      </div>
      {mode === "approve" ? (
        <div className="flex flex-col gap-3">
          <Stars value={rating} onChange={setRating} />
          <textarea rows={2} className={input} placeholder="Say one thing they did well" value={comment} onChange={(e) => setComment(e.target.value)} />
          <PrimaryButton block disabled={approve.isPending} onClick={() => approve.mutate()}>{approve.isPending ? "Approving…" : "Approve"}</PrimaryButton>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <textarea rows={2} required className={input} placeholder="What small thing needs fixing?" value={comment} onChange={(e) => setComment(e.target.value)} />
          <SecondaryButton block disabled={!comment.trim() || fix.isPending} onClick={() => fix.mutate()}>Send fix request</SecondaryButton>
        </div>
      )}
    </Card>
  );
}
