import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useMe } from "@/hooks/use-me";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { LoadingBlock, ErrorBlock } from "@/components/StateViews";
import { getAsks, getChapterImpact, getFeedback } from "@/lib/db";
import { q } from "@/lib/queries";
import { useCategories } from "@/lib/categories";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/lead/insights")({
  head: () => pageHead("Insights", "See which tasks get yeses and which need a rewrite."),
  component: Insights,
});

const BAR_COLORS = ["var(--jci-blue)", "var(--jci-navy)", "var(--jci-teal)"];
const DAY = 86_400_000;

function Insights() {
  const { me } = useMe();
  const impact = useQuery({ queryKey: ["chapter_impact"], queryFn: getChapterImpact });
  const tasks = useQuery(q.tasks());
  const asks = useQuery({ queryKey: ["asks", "all"], queryFn: getAsks });
  const feedback = useQuery({ queryKey: ["feedback", "all"], queryFn: getFeedback });
  const cats = useCategories();

  if (!me || impact.isLoading || tasks.isLoading) return <LoadingBlock label="Crunching your chapter's numbers…" />;
  if (impact.error || tasks.error) return <ErrorBlock error={impact.error ?? tasks.error} onRetry={() => { void impact.refetch(); void tasks.refetch(); }} />;

  const ch = impact.data?.find((c) => c.chapter_id === me.chapter_id);
  const chTasks = (tasks.data ?? []).filter((t) => t.chapter_id === me.chapter_id);
  const done = chTasks.filter((t) => t.status === "done");
  const turn = done.filter((t) => t.submitted_at && t.completed_at).map((t) => (new Date(t.completed_at!).getTime() - new Date(t.submitted_at!).getTime()) / 3_600_000);
  const avgTurn = turn.length ? turn.reduce((a, b) => a + b, 0) / turn.length : null;

  const myTaskIds = new Set((tasks.data ?? []).filter((t) => t.created_by === me.id).map((t) => t.id));
  const clar = (feedback.data ?? []).filter((f) => f.kind === "task_clarity" && myTaskIds.has(f.task_id) && f.rating != null).map((f) => f.rating!);
  const avgClarity = clar.length ? clar.reduce((a, b) => a + b, 0) / clar.length : null;

  const doneWithin = (key: string, days: number) => done.some((t) => t.category === key && t.completed_at && Date.now() - new Date(t.completed_at).getTime() < days * DAY);
  const gaps = (cats.data ?? []).filter((c) => !doneWithin(c.key, c.key === "social" ? 14 : 30));

  const now = new Date();
  const month = done.filter((t) => t.completed_at && new Date(t.completed_at).getMonth() === now.getMonth() && new Date(t.completed_at).getFullYear() === now.getFullYear());
  const chart = (cats.data ?? []).map((c) => ({ name: c.label, value: month.filter((t) => t.category === c.key).length }));

  const chIds = new Set(chTasks.map((t) => t.id));
  const chAsks = (asks.data ?? []).filter((a) => chIds.has(a.task_id));
  const yes = chAsks.filter((a) => a.status === "accepted").length;
  const no = chAsks.filter((a) => a.status === "declined");
  const split = { "Not now": no.filter((a) => a.reason === "not_now").length, "Not my thing": no.filter((a) => a.reason === "not_my_thing").length, "Too long": no.filter((a) => a.reason === "too_long").length };

  const kpis = [
    { label: "Tasks done", value: ch?.tasks_done ?? 0 },
    { label: "Hours given", value: Math.round(ch?.hours ?? 0) },
    { label: "Active members", value: ch?.active_members ?? 0 },
    { label: "Avg review time", value: avgTurn == null ? "—" : avgTurn < 48 ? `${Math.round(avgTurn)} h` : `${(avgTurn / 24).toFixed(1)} d` },
    { label: "Clarity of my tasks", value: avgClarity == null ? "—" : `${avgClarity.toFixed(1)}/5` },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {kpis.map((k) => (
          <Card key={k.label} className="p-4">
            <p className="text-sm text-muted-foreground">{k.label}</p>
            <p className="text-subtitle mt-1">{k.value}</p>
          </Card>
        ))}
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-subheading">Gaps right now</h2>
        <p className="text-sm text-muted-foreground">Gap x1.5: none done in 30 days. Social Spark x2: none in 14 days.</p>
        {gaps.length === 0 ? <p className="text-muted-foreground">Every category had a recent win. Lovely!</p> : (
          <div className="flex flex-wrap gap-2">
            {gaps.map((g) => <Chip key={g.key} tone={g.key === "social" ? "teal" : "blue"}>{g.label} needs love · pays {g.key === "social" ? "x2" : "x1.5"}</Chip>)}
          </div>
        )}
      </section>

      <Card>
        <h2 className="text-subheading mb-3">Done this month by category</h2>
        {month.length === 0 ? <p className="text-muted-foreground">No tasks finished yet this month. The first one is the best one!</p> : (
          <div className="h-64 w-full">
            <ResponsiveContainer>
              <BarChart data={chart} margin={{ left: -20, right: 8 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-30} textAnchor="end" height={60} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip cursor={{ fill: "var(--surface)" }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {chart.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % 3]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-subheading">Ask funnel</h2>
        {[{ l: "Asked", v: chAsks.length }, { l: "Said yes", v: yes }, { l: "Not now", v: no.length }].map((r) => (
          <div key={r.l} className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-sm">{r.l}</span>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-jci-blue-25"><div className="h-full rounded-full bg-jci-blue" style={{ width: `${chAsks.length ? (r.v / chAsks.length) * 100 : 0}%` }} /></div>
            <span className="w-8 text-right text-sm font-medium">{r.v}</span>
          </div>
        ))}
        <p className="text-sm text-muted-foreground">{Object.entries(split).map(([k, v]) => `${k}: ${v}`).join(" · ")}</p>
      </Card>

      {avgClarity != null && (
        <Card>
          <p className="text-subheading">Your tasks are rated {avgClarity.toFixed(1)}/5 for clarity</p>
          {avgClarity < 3.5 && <p className="mt-1 text-muted-foreground">Tip: say what 'done' looks like and how long it takes.</p>}
        </Card>
      )}
    </div>
  );
}
