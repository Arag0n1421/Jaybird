import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMe } from "@/hooks/use-me";
import { PageTitle } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Avatar } from "@/components/ui/member-avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";
import { LoadingBlock, ErrorBlock } from "@/components/StateViews";
import { getLeaderboard, getProjectLeaderboard, getSeasonPrizePool } from "@/lib/db";
import { q } from "@/lib/queries";
import { pageHead } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/leaderboard")({
  head: () => pageHead("Ranks", "JCI volunteer leaderboard by project, chapter, country and worldwide."),
  component: Leaderboard,
});

type Scope = "project" | "chapter" | "country" | "global";
type Row = { member_id: number; name: string; avatar_color: string; chapter_name: string; is_senator: boolean; xp: number; tasks_done: number | null; rank: number };

function Leaderboard() {
  const { me, members } = useMe();
  const year = new Date().getFullYear();
  const [scope, setScope] = useState<Scope>("chapter");
  const [season, setSeason] = useState(year);
  const [projectId, setProjectId] = useState<number | null>(null);
  const projects = useQuery(q.projects());
  const board = useQuery({ queryKey: ["xp_ledger", "leaderboard", season], queryFn: () => getLeaderboard(season) });
  const pboard = useQuery({ queryKey: ["xp_ledger", "project_leaderboard", projectId], queryFn: () => getProjectLeaderboard(projectId!), enabled: scope === "project" && !!projectId });
  const pool = useQuery({ queryKey: ["sponsor_pledges", "pool"], queryFn: getSeasonPrizePool });

  const myProjects = (projects.data ?? []).filter((p) => me && p.chapter_id === me.chapter_id);
  useEffect(() => { if (!projectId && myProjects[0]) setProjectId(myProjects[0].id); }, [myProjects, projectId]);

  const meRow = board.data?.find((r) => r.member_id === me?.id);
  let rows: Row[] = [];
  if (scope === "project") {
    const chapterOf = (id: number) => board.data?.find((r) => r.member_id === id);
    rows = (pboard.data ?? []).map((r) => ({ member_id: r.member_id, name: r.name, avatar_color: r.avatar_color, chapter_name: chapterOf(r.member_id)?.chapter_name ?? "", is_senator: members.find((m) => m.id === r.member_id)?.is_senator ?? false, xp: r.xp, tasks_done: null, rank: r.project_rank }));
  } else {
    const all = board.data ?? [];
    const filtered = scope === "chapter" ? all.filter((r) => r.chapter_id === meRow?.chapter_id || r.chapter_id === me?.chapter_id)
      : scope === "country" ? all.filter((r) => r.country === (meRow?.country ?? me?.stats?.country)) : all;
    rows = filtered.map((r) => ({ ...r, rank: scope === "chapter" ? r.chapter_rank : scope === "country" ? r.national_rank : r.global_rank }));
  }
  // Only members with saved XP get a rank; never invent one.
  rows = rows.filter((r) => r.xp > 0);
  rows.sort((a, b) => a.rank - b.rank);
  const mine = rows.find((r) => r.member_id === me?.id);

  // Rank-up animation + toast
  const prevRank = useRef<{ key: string; rank: number } | null>(null);
  const [bump, setBump] = useState(false);
  const key = `${scope}-${season}-${projectId}`;
  useEffect(() => {
    if (!mine) return;
    const prev = prevRank.current;
    if (prev && prev.key === key && mine.rank < prev.rank) {
      toast.success(`You moved up to #${mine.rank}`);
      setBump(true);
      setTimeout(() => setBump(false), 1500);
    }
    prevRank.current = { key, rank: mine.rank };
  }, [mine?.rank, key]); // eslint-disable-line react-hooks/exhaustive-deps

  const loading = board.isLoading || (scope === "project" && pboard.isLoading);
  const err = board.error ?? pboard.error;
  const top = rows.slice(0, 3);
  const list = rows.slice(3, 10);
  const pinned = mine && mine.rank > 10 ? mine : null;
  const unranked = !loading && !mine && !!me;
  const p = pool.data?.find((x) => x.season === (season || year));

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <PageTitle title="Ranks" />
      {p && (
        <Link to="/sponsors" className="ripple flex items-center justify-between gap-3 rounded-xl p-4">
          <span>Season prize pool: <span className="font-semibold text-jci-yellow">EUR {Math.round(p.total_eur)}</span> from {p.sponsors} sponsors</span>
          <span className="shrink-0 text-sm underline">Become a sponsor</span>
        </Link>
      )}

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {([["project", "My project"], ["chapter", "My chapter"], ["country", "My country"], ["global", "Global"]] as const).map(([k, l]) => (
          <Chip key={k} selected={scope === k} onClick={() => setScope(k)}>{l}</Chip>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {scope === "project" && (
          <select aria-label="Project" value={projectId ?? ""} onChange={(e) => setProjectId(Number(e.target.value))} className="min-h-10 rounded-xl border border-border bg-jci-white px-3">
            {myProjects.map((pr) => <option key={pr.id} value={pr.id}>{pr.name}</option>)}
          </select>
        )}
        {scope !== "project" && (
          <select aria-label="Season" value={season} onChange={(e) => setSeason(Number(e.target.value))} className="min-h-10 rounded-xl border border-border bg-jci-white px-3">
            <option value={year}>{year}</option>
            <option value={year - 1}>{year - 1}</option>
            <option value={0}>All time</option>
          </select>
        )}
      </div>

      {loading ? <LoadingBlock label="Counting the XP…" /> : err ? <ErrorBlock error={err} onRetry={() => void board.refetch()} /> : rows.length === 0 ? (
        <EmptyState mood="sleep" title="No ranks yet" message="Finish a task and you'll be first on the board!" />
      ) : (
        <>
          <div className="grid grid-cols-3 items-end gap-2">
            {[top[1], top[0], top[2]].map((r, i) => r && (
              <Card key={r.member_id} className={cn("flex flex-col items-center gap-1 p-3 text-center", i === 1 && "pb-6 pt-5", r.member_id === me?.id && "border-2 border-jci-navy")}>
                <span className="text-xs text-muted-foreground">#{r.rank}</span>
                <Avatar name={r.name} color={r.avatar_color} size={i === 1 ? "lg" : "md"} />
                <span className="w-full truncate text-sm font-medium">{r.name}</span>
                <span className="w-full truncate text-xs text-muted-foreground">{r.chapter_name}</span>
                <span className="rounded-full bg-jci-black px-2 py-0.5 text-xs font-semibold text-jci-yellow text-number">{r.xp} XP</span>
              </Card>
            ))}
          </div>
          <ol className="flex flex-col gap-2">
            {list.map((r) => <RankRow key={r.member_id} r={r} me={r.member_id === me?.id} bump={bump && r.member_id === me?.id} />)}
          </ol>
          {unranked && (
            <div className="sticky bottom-20 rounded-xl border-2 border-jci-navy bg-jci-white px-3 py-3 text-sm lg:bottom-4">
              <span className="font-bold">You</span> · no XP in this view yet. Finish a task to get on the board.
            </div>
          )}
          {pinned && (
            <div className="sticky bottom-20 lg:bottom-4">
              <RankRow r={pinned} me bump={bump} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RankRow({ r, me, bump }: { r: Row; me: boolean; bump: boolean }) {
  return (
    <li className={cn("flex list-none items-center gap-3 rounded-xl border bg-jci-white px-3 py-2.5 transition-transform", me ? "border-2 border-jci-navy" : "border-border", bump && "scale-[1.03] animate-pulse")}>
      <span className="w-7 shrink-0 text-center text-sm font-semibold text-muted-foreground">{r.rank}</span>
      <Avatar name={r.name} color={r.avatar_color} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate font-medium">{r.name}{r.is_senator && <Chip tone="navy" className="px-2 py-0 text-[10px]">Senator</Chip>}</p>
        <p className="truncate text-xs text-muted-foreground">{r.chapter_name}{r.tasks_done != null && ` · ${r.tasks_done} tasks`}</p>
      </div>
      <span className="shrink-0 text-sm text-number">{r.xp} XP</span>
      {me && <span className="sr-only">(you)</span>}
    </li>
  );
}
