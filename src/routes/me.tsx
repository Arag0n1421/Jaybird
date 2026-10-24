import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMe } from "@/hooks/use-me";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Avatar } from "@/components/ui/member-avatar";
import { LevelRing } from "@/components/ui/level-ring";
import { XpBadge } from "@/components/ui/xp-badge";
import { Stars } from "@/components/ui/stars";
import { PrimaryButton } from "@/components/ui/primary-button";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";
import { LoadingBlock } from "@/components/StateViews";
import { EarnedBadges, GivingPower, Recognition } from "@/components/Badges";
import { CalendarField, CategoriesPicker, InterestsPicker, SkillsPicker, TimePicker, WeeklyPicker } from "@/components/profile/fields";
import { getBuddies, getFeedback, getMentors, getRecommendations, updateMember, type TimeTag, type XpReason } from "@/lib/db";
import { q } from "@/lib/queries";
import { relativeTime } from "@/lib/format";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/me")({
  head: () => pageHead("Me", "Your level, XP, badges and streak."),
  component: MePage,
});

const LABELS: Record<XpReason, string> = {
  task: "Task done", spark_bonus: "Spark, x2", gap_bonus: "Chapter needed this, x1.5", first_step: "First step!",
  streak_bonus: "Weekly streak", role_bonus: "Leadership", reviewer: "Reviewed a task", delegator: "Your task got done",
  recruit: "Brought a new member", sponsorship: "Won a sponsorship",
  peer_badge_received: "Peer badge received", peer_badge_given: "Gave a peer badge",
};
const ROLE = { member: "Member", board: "Board", president: "President" } as const;

function MePage() {
  const { me, members } = useMe();
  const id = me?.id ?? 0;
  const xp = useQuery({ ...q.myXp(id), enabled: !!me });
  const tasks = useQuery(q.tasks());
  const feedback = useQuery({ queryKey: ["feedback", "all"], queryFn: getFeedback });
  const buddies = useQuery({ queryKey: ["buddies"], queryFn: getBuddies });
  const mentors = useQuery({ queryKey: ["mentors"], queryFn: getMentors });
  const recs = useQuery({ queryKey: ["recommendations"], queryFn: getRecommendations });

  if (!me) return <LoadingBlock label="Loading your profile…" />;
  const myRecs = (recs.data ?? []).filter((r) => r.member_id === me.id);
  const s = me.stats;
  const per = s?.xp_per_level ?? 200;
  const reviews = (feedback.data ?? []).filter((f) => f.to_member === me.id && f.kind === "review");
  const taskTitle = (tid: number | null) => tasks.data?.find((t) => t.id === tid)?.title ?? "";
  const buddyIds = (buddies.data ?? []).filter((b) => b.new_member_id === me.id).map((b) => b.buddy_id);
  const menteeIds = (mentors.data ?? []).filter((m) => m.senator_id === me.id).map((m) => m.member_id);
  const name = (mid: number) => members.find((m) => m.id === mid);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <section className="ripple flex items-center gap-4 rounded-xl p-5">
        <div className="rounded-full bg-jci-white p-1">
          <LevelRing level={s?.level ?? 1} progress={(s?.xp_in_level ?? 0) / per} size={96} />
        </div>
        <div className="min-w-0">
          <h1 className="text-subtitle truncate">{me.name}</h1>
          <p className="text-sm opacity-90">{me.chapter?.name} · {ROLE[me.role]}{me.is_senator && " · Senator"}</p>
          <p className="mt-1 text-sm opacity-90">{s?.xp_in_level ?? 0}/{per} XP to level {(s?.level ?? 1) + 1}</p>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[["Total XP", s?.xp ?? 0], ["Season XP", s?.season_xp ?? 0], ["Tasks done", s?.tasks_done ?? 0], ["Streak", `${s?.streak_weeks ?? 0} wk`]].map(([l, v]) => (
          <Card key={l} className="p-4"><p className="text-sm text-muted-foreground">{l}</p><p className="text-subtitle mt-1">{v}</p></Card>
        ))}
      </div>
      {s && (
        <div className="flex flex-wrap gap-2">
          <Chip tone="blue">#{s.chapter_rank} in chapter</Chip>
          <Chip tone="blue">#{s.national_rank} in {s.country}</Chip>
          <Chip tone="blue">#{s.global_rank} global</Chip>
        </div>
      )}

      {buddyIds.length > 0 && (
        <Card><h2 className="text-subheading mb-2">Your buddy</h2>
          {buddyIds.map((b) => { const m = name(b); return m && <div key={b} className="flex items-center gap-2"><Avatar name={m.name} color={m.avatar_color} size="sm" />{m.name}</div>; })}
        </Card>
      )}
      {me.is_senator && (
        <Card><h2 className="text-subheading mb-2">Your mentees</h2>
          {menteeIds.length === 0 ? <p className="text-muted-foreground">No mentees yet.</p> : (
            <div className="flex flex-col gap-2">{menteeIds.map((b) => { const m = name(b); return m && <div key={b} className="flex items-center gap-2"><Avatar name={m.name} color={m.avatar_color} size="sm" />{m.name}</div>; })}</div>
          )}
        </Card>
      )}

      <section id="badges" tabIndex={-1} className="scroll-mt-20 outline-none">
        <h2 className="text-subheading mb-3">Badges</h2>
        <EarnedBadges memberId={me.id} showLocked />
      </section>
      <section id="recognition" tabIndex={-1} className="scroll-mt-20 outline-none">
        <h2 className="text-subheading mb-3">Recognized by</h2>
        <Recognition memberId={me.id} />
      </section>
      <section>
        <h2 className="text-subheading mb-3">Your giving power</h2>
        <GivingPower memberId={me.id} />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-subheading">What people say</h2>
          {me.linkedin_url && <a href={me.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center text-sm text-jci-blue underline">View LinkedIn</a>}
        </div>
        {recs.isLoading ? <div className="h-20 animate-pulse rounded-xl bg-surface" /> : recs.error ? <p className="text-muted-foreground">Couldn't load recommendations right now.</p> : myRecs.length === 0 ? <p className="text-muted-foreground">No recommendations yet.</p> : (
          <div className="flex flex-col gap-2">
            {myRecs.map((r) => (
              <Card key={r.id} className="p-4">
                <p>“{r.text}”</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <p className="text-xs text-muted-foreground">{r.author_name}{r.author_title ? `, ${r.author_title}` : ""}</p>
                  <Chip tone={r.source === "linkedin" ? "blue" : "teal"} className="text-xs">{r.source === "linkedin" ? "LinkedIn" : "JAM"}</Chip>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>


      <section>
        <h2 className="text-subheading mb-3">XP history</h2>
        {(xp.data ?? []).length === 0 ? <EmptyState mood="cheer" title="No XP yet" message="Your first task is the best one. Go get it!" /> : (
          <Card className="p-0">
            <ul className="divide-y divide-border">
              {xp.data!.slice(0, 20).map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{LABELS[r.reason] ?? r.reason}</p>
                    <p className="truncate text-xs text-muted-foreground">{taskTitle(r.task_id)}{r.task_id ? " · " : ""}{relativeTime(r.created_at)}</p>
                  </div>
                  <XpBadge xp={r.xp} />
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      <section>
        <h2 className="text-subheading mb-3">Feedback you got</h2>
        {reviews.length === 0 ? <p className="text-muted-foreground">Kind words from your leads will land here.</p> : (
          <div className="flex flex-col gap-2">
            {reviews.map((f) => (
              <Card key={f.id} className="p-4">
                <Stars value={f.rating ?? 0} size={16} />
                {f.comment && <p className="mt-1">“{f.comment}”</p>}
                <p className="mt-1 text-xs text-muted-foreground">{taskTitle(f.task_id)}</p>
              </Card>
            ))}
          </div>
        )}
      </section>

      <PrefsEditor />
    </div>
  );
}

function PrefsEditor() {
  const { me } = useMe();
  const qc = useQueryClient();
  const init = () => ({ skills: me!.skills ?? [], interests: me!.interests ?? [], liked: me!.liked_categories ?? [], time: me!.available_time, weekly: me!.weekly_minutes, ics: me!.calendar_ics_url ?? "" });
  const [f, setF] = useState(init);
  useEffect(() => setF(init()), [me?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = useMutation({
    mutationFn: () => updateMember(me!.id, { skills: f.skills, interests: f.interests, liked_categories: f.liked, available_time: f.time, weekly_minutes: f.weekly, calendar_ics_url: f.ics.trim() || null }),
    onSuccess: () => { toast.success("Saved. Jay will use this for your next pick."); void qc.invalidateQueries({ queryKey: ["members"] }); },
    onError: (e: Error) => toast.error("Couldn't save", e.message),
  });
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-subheading">Your preferences</h2>
      <Card className="flex flex-col gap-5">
        <div className="flex flex-col gap-2"><span className="font-medium">Skills (up to 5)</span><SkillsPicker value={f.skills} onChange={(skills) => setF({ ...f, skills })} /></div>
        <div className="flex flex-col gap-2"><span className="font-medium">I enjoy</span><CategoriesPicker value={f.liked} onChange={(liked) => setF({ ...f, liked })} /></div>
        <div className="flex flex-col gap-2"><span className="font-medium">Interests</span><InterestsPicker value={f.interests} onChange={(interests) => setF({ ...f, interests })} /></div>
        <div className="flex flex-col gap-2"><span className="font-medium">Usual time</span><TimePicker value={f.time} onChange={(time: TimeTag) => setF({ ...f, time })} /></div>
        <div className="flex flex-col gap-2"><span className="font-medium">Per week</span><WeeklyPicker value={f.weekly} onChange={(weekly) => setF({ ...f, weekly })} /></div>
        <CalendarField value={f.ics} onChange={(ics) => setF({ ...f, ics })} />
        <PrimaryButton block disabled={save.isPending || f.skills.length === 0} onClick={() => save.mutate()}>{save.isPending ? "Saving…" : "Save"}</PrimaryButton>
      </Card>
    </section>
  );
}
