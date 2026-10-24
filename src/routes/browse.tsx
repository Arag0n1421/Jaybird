import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useMe } from "@/hooks/use-me";
import { PageTitle } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { XpBadge } from "@/components/ui/xp-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";
import { LoadingBlock, ErrorBlock } from "@/components/StateViews";
import { q } from "@/lib/queries";
import { respondToSuggestion, type TimeTag } from "@/lib/db";
import { timeLabel } from "@/lib/format";
import { useCategories } from "@/lib/categories";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/browse")({
  head: () => pageHead("Browse", "Browse open JCI volunteer tasks."),
  component: Browse,
});

const ORDER: Record<TimeTag, number> = { "15m": 1, "1h": 2, half_day: 3 };
const MAX_TIME: { key: TimeTag | "any"; label: string }[] = [
  { key: "15m", label: "15 min" },
  { key: "1h", label: "1 hour" },
  { key: "half_day", label: "Half day" },
  { key: "any", label: "Any" },
];

function Browse() {
  const { me, chapters } = useMe();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const tasks = useQuery(q.tasks());
  const cats = useCategories();
  const [cat, setCat] = useState<string | null>(null);
  const [maxTime, setMaxTime] = useState<TimeTag | "any">("any");
  const [skillsOnly, setSkillsOnly] = useState(false);
  const [myChapter, setMyChapter] = useState(true);
  const [search, setSearch] = useState("");

  const take = useMutation({
    mutationFn: (taskId: number) => respondToSuggestion(me!.id, taskId, "yes"),
    onSuccess: (got, taskId) => {
      void qc.invalidateQueries();
      if (got) {
        toast.success("It's yours! 🎉");
        void navigate({ to: "/task/$id", params: { id: String(taskId) } });
      } else toast.info("Someone just took it");
    },
    onError: (e: Error) => toast.error("That didn't go through", e.message),
  });

  const rows = useMemo(() => {
    if (!me) return [];
    const s = search.trim().toLowerCase();
    return (tasks.data ?? []).filter(
      (t) =>
        t.status === "open" &&
        (!cat || t.category === cat) &&
        (maxTime === "any" || ORDER[t.time_tag] <= ORDER[maxTime]) &&
        (!skillsOnly || t.tags.some((g) => me.skills.includes(g))) &&
        (!myChapter || t.chapter_id === me.chapter_id) &&
        (!s || t.title.toLowerCase().includes(s)),
    );
  }, [tasks.data, me, cat, maxTime, skillsOnly, myChapter, search]);

  if (!me || tasks.isLoading) return <LoadingBlock label="Finding open tasks…" />;
  if (tasks.error) return <ErrorBlock error={tasks.error} onRetry={() => void tasks.refetch()} />;
  const chapterName = (id: number) => chapters.find((c) => c.id === id)?.name ?? "";

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <PageTitle title="Browse" subtitle="Everything open right now." />
      <label className="flex items-center gap-2 rounded-xl border border-border px-3 focus-within:border-jci-blue">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search titles" aria-label="Search titles" className="min-h-11 w-full bg-transparent outline-none" />
      </label>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <Chip selected={!cat} onClick={() => setCat(null)}>All</Chip>
        {(cats.data ?? []).map((c) => (
          <Chip key={c.key} selected={cat === c.key} onClick={() => setCat(cat === c.key ? null : c.key)}>{c.label}</Chip>
        ))}
      </div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {MAX_TIME.map((m) => (
          <Chip key={m.key} selected={maxTime === m.key} onClick={() => setMaxTime(m.key)}>{m.key === "any" ? "Any time" : `≤ ${m.label}`}</Chip>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Chip selected={skillsOnly} onClick={() => setSkillsOnly(!skillsOnly)}>Matches my skills</Chip>
        <Chip selected={myChapter} onClick={() => setMyChapter(true)}>My chapter</Chip>
        <Chip selected={!myChapter} onClick={() => setMyChapter(false)}>All chapters</Chip>
      </div>

      {rows.length === 0 ? (
        <EmptyState mood="sleep" title="No open tasks match" message="Try loosening a filter. New tasks pop up all the time." />
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((t) => (
            <li key={t.id} className="animate-in fade-in">
              <Card className="flex flex-col gap-3 p-4">
                <div className="min-w-0">
                  <Link to="/task/$id" params={{ id: String(t.id) }} className="font-medium hover:text-jci-blue">{t.title}</Link>
                  <p className="text-sm text-muted-foreground">{chapterName(t.chapter_id)} · {timeLabel(t.time_tag)}</p>
                </div>
                {t.tags.length > 0 && <div className="flex flex-wrap gap-1.5">{t.tags.map((g) => <Chip key={g} tone={me.skills.includes(g) ? "teal" : "default"}>{g}</Chip>)}</div>}
                <div className="flex items-center justify-between gap-3">
                  <XpBadge xp={t.xp} />
                  <SecondaryButton className="min-h-10 px-4" disabled={take.isPending} onClick={() => take.mutate(t.id)}>Take it</SecondaryButton>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
