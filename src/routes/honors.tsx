import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, ClipboardList, Megaphone, UserPlus, HandCoins, CalendarHeart, GraduationCap, Award, type LucideIcon } from "lucide-react";
import { PageTitle } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/member-avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingBlock, ErrorBlock } from "@/components/StateViews";
import { BadgeIcon } from "@/components/BadgeIcon";
import { getBadges, getCategoryChampions, getLeaderboard, getMemberBadges, getPledges, getSponsors } from "@/lib/db";
import { categoryLabel } from "@/lib/categories";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/honors")({
  head: () => pageHead("Year-end honors", "Members of the Year, category champions and badges across JCI chapters."),
  component: Honors,
});

const ICONS: Record<string, LucideIcon> = { project: Briefcase, ops: ClipboardList, social: Megaphone, recruiting: UserPlus, sponsorship: HandCoins, event: CalendarHeart, mentoring: GraduationCap };

function Honors() {
  const year = new Date().getFullYear();
  const [season, setSeason] = useState(year);
  const board = useQuery({ queryKey: ["xp_ledger", "leaderboard", season], queryFn: () => getLeaderboard(season) });
  const champs = useQuery({ queryKey: ["xp_ledger", "champions"], queryFn: getCategoryChampions });
  const badges = useQuery({ queryKey: ["badges"], queryFn: getBadges, staleTime: Infinity });
  const held = useQuery({ queryKey: ["member_badges", "all"], queryFn: getMemberBadges });
  const pledges = useQuery({ queryKey: ["sponsor_pledges", "all"], queryFn: getPledges });
  const sponsors = useQuery({ queryKey: ["sponsor_pledges", "sponsors"], queryFn: getSponsors });

  if (board.isLoading) return <LoadingBlock label="Polishing the trophies…" />;
  if (board.error) return <ErrorBlock error={board.error} onRetry={() => void board.refetch()} />;

  const byChapter = new Map<number, (typeof board.data & object)[number]>();
  for (const r of board.data ?? []) if (r.chapter_rank === 1 && !byChapter.has(r.chapter_id)) byChapter.set(r.chapter_id, r);
  const motys = [...byChapter.values()];
  const champList = (champs.data ?? []).filter((c) => season === 0 || c.season === season);
  const champByCat = new Map<string, (typeof champList)[number]>();
  for (const c of champList) { const cur = champByCat.get(c.category); if (!cur || c.tasks_done > cur.tasks_done) champByCat.set(c.category, c); }
  const counts = (badges.data ?? []).map((b) => ({ b, n: new Set((held.data ?? []).filter((h) => h.badge_id === b.id).map((h) => h.member_id)).size }));
  const badgesOf = (mid: number) => (held.data ?? []).filter((h) => h.member_id === mid).map((h) => badges.data?.find((b) => b.id === h.badge_id)).filter(Boolean);
  const sponsorIds = new Set((pledges.data ?? []).filter((p) => season === 0 || p.season === season).map((p) => p.sponsor_id));
  const strip = (sponsors.data ?? []).filter((s) => sponsorIds.has(s.id));

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageTitle title="Year-end honors" />
        <select aria-label="Season" value={season} onChange={(e) => setSeason(Number(e.target.value))} className="mb-6 min-h-10 rounded-xl border border-border bg-jci-white px-3">
          <option value={year}>{year}</option><option value={year - 1}>{year - 1}</option><option value={0}>All time</option>
        </select>
      </div>

      <section>
        <h2 className="text-subheading mb-3">Member of the Year</h2>
        {motys.length === 0 ? <EmptyState title="No XP yet this season" message="The first finished task crowns the first champion." /> : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {motys.map((m) => (
              <Card key={m.chapter_id} className="ripple flex flex-col gap-3 border-0">
                <p className="text-sm opacity-90">{m.chapter_name}</p>
                <div className="flex items-center gap-3">
                  <Avatar name={m.name} color={m.avatar_color} size="lg" className="ring-2 ring-jci-white" />
                  <div className="min-w-0">
                    <p className="text-subtitle truncate">{m.name}</p>
                    <p className="text-sm"><span className="font-semibold text-jci-yellow">{m.xp} XP</span> · {m.tasks_done} tasks</p>
                  </div>
                </div>
                {badgesOf(m.member_id).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">{badgesOf(m.member_id).map((b) => <span key={b!.id} className="rounded-full bg-jci-white/15 px-2 py-0.5 text-xs">★ {b!.name}</span>)}</div>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-subheading mb-3">Category champions</h2>
        {champByCat.size === 0 ? <p className="text-muted-foreground">No champions yet. Every category is up for grabs!</p> : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...champByCat.values()].map((c) => {
              const Icon = ICONS[c.category] ?? Award;
              return (
                <Card key={c.category} className="flex items-center gap-3 p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-jci-blue-25"><Icon className="h-5 w-5 text-jci-blue" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-muted-foreground">{categoryLabel(c.category)}</p>
                    <p className="truncate font-medium">{c.name}</p>
                  </div>
                  <span className="text-sm text-muted-foreground">{c.tasks_done} done</span>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-subheading mb-3">Badges held</h2>
        <div className="flex flex-wrap justify-center gap-3 sm:justify-start">
          {counts.map(({ b, n }) => (
            <div key={b.id} className="flex w-24 flex-col items-center gap-1 text-center">
              <BadgeIcon code={b.code} earned={n > 0} size={52} />
              <span className="text-xs font-bold">{b.name}</span>
              <span className="text-[11px] text-muted-foreground">{n} {n === 1 ? "member" : "members"}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl bg-surface p-5">
        <p className="mb-3 text-sm text-muted-foreground">Made possible by</p>
        {strip.length === 0 ? <p>Your company could be here.</p> : (
          <div className="flex flex-wrap gap-4">{strip.map((s) => s.logo_url ? <img key={s.id} src={s.logo_url} alt={s.name} className="h-8 object-contain" /> : <span key={s.id} className="font-medium">{s.name}</span>)}</div>
        )}
      </section>
    </div>
  );
}
