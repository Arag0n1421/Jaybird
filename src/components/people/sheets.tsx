import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { useMe } from "@/hooks/use-me";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { PrimaryButton } from "@/components/ui/primary-button";
import { toast } from "@/components/ui/toast";
import { BadgeIcon } from "@/components/BadgeIcon";
import { cq, TIER_COLOR, TIER_LABEL, TIER_RULE, TIERS } from "@/lib/community";
import { q } from "@/lib/queries";
import { createAsk, getAsks, getAsksForTask, getPeerBadge, getTask, givePeerBadge, setFollow, type Ask, type Member, type Task } from "@/lib/db";
import { timeLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Follow toggle. set_follow returns the desired state, so false is a successful unfollow. */
export function FollowButton({ target, className }: { target: Member; className?: string }) {
  const { me } = useMe();
  const qc = useQueryClient();
  const follows = useQuery(cq.follows());
  const on = (follows.data ?? []).some((f) => f.follower_id === me?.id && f.followee_id === target.id);
  const m = useMutation({
    mutationFn: (next: boolean) => setFollow(me!.id, target.id, next),
    onSuccess: async (state) => {
      await qc.invalidateQueries({ queryKey: ["follows"] });
      toast.success(state ? `Following ${target.name}` : `Unfollowed ${target.name}`);
    },
    onError: (e: Error) => toast.error("That didn't go through", e.message),
  });
  if (!me || me.id === target.id) return null;
  return (
    <button aria-pressed={on} disabled={m.isPending || follows.isLoading} onClick={() => m.mutate(!on)}
      className={cn("min-h-11 rounded-full border px-4 text-sm font-bold", on ? "border-jci-blue bg-jci-blue-25" : "border-jci-blue hover:bg-jci-blue-25", className)}>
      {m.isPending ? "Saving…" : on ? "Following" : "Follow"}
    </button>
  );
}

/** Give a peer badge. Tiers and allowances come from the server; it also writes XP, news and notifications. */
export function GiveBadgeSheet({ receiver, open, onClose }: { receiver: Member; open: boolean; onClose: () => void }) {
  const { me } = useMe();
  const qc = useQueryClient();
  const badges = useQuery(cq.badges());
  const allowance = useQuery({ ...cq.allowance(me?.id ?? 0), enabled: !!me && open });
  const peers = useQuery(cq.peerBadges());
  const [badgeId, setBadgeId] = useState<number | null>(null);
  const [note, setNote] = useState("");
  useEffect(() => { setBadgeId(null); setNote(""); }, [me?.id, receiver.id]);
  const season = new Date().getFullYear();
  const already = (peers.data ?? []).find((p) => p.giver_id === me?.id && p.receiver_id === receiver.id && p.season === season);
  const trimmed = note.trim();

  const give = useMutation({
    mutationFn: async () => {
      const id = await givePeerBadge(me!.id, receiver.id, badgeId!, trimmed);
      return getPeerBadge(id);
    },
    onSuccess: async (row) => {
      await qc.invalidateQueries({ predicate: (x) => ["peer_badges", "allowance", "xp_ledger", "member_stats", "leaderboard", "news", "notifications"].includes(String(x.queryKey[0])) });
      toast.success(`Badge sent to ${receiver.name}`, row ? "Saved. They'll get a notification." : undefined);
      setNote(""); setBadgeId(null); onClose();
    },
    onError: (e: Error) => toast.error("Couldn't give the badge", e.message),
  });

  const peerBadges = (badges.data ?? []).filter((b) => b.kind === "peer");
  const allow = (tier: string) => allowance.data?.find((a) => a.tier === tier);
  const chosen = peerBadges.find((b) => b.id === badgeId);
  const chosenAllow = chosen?.tier ? allow(chosen.tier) : undefined;
  const can = !!chosen && !!chosenAllow?.eligible && chosenAllow.remaining > 0 && !allowance.isFetching && trimmed.length >= 1 && trimmed.length <= 140 && !already && !give.isPending;

  return (
    <BottomSheet open={open} onClose={onClose} title={`Give ${receiver.name.split(" ")[0]} a badge`}>
      {!me ? <p className="text-muted-foreground">Pick who you're acting as first.</p> : me.id === receiver.id ? <p className="text-muted-foreground">You can't give a badge to yourself.</p> : allowance.isLoading || badges.isLoading || peers.isLoading ? <div className="h-40 animate-pulse rounded-xl bg-surface" /> : allowance.error ? (
        <p className="text-muted-foreground">Couldn't load your giving power. <button className="min-h-11 underline" onClick={() => void allowance.refetch()}>Try again</button></p>
      ) : badges.error || peers.error ? (
        <p className="text-muted-foreground">Couldn't load badges. <button className="min-h-11 underline" onClick={() => { void badges.refetch(); void peers.refetch(); }}>Try again</button></p>
      ) : already ? (
        <p>You already recognized {receiver.name} this season. One badge per person per season keeps it meaningful.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {TIERS.map((tier) => {
            const a = allow(tier);
            const list = peerBadges.filter((b) => b.tier === tier);
            if (list.length === 0) return null;
            const locked = !a?.eligible;
            const empty = !!a && a.eligible && a.remaining <= 0;
            return (
              <fieldset key={tier} className="flex flex-col gap-2" disabled={locked || empty}>
                <legend className="mb-1 flex w-full flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2 font-bold"><span className="h-3 w-3 rounded-full" style={{ background: TIER_COLOR[tier] }} />{TIER_LABEL[tier]}{a && <span className="font-normal text-muted-foreground">+{a.xp} XP to them</span>}</span>
                  {a && !locked && <span className="tabular-nums text-muted-foreground">{a.remaining} of {a.quota} left</span>}
                </legend>
                {locked && <p className="flex items-center gap-1 text-xs text-muted-foreground"><Lock className="h-3.5 w-3.5" />{TIER_RULE[tier]}</p>}
                {empty && <p className="text-xs text-muted-foreground">You've used all {TIER_LABEL[tier]} badges this season.</p>}
                {list.map((b) => (
                  <label key={b.id} className={cn("flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2", badgeId === b.id ? "border-2 border-jci-blue" : "border-border", (locked || empty) && "cursor-not-allowed opacity-50")}>
                    <input type="radio" name="peer-badge" className="sr-only" checked={badgeId === b.id} onChange={() => setBadgeId(b.id)} />
                    <BadgeIcon code={b.code} icon={b.icon} tier={b.tier} size={40} />
                    <span className="min-w-0"><span className="block font-bold">{b.name}</span>{b.description && <span className="block text-sm text-muted-foreground">{b.description}</span>}</span>
                  </label>
                ))}
              </fieldset>
            );
          })}
          <label className="flex flex-col gap-1">
            <span className="text-sm font-bold">Why? (required)</span>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={140} rows={3} className="rounded-xl border border-border p-3" placeholder="You turned a messy brief into a clear plan." />
            <span className="self-end text-xs tabular-nums text-muted-foreground">{trimmed.length}/140</span>
          </label>
          <p className="text-xs text-muted-foreground">You get +5 XP for giving. XP is saved by the server.</p>
          <PrimaryButton block disabled={!can} onClick={() => give.mutate()}>{give.isPending ? "Sending…" : "Give badge"}</PrimaryButton>
        </div>
      )}
    </BottomSheet>
  );
}

/** Leads pick one of their own open tasks and send a personal ask. No forced assignment. */
export function AskSheet({ target, open, onClose }: { target: Member; open: boolean; onClose: () => void }) {
  const { me } = useMe();
  const qc = useQueryClient();
  const tasks = useQuery(q.tasks());
  const projects = useQuery(q.projects());
  const asks = useQuery({ queryKey: ["asks", "all"], queryFn: getAsks, enabled: open });
  const [taskId, setTaskId] = useState<number | null>(null);
  useEffect(() => { setTaskId(null); }, [me?.id, target.id]);
  const isBoard = me?.role === "board" || me?.role === "president";
  const mineProjects = new Set((projects.data ?? []).filter((p) => p.lead_id === me?.id || (isBoard && p.chapter_id === me?.chapter_id)).map((p) => p.id));
  const eligible = (tasks.data ?? []).filter((t) => (t.status === "open" || t.status === "asked") && !t.assignee_id && ((t.project_id && mineProjects.has(t.project_id)) || t.created_by === me?.id));
  const blockReason = (t: Task, list: Ask[]) => {
    const forTask = list.filter((a) => a.task_id === t.id);
    if (forTask.some((a) => a.member_id === target.id)) return `${target.name.split(" ")[0]} was already asked about this one.`;
    if (forTask.filter((a) => a.status === "pending").length >= 3) return "Already 3 people waiting to answer. Wait for a reply first.";
    return null;
  };
  const ask = useMutation({
    mutationFn: async () => {
      // Recheck against fresh server state right before sending.
      const [fresh, freshAsks] = await Promise.all([getTask(taskId!), getAsksForTask(taskId!)]);
      if (!fresh || !(fresh.status === "open" || fresh.status === "asked") || fresh.assignee_id) throw new Error("This task is no longer open.");
      const why = blockReason(fresh, freshAsks);
      if (why) throw new Error(why);
      return createAsk(taskId!, target.id, me!.id);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ predicate: (x) => ["asks", "tasks", "notifications"].includes(String(x.queryKey[0])) });
      toast.success(`Asked ${target.name} personally`, "They'll see it at the top of Home.");
      setTaskId(null); onClose();
    },
    onError: (e: Error) => { toast.error("Couldn't send the ask", e.message); void qc.invalidateQueries({ queryKey: ["asks"] }); void qc.invalidateQueries({ queryKey: ["tasks"] }); },
  });
  const askList = asks.data ?? [];
  return (
    <BottomSheet open={open} onClose={onClose} title={`Ask ${target.name.split(" ")[0]} personally`}>
      {tasks.isLoading || projects.isLoading || asks.isLoading ? <div className="h-32 animate-pulse rounded-xl bg-surface" /> : tasks.error || projects.error || asks.error ? (
        <p className="text-muted-foreground">Couldn't load your tasks. <button className="min-h-11 underline" onClick={() => { void tasks.refetch(); void projects.refetch(); void asks.refetch(); }}>Try again</button></p>
      ) : eligible.length === 0 ? (
        <p className="text-muted-foreground">You have no open tasks to ask about right now. Create one in Lead first.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {eligible.map((t) => {
            const why = blockReason(t, askList);
            return (
              <label key={t.id} className={cn("flex min-h-14 items-center gap-3 rounded-xl border px-3 py-2 focus-within:ring-2 focus-within:ring-jci-blue", taskId === t.id ? "border-2 border-jci-blue" : "border-border", why ? "cursor-not-allowed opacity-60" : "cursor-pointer")}>
                <input type="radio" name="ask-task" className="sr-only" disabled={!!why} checked={taskId === t.id} onChange={() => setTaskId(t.id)} />
                <span className="min-w-0"><span className="block font-bold">{t.title}</span><span className="block text-sm text-muted-foreground">{why ?? `${timeLabel(t.time_tag)} · ${t.xp} XP`}</span></span>
              </label>
            );
          })}
          <PrimaryButton block className="mt-2" disabled={!taskId || ask.isPending || !!blockReason(eligible.find((t) => t.id === taskId) ?? ({ id: -1 } as Task), askList) || !eligible.some((t) => t.id === taskId)} onClick={() => ask.mutate()}>{ask.isPending ? "Sending…" : "Send personal ask"}</PrimaryButton>
        </div>
      )}
    </BottomSheet>
  );
}
