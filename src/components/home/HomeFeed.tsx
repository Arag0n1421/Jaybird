import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Flame, Heart, Users, TrendingUp, Clock } from "lucide-react";
import { useMe } from "@/hooks/use-me";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Avatar } from "@/components/ui/member-avatar";
import { toast } from "@/components/ui/toast";
import { cq, isDemoText } from "@/lib/community";
import { q } from "@/lib/queries";
import { registerSupporterInterest, setKudos, type NewsItem } from "@/lib/db";
import { relativeTime, timeLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-subheading">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
const Skeleton = ({ h = "h-24" }: { h?: string }) => <div className={cn("animate-pulse rounded-xl bg-surface", h)} />;
const Quiet = ({ children }: { children: React.ReactNode }) => <p className="text-sm text-muted-foreground">{children}</p>;
export const SampleTag = () => <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-bold uppercase text-muted-foreground">Sample</span>;

/** Projects with real activity in the last 7 days, from project_community_stats. */
export function HotProjects() {
  const stats = useQuery(cq.projectStats());
  const projects = useQuery(cq.projects());
  if (stats.isLoading || projects.isLoading) return <Section title="Hot projects"><Skeleton /></Section>;
  if (stats.error || projects.error) return <Section title="Hot projects"><Quiet>Couldn't load projects right now.</Quiet></Section>;
  const hot = (stats.data ?? [])
    .map((s) => ({ s, p: projects.data?.find((p) => p.id === s.project_id) }))
    .filter((x) => x.p?.status === "active" && x.s.activity_7d > 0)
    .sort((a, b) => b.s.activity_7d - a.s.activity_7d)
    .slice(0, 3);
  return (
    <Section title="Hot projects" action={<Link to="/projects" className="flex min-h-11 items-center text-sm font-bold text-jci-blue underline">All projects</Link>}>
      {hot.length === 0 ? <Quiet>No project activity this week yet. Be the one who starts it.</Quiet> : (
        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
          {hot.map(({ s, p }) => (
            <Link key={s.project_id} to="/projects/$id" params={{ id: String(s.project_id) }} className="w-64 shrink-0 snap-start overflow-hidden rounded-xl border border-border hover:border-jci-blue">
              {p!.cover_url ? <img src={p!.cover_url} alt="" loading="lazy" className="h-28 w-full object-cover" /> : <div className="h-28 bg-surface" />}
              <div className="flex flex-col gap-1 p-3">
                <p className="truncate font-bold">{p!.name}</p>
                <p className="flex items-center gap-1 text-sm text-muted-foreground"><TrendingUp className="h-4 w-4 text-jci-blue" strokeWidth={1.75} />{s.activity_7d} updates this week · {s.participant_count} people</p>
                <div className="mt-1 h-1.5 rounded-full bg-surface"><div className="h-full rounded-full bg-jci-blue" style={{ width: `${Math.min(100, s.progress_pct)}%` }} /></div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Section>
  );
}

/** Open tasks ranked by base XP per estimated minute. */
export function QuickTasks() {
  const { me } = useMe();
  const tasks = useQuery(q.tasks());
  if (tasks.isLoading) return <Section title="Best XP per minute"><Skeleton /></Section>;
  if (tasks.error) return null;
  const list = (tasks.data ?? [])
    .filter((t) => t.status === "open" && t.created_by !== me?.id && (t.est_minutes ?? 0) > 0 && t.chapter_id === me?.chapter_id)
    .map((t) => ({ t, rate: t.xp / (t.est_minutes as number) }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 5);
  if (list.length < 3) return null;
  return (
    <Section title="Best XP per minute">
      <ul className="flex flex-col gap-2">
        {list.map(({ t, rate }) => (
          <li key={t.id}>
            <Link to="/task/$id" params={{ id: String(t.id) }} className="flex min-h-14 items-center gap-3 rounded-xl border border-border px-3 py-2 hover:border-jci-blue">
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{t.title}</p>
                <p className="flex items-center gap-1 text-sm text-muted-foreground"><Clock className="h-4 w-4" strokeWidth={1.75} />{timeLabel(t.time_tag)} · {t.xp} XP</p>
              </div>
              <span className="shrink-0 text-sm"><span className="text-number">{rate.toFixed(1)}</span> XP/min</span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/** Sponsors and supporting members with a persisted "I'm in" interest; partners as a strip. */
export function Supporters({ compact = false }: { compact?: boolean }) {
  const { me } = useMe();
  const qc = useQueryClient();
  const sup = useQuery(cq.supporters());
  const mine = useQuery({ ...cq.interests(me?.id ?? 0), enabled: !!me });
  const [pending, setPending] = useState<number | null>(null);
  const join = useMutation({
    mutationFn: (id: number) => { setPending(id); return registerSupporterInterest(id, me!.id); },
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ["supporter_interests", me?.id] }); toast.success("Interest saved"); },
    onError: (e: Error) => toast.error("Couldn't save your interest", e.message),
    onSettled: () => setPending(null),
  });
  if (sup.isLoading) return <Section title="Supporters"><Skeleton /></Section>;
  if (sup.error) return <Section title="Supporters"><Quiet>Couldn't load supporters right now.</Quiet></Section>;
  const local = (sup.data ?? []).filter((s) => s.chapter_id === null || s.chapter_id === me?.chapter_id);
  const asks = local.filter((s) => !!s.ask?.trim()).slice(0, compact ? 2 : 3);
  const partners = local.filter((s) => s.type === "partner" && !s.ask?.trim());
  const interested = new Set((mine.data ?? []).map((i) => i.supporter_id));
  if (local.length === 0) return null;
  return (
    <Section title="Supporters">
      {asks.map((s) => (
        <Card key={s.id} className="flex flex-col gap-2 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold">{s.name}</p>
            {s.type === "partner" && <Chip>Partner opportunity</Chip>}
            {isDemoText(s.name + s.ask + s.reward) && <SampleTag />}
          </div>
          {s.ask && <p className="text-sm">{s.ask}</p>}
          {s.reward && <p className="text-sm text-muted-foreground">{s.reward}</p>}
          {interested.has(s.id) ? (
            <p className="flex min-h-11 items-center text-sm font-bold text-jci-blue">Interest saved</p>
          ) : (
            <button disabled={join.isPending || !mine.data} onClick={() => join.mutate(s.id)} className="min-h-11 self-start rounded-full border border-jci-blue px-4 text-sm font-bold hover:bg-jci-blue-25">
              {pending === s.id ? "Saving…" : "I'm in"}
            </button>
          )}
        </Card>
      ))}
      {partners.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Partners:</span>
          {partners.map((p) => (
            p.url ? <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer"><Chip>{p.name}</Chip></a> : <Chip key={p.id}>{p.name}</Chip>
          ))}
        </div>
      )}
    </Section>
  );
}

function newsLink(n: NewsItem): { to: "/projects/$id"; id: string } | null {
  return n.project_id ? { to: "/projects/$id", id: String(n.project_id) } : null;
}

/** Chapter news with persisted kudos. */
export function NewsFeed() {
  const { me, members } = useMe();
  const qc = useQueryClient();
  const news = useQuery({ ...cq.news(me?.chapter_id ?? 0), enabled: !!me });
  const ids = (news.data ?? []).map((n) => n.id);
  const kudos = useQuery({ ...cq.kudos(ids), enabled: ids.length > 0 });
  const [pending, setPending] = useState<number | null>(null);
  const toggle = useMutation({
    mutationFn: ({ id, on }: { id: number; on: boolean }) => { setPending(id); return setKudos(id, me!.id, on); },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["kudos"] }),
    onError: (e: Error) => toast.error("Couldn't save your kudos", e.message),
    onSettled: () => setPending(null),
  });
  if (news.isLoading) return <Section title="Chapter news"><Skeleton h="h-32" /></Section>;
  if (news.error) return <Section title="Chapter news"><Quiet>Couldn't load the news right now.</Quiet></Section>;
  const list = news.data ?? [];
  return (
    <Section title="Chapter news">
      {list.length === 0 ? <Quiet>No news yet. Finished tasks and badges will show up here.</Quiet> : (
        <ul className="flex flex-col gap-3">
          {list.slice(0, 8).map((n) => {
            const m = members.find((x) => x.id === n.member_id);
            const ks = (kudos.data ?? []).filter((k) => k.news_id === n.id);
            const mineOn = ks.some((k) => k.member_id === me?.id);
            const link = newsLink(n);
            return (
              <li key={n.id}>
                <Card className="flex flex-col gap-3 p-4">
                  <div className="flex items-start gap-3">
                    {m ? <Avatar name={m.name} color={m.avatar_color} size="sm" /> : <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface"><Flame className="h-4 w-4 text-jci-blue" strokeWidth={1.75} /></span>}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">{n.text}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {relativeTime(n.created_at)}
                        {(n.type === "demo" || isDemoText(n.text)) && <SampleTag />}
                        {link && <Link to={link.to} params={{ id: link.id }} className="font-bold text-jci-blue underline">Open project</Link>}
                      </p>
                    </div>
                  </div>
                  {n.image_urls?.[0] && <img src={n.image_urls[0]} alt="" loading="lazy" className="max-h-56 w-full rounded-xl object-cover" />}
                  <button
                    aria-pressed={mineOn}
                    disabled={pending === n.id || kudos.isLoading}
                    onClick={() => toggle.mutate({ id: n.id, on: !mineOn })}
                    className={cn("flex min-h-11 items-center gap-2 self-start rounded-full border px-3 text-sm", mineOn ? "border-jci-blue bg-jci-blue-25 font-bold" : "border-border hover:border-jci-blue")}
                  >
                    <Heart className={cn("h-4 w-4", mineOn && "fill-current text-jci-blue")} strokeWidth={1.75} />
                    Kudos <span className="tabular-nums">{ks.length}</span>
                  </button>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}

/** Chapter season leaderboard rows with saved XP. */
function useChapterSeason() {
  const { me } = useMe();
  const season = new Date().getFullYear();
  const board = useQuery(cq.leaderboard(season));
  const rows = (board.data ?? []).filter((r) => r.chapter_id === me?.chapter_id && r.xp > 0).sort((a, b) => b.xp - a.xp);
  return { board, rows, season };
}

/** Display-only: XP needed to pass the nearest higher member in my chapter this season. */
export function ChapterNudge() {
  const { me } = useMe();
  const { board, rows } = useChapterSeason();
  if (!me || board.isLoading) return <Skeleton h="h-16" />;
  if (board.error) return null;
  const chapter = me.chapter?.name ?? "your chapter";
  const myXp = rows.find((r) => r.member_id === me.id)?.xp ?? 0;
  const above = rows.filter((r) => r.xp > myXp && r.member_id !== me.id);
  const tied = rows.filter((r) => r.xp === myXp && r.member_id !== me.id && myXp > 0);
  const target = above[above.length - 1];
  let text: string;
  if (rows.length === 0) text = `Nobody in ${chapter} has season XP yet. Your first task puts you on top.`;
  else if (!target) text = tied.length ? `You're tied for first in ${chapter} with ${tied[0]!.name}.` : `You lead ${chapter} this season. Keep it going!`;
  else text = `${target.xp - myXp + 1} XP to pass ${target.name} in ${chapter} this season.`;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border px-4 py-3">
      <Users className="h-5 w-5 shrink-0 text-jci-blue" strokeWidth={1.75} />
      <p className="text-sm">{text}</p>
    </div>
  );
}

export function ChapterTop5() {
  const { me } = useMe();
  const { board, rows } = useChapterSeason();
  if (board.isLoading) return <Skeleton h="h-40" />;
  if (board.error) return null;
  return (
    <Section title="Chapter top 5" action={<Link to="/leaderboard" className="flex min-h-11 items-center text-sm font-bold text-jci-blue underline">Ranks</Link>}>
      {rows.length === 0 ? <Quiet>No season XP yet.</Quiet> : (
        <ol className="flex flex-col gap-1">
          {rows.slice(0, 5).map((r) => (
            <li key={r.member_id} className={cn("flex items-center gap-2 rounded-lg px-2 py-1.5", r.member_id === me?.id && "bg-jci-blue-25")}>
              <span className="w-5 text-sm text-muted-foreground">{r.chapter_rank}</span>
              <Avatar name={r.name} color={r.avatar_color} size="sm" />
              <span className="min-w-0 flex-1 truncate text-sm">{r.name}</span>
              <span className="text-sm text-number">{r.xp}</span>
            </li>
          ))}
        </ol>
      )}
    </Section>
  );
}
