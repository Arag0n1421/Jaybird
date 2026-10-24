import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, CalendarDays, Sparkles, ArrowRight, Flame } from "lucide-react";
import { ChapterNudge, ChapterTop5, HotProjects, NewsFeed, QuickTasks, Supporters } from "@/components/home/HomeFeed";
import { useMe } from "@/hooks/use-me";
import { Mascot, type MascotMood } from "@/components/Mascot";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { XpBadge } from "@/components/ui/xp-badge";
import { LevelRing } from "@/components/ui/level-ring";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";
import { LoadingBlock, ErrorBlock } from "@/components/StateViews";
import { q, TIME_CHIPS, firstName } from "@/lib/queries";
import { answerAsk, calendarFree, markAskNudged, respondToSuggestion, type DeclineReason, type SuggestedTask } from "@/lib/db";
import { formatDeadline, timeLabel } from "@/lib/format";
import { categoryLabel } from "@/lib/categories";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () => pageHead("Your one task", "Jaybird picks the one JCI task that fits you best right now."),
  component: Home,
});

type ChipIdx = 0 | 1 | 2;
const tagToIdx = (t: string | null | undefined): ChipIdx => (t === "1h" ? 1 : t === "half_day" ? 2 : 0);

function Home() {
  const { me } = useMe();
  if (!me) return <LoadingBlock label="Getting your day ready…" />;
  return <HomeFor key={me.id} />;
}

function HomeFor() {
  const { me, members } = useMe();
  const meId = me!.id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [chip, setChip] = useState<ChipIdx>(tagToIdx(me!.available_time));
  const [skipped, setSkipped] = useState<number[]>([]);
  const [mascotMsg, setMascotMsg] = useState<{ mood: MascotMood; text: string } | null>(null);
  const [calendarNote, setCalendarNote] = useState<string | null>(null);
  const [checkingCal, setCheckingCal] = useState(false);
  const minutes = TIME_CHIPS[chip].minutes;

  const suggest = useQuery(q.suggest(meId, minutes));
  const tasks = useQuery(q.tasks());
  const asks = useQuery(q.myAsks(meId));
  const stats = me!.stats;

  const list = useMemo(() => (suggest.data ?? []).filter((s) => !skipped.includes(s.task_id)), [suggest.data, skipped]);
  const pick = list[0];

  // Ran out of the 3 → fetch a fresh batch
  useEffect(() => {
    if (suggest.data && suggest.data.length > 0 && list.length === 0) {
      setSkipped([]);
      void suggest.refetch();
    }
  }, [list.length, suggest]);

  const current = (tasks.data ?? []).find((t) => t.assignee_id === meId && t.status === "in_progress");

  // Other personal asks
  const pendingAsks = (asks.data ?? []).filter((a) => a.status === "pending" && a.task_id !== pick?.task_id);
  const taskById = new Map((tasks.data ?? []).map((t) => [t.id, t]));
  const otherAsks = pendingAsks.filter((a) => taskById.get(a.task_id)?.status !== "cancelled").slice(0, 2);

  // One-time nudge for an ask waiting > 24h
  const nudged = useRef(false);
  useEffect(() => {
    if (nudged.current || !asks.data) return;
    const stale = asks.data.find((a) => a.status === "pending" && !a.nudged_at && Date.now() - new Date(a.asked_at).getTime() > 86_400_000);
    if (!stale) return;
    nudged.current = true;
    const asker = members.find((m) => m.id === stale.asked_by);
    setMascotMsg({ mood: "nudge", text: `${firstName(asker?.name) || "Your lead"} is waiting for your answer` });
    void markAskNudged(stale.id).catch(() => {});
  }, [asks.data, members]);

  const respond = useMutation({
    mutationFn: ({ s, yes, reason }: { s: SuggestedTask; yes: boolean; reason?: DeclineReason | undefined }) =>
      respondToSuggestion(meId, s.task_id, yes ? "yes" : "no", reason ?? null),
    onSuccess: (got, { s, yes, reason }) => {
      if (yes) {
        if (got) {
          void navigate({ to: "/task/$id", params: { id: String(s.task_id) } });
        } else {
          toast.info("Someone just took it", "Here's the next one.");
          setSkipped((x) => [...x, s.task_id]);
        }
        return;
      }
      setSkipped((x) => [...x, s.task_id]);
      if (reason === "not_my_thing") setMascotMsg({ mood: "idle", text: "Got it, fewer like this." });
      else if (reason === "too_long" && chip > 0) {
        setMascotMsg({ mood: "idle", text: `Want something shorter? Try ${TIME_CHIPS[(chip - 1) as ChipIdx].label}.` });
      } else setMascotMsg({ mood: "idle", text: "No problem. How about this one?" });
      void qc.invalidateQueries({ queryKey: ["asks"] });
    },
    onError: (e: Error) => toast.error("That didn't go through", e.message),
  });

  const ask = useMutation({
    mutationFn: ({ id, accept }: { id: number; accept: boolean }) => answerAsk(id, accept ? "accepted" : "declined", accept ? null : "not_now"),
    onSuccess: (got, { accept }) => {
      if (accept) toast[got ? "success" : "info"](got ? "It's yours!" : "Someone just took it");
      else toast.info("No worries, maybe next time.");
      void qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error("That didn't go through", e.message),
  });

  async function checkCalendar() {
    if (!me!.calendar_ics_url) return;
    setCheckingCal(true);
    try {
      const now = new Date();
      const end = new Date();
      end.setHours(22, 0, 0, 0);
      if (end <= now) end.setDate(end.getDate() + 1);
      const res = await calendarFree(me!.calendar_ics_url, now.toISOString(), end.toISOString());
      const n = res.longest_free_block_minutes;
      let best: ChipIdx = 0;
      TIME_CHIPS.forEach((c, i) => {
        if (Math.abs(c.minutes - n) < Math.abs(TIME_CHIPS[best].minutes - n)) best = i as ChipIdx;
      });
      setChip(best);
      setSkipped([]);
      setCalendarNote(`Your calendar says you're free for ${n} min`);
    } catch (e) {
      toast.error("Couldn't read your calendar", e instanceof Error ? e.message : undefined);
    } finally {
      setCheckingCal(false);
    }
  }

  function pickChip(i: ChipIdx) {
    setChip(i);
    setSkipped([]);
    setCalendarNote(null);
  }

  const mascot: { mood: MascotMood; text: string } =
    mascotMsg ??
    (pick?.is_ask
      ? { mood: "cheer", text: `${firstName(pick.asked_by_name)} thinks you're the one for this!` }
      : pick
        ? { mood: "idle", text: "I found one that fits you." }
        : suggest.isLoading
          ? { mood: "idle", text: "Looking for your task…" }
          : { mood: "sleep", text: "Quiet right now. Enjoy the break!" });

  const xpPer = stats?.xp_per_level ?? 200;

  return (
    <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
    <div className="flex min-w-0 flex-col gap-5">
      <section className="flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-subtitle">Hi {firstName(me!.name)}</p>
          {stats && (
            <p className="mt-1 text-sm text-muted-foreground">
              {stats.xp_in_level}/{xpPer} XP to level {stats.level + 1}
              {stats.streak_weeks > 0 && <> · <Flame className="inline h-4 w-4 align-[-2px] text-coral" strokeWidth={1.75} /> {stats.streak_weeks}-week streak</>}
            </p>
          )}
        </div>
        {stats && <LevelRing level={stats.level} progress={stats.xp_in_level / xpPer} size={64} />}
      </section>

      <Mascot mood={mascot.mood} message={mascot.text} size={64} />

      {current && (
        <Link
          to="/task/$id"
          params={{ id: String(current.id) }}
          className="flex items-center justify-between gap-3 rounded-xl bg-jci-blue-25 px-4 py-3 text-sm"
        >
          <span className="min-w-0 truncate">
            You're on: <span className="font-medium">{current.title}</span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-jci-blue" />
        </Link>
      )}

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="How much time do you have?">
        {me!.calendar_ics_url && (
          <Chip onClick={checkCalendar} tone="blue" disabled={checkingCal}>
            <CalendarDays className="h-4 w-4" /> {checkingCal ? "Checking…" : "Check my calendar"}
          </Chip>
        )}
        {TIME_CHIPS.map((c, i) => (
          <Chip key={c.tag} selected={chip === i} onClick={() => pickChip(i as ChipIdx)}>
            {c.label}
          </Chip>
        ))}
      </div>
      {calendarNote && <p className="-mt-2 text-sm text-muted-foreground">{calendarNote}</p>}

      {otherAsks.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-subheading">Asked of you personally</h2>
          {otherAsks.map((a) => {
            const t = taskById.get(a.task_id);
            const asker = members.find((m) => m.id === a.asked_by);
            return (
              <Card key={a.id} className="flex flex-col gap-3 p-4">
                <div className="min-w-0">
                  <Link to="/task/$id" params={{ id: String(a.task_id) }} className="font-medium hover:text-jci-blue">
                    {t?.title ?? "A task"}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {asker ? `${firstName(asker.name)} asked you` : "Asked personally"}
                    {t && ` · ${timeLabel(t.time_tag)} · +${t.xp} XP`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <SecondaryButton className="min-h-10 flex-1" disabled={ask.isPending} onClick={() => ask.mutate({ id: a.id, accept: true })}>
                    Accept
                  </SecondaryButton>
                  <button className="flex-1 text-sm text-muted-foreground hover:text-jci-black" disabled={ask.isPending} onClick={() => ask.mutate({ id: a.id, accept: false })}>
                    Not now
                  </button>
                </div>
              </Card>
            );
          })}
        </section>
      )}
      {suggest.isLoading ? (
        <LoadingBlock />
      ) : suggest.error ? (
        <ErrorBlock error={suggest.error} onRetry={() => void suggest.refetch()} />
      ) : !pick ? (
        <EmptyState
          mood="sleep"
          title={`Nothing fits ${TIME_CHIPS[chip].label} right now`}
          message="That's okay. Try a little more time, or look around."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              {chip < 2 && <SecondaryButton onClick={() => pickChip((chip + 1) as ChipIdx)}>I have more time</SecondaryButton>}
              <SecondaryButton onClick={() => void navigate({ to: "/browse" })}>Browse everything</SecondaryButton>
            </div>
          }
        />
      ) : (
        <TaskPick key={pick.task_id} s={pick} busy={respond.isPending} onAnswer={(yes, reason) => respond.mutate({ s: pick, yes, reason })} />
      )}
      <div className="lg:hidden"><ChapterNudge /></div>
      <HotProjects />
      <QuickTasks />
      <div className="lg:hidden"><Supporters /></div>
      <NewsFeed />
    </div>
    <aside className="hidden flex-col gap-6 lg:flex">
      <ChapterNudge />
      <Supporters compact />
      <ChapterTop5 />
    </aside>

    </div>
  );
}

function TaskPick({ s, busy, onAnswer }: { s: SuggestedTask; busy: boolean; onAnswer: (yes: boolean, reason?: DeclineReason | undefined) => void }) {
  const [more, setMore] = useState(false);
  const bonus = s.reasons.find((r) => /×|x\d|bonus|spark/i.test(r));
  const why = s.reasons.filter((r) => r !== bonus);
  return (
    <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-right-4 duration-300">
      {s.is_ask && s.asked_by_name && (
        <div className="rounded-xl bg-jci-navy px-4 py-3 text-sm text-jci-white">
          <span className="font-semibold">{s.asked_by_name}</span> asked you personally
        </div>
      )}
      <Card className="flex flex-col gap-4 p-6">
        <p className="text-xs uppercase tracking-wide text-jci-blue">Your one task today</p>
        <div>
          <h2 className="text-subtitle">{s.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {[s.project_name, s.chapter_name].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-4 w-4 text-jci-blue" /> {timeLabel(s.time_tag)}
          </span>
          <XpBadge xp={s.xp} />
          {s.deadline && <span className="text-muted-foreground">{formatDeadline(s.deadline)}</span>}
          <Chip tone="blue">{s.match_pct}% match</Chip>
        </div>
        {s.gap && (
          <div className="flex items-start gap-2 rounded-xl border border-jci-teal bg-jci-teal-25 px-3 py-2 text-sm">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <span className="font-semibold">{categoryLabel(s.category)} needs love · pays {s.category === "social" ? "x2" : "x1.5"}</span>
            </span>
          </div>
        )}
        {why.length > 0 && (
          <div>
            <p className="mb-2 text-sm text-muted-foreground">Why you</p>
            <div className="flex flex-wrap gap-2">
              {why.map((r) => (
                <Chip key={r} tone="teal">
                  {r}
                </Chip>
              ))}
            </div>
          </div>
        )}
        {s.description && (
          <div className="text-body">
            <p className={more ? "" : "line-clamp-2"}>{s.description}</p>
            {s.description.length > 90 && (
              <button className="mt-1 text-sm text-jci-blue" onClick={() => setMore(!more)}>
                {more ? "Less" : "More"}
              </button>
            )}
          </div>
        )}
      </Card>
      <PrimaryButton block disabled={busy} onClick={() => onAnswer(true)}>
        Yes, I'll do it
      </PrimaryButton>
      <div className="flex justify-between gap-2 text-sm text-muted-foreground">
        {(
          [
            ["not_now", "Not now"],
            ["not_my_thing", "Not my thing"],
            ["too_long", "Too long"],
          ] as const
        ).map(([r, l]) => (
          <button key={r} disabled={busy} onClick={() => onAnswer(false, r)} className="min-h-11 flex-1 rounded-lg py-2 hover:bg-surface hover:text-jci-black">
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}
