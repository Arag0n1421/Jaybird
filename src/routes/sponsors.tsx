import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trophy, Building2, Sparkles } from "lucide-react";
import { useMe } from "@/hooks/use-me";
import { useCountUp } from "@/hooks/use-count-up";
import { Mascot } from "@/components/Mascot";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { toast } from "@/components/ui/toast";
import { LoadingBlock, ErrorBlock } from "@/components/StateViews";
import { getChapterImpact, getPledges, getSeasonPrizePool, getSponsors, insertPledge, insertSponsor, type PledgeTarget } from "@/lib/db";
import { useCategories } from "@/lib/categories";
import { pageHead } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/sponsors")({
  head: () => pageHead("Sponsors", "Back the JCI members who do the work. Fund year-end honors, a chapter, or a neglected category."),
  component: Sponsors,
});

const GOAL = 2000;
const WAYS: { key: PledgeTarget; title: string; text: string; icon: typeof Trophy }[] = [
  { key: "season_pool", title: "Season prize pool", text: "Funds year-end honors for the top members.", icon: Trophy },
  { key: "chapter", title: "Back a chapter", text: "Pick a chapter and see its impact grow.", icon: Building2 },
  { key: "category", title: "Back a gap", text: "Fund extra rewards for work a chapter neglects, like Social media.", icon: Sparkles },
];

function Stat({ label, value }: { label: string; value: number }) {
  const v = useCountUp(value);
  return (
    <div className="flex flex-col">
      <span className="text-subtitle font-semibold">{v.toLocaleString("en")}</span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

function Sponsors() {
  const year = new Date().getFullYear();
  const impact = useQuery({ queryKey: ["tasks", "chapter_impact"], queryFn: getChapterImpact });
  const pool = useQuery({ queryKey: ["sponsor_pledges", "pool"], queryFn: getSeasonPrizePool });
  const pledges = useQuery({ queryKey: ["sponsor_pledges", "all"], queryFn: getPledges });
  const sponsors = useQuery({ queryKey: ["sponsor_pledges", "sponsors"], queryFn: getSponsors });
  const [sheet, setSheet] = useState<{ way: PledgeTarget; chapter?: number } | null>(null);

  if (impact.isLoading) return <LoadingBlock label="Adding up the impact…" />;
  if (impact.error) return <ErrorBlock error={impact.error} onRetry={() => void impact.refetch()} />;

  const rows = impact.data ?? [];
  const sum = (k: "tasks_done" | "hours" | "active_members") => rows.reduce((s, r) => s + Number(r[k] ?? 0), 0);
  const p = pool.data?.find((x) => x.season === year);
  const total = Number(p?.total_eur ?? 0);
  const seasonSponsorIds = new Set((pledges.data ?? []).filter((x) => x.season === year).map((x) => x.sponsor_id));
  const wall = (sponsors.data ?? []).filter((s) => seasonSponsorIds.has(s.id));

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <section className="ripple flex flex-col gap-3 rounded-xl p-6 lg:p-10">
        <h1 className="text-title">Back the people who do the work</h1>
        <p className="text-subtitle max-w-2xl opacity-90">JCI members give their time. Sponsors turn that time into recognition.</p>
      </section>

      <Card className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="tasks done" value={sum("tasks_done")} />
        <Stat label="hours given" value={Math.round(sum("hours"))} />
        <Stat label="active members" value={sum("active_members")} />
        <Stat label="chapters" value={rows.length} />
      </Card>

      <Card className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">Season {year} prize pool</p>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <span className="text-title">EUR {Math.round(total).toLocaleString("en")}</span>
          <span className="text-muted-foreground">from {p?.sponsors ?? 0} sponsors · goal EUR {GOAL.toLocaleString("en")}</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-jci-blue-25"><div className="h-full rounded-full bg-jci-blue transition-all" style={{ width: `${Math.min(100, (total / GOAL) * 100)}%` }} /></div>
        <PrimaryButton className="self-start" onClick={() => setSheet({ way: "season_pool" })}>Pledge to the pool</PrimaryButton>
      </Card>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {WAYS.map((w) => (
          <Card key={w.key} className="flex flex-col gap-3">
            <w.icon className="h-6 w-6 text-jci-blue" />
            <h2 className="text-subheading">{w.title}</h2>
            <p className="flex-1 text-muted-foreground">{w.text}</p>
            <SecondaryButton onClick={() => setSheet({ way: w.key })}>Choose this</SecondaryButton>
          </Card>
        ))}
      </section>

      <section>
        <h2 className="text-subheading mb-3">Sponsor wall</h2>
        {wall.length === 0 ? <p className="text-muted-foreground">Be the first sponsor this season!</p> : (
          <div className="flex flex-wrap gap-3">
            {wall.map((s) => (
              <a key={s.id} href={s.website ?? undefined} target="_blank" rel="noreferrer" className="flex h-16 min-w-32 items-center justify-center rounded-xl border border-border bg-jci-white px-4">
                {s.logo_url ? <img src={s.logo_url} alt={s.name} className="max-h-10 max-w-32 object-contain" /> : <span className="font-medium">{s.name}</span>}
              </a>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-subheading mb-3">Chapters</h2>
        <div className="flex flex-col gap-2">
          {rows.map((c) => (
            <Card key={c.chapter_id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{c.name}</p>
                <p className="text-sm text-muted-foreground">{c.country} · {c.tasks_done} done · {Math.round(c.hours)} h · {c.open_tasks} open</p>
              </div>
              <SecondaryButton className="min-h-10 px-4" onClick={() => setSheet({ way: "chapter", chapter: c.chapter_id })}>Back this chapter</SecondaryButton>
            </Card>
          ))}
        </div>
      </section>

      <PledgeSheet key={sheet ? `${sheet.way}-${sheet.chapter ?? ""}` : "closed"} init={sheet} onClose={() => setSheet(null)} />
    </div>
  );
}

function PledgeSheet({ init, onClose }: { init: { way: PledgeTarget; chapter?: number } | null; onClose: () => void }) {
  const { chapters } = useMe();
  const cats = useCategories();
  const qc = useQueryClient();
  const [f, setF] = useState({ company: "", contact: "", email: "", website: "", way: init?.way ?? "season_pool", chapter: init?.chapter ?? chapters[0]?.id ?? 0, category: "social", amount: 250, custom: "", reward: "" });
  const [done, setDone] = useState(false);
  const amount = f.custom ? Number(f.custom) : f.amount;
  const valid = f.company.trim() && f.contact.trim() && /\S+@\S+\.\S+/.test(f.email) && amount > 0;

  const submit = useMutation({
    mutationFn: async () => {
      const s = await insertSponsor({ name: f.company.trim(), contact_name: f.contact.trim(), contact_email: f.email.trim(), website: f.website.trim() || null, logo_url: null });
      await insertPledge({
        sponsor_id: s.id, target_type: f.way, chapter_id: f.way === "chapter" || f.way === "category" ? f.chapter : null,
        category: f.way === "category" ? f.category : null, amount_eur: amount, reward_note: f.reward.trim() || null,
        season: new Date().getFullYear(), status: "pledged",
      });
    },
    onSuccess: () => { setDone(true); void qc.invalidateQueries(); },
    onError: (e: Error) => toast.error("Couldn't send your pledge", e.message),
  });

  const input = "min-h-11 w-full rounded-xl border border-border bg-jci-white px-3 focus:border-jci-blue focus:outline-none";
  return (
    <BottomSheet open={!!init} onClose={onClose} title={done ? undefined : "Make a pledge"}>
      {done ? (
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <Mascot mood="cheer" size={110} />
          <p className="text-subtitle">Thank you, {f.company}!</p>
          <p className="text-muted-foreground">We'll be in touch at {f.email}. Members will see your name on the wall.</p>
          <SecondaryButton onClick={onClose}>Close</SecondaryButton>
        </div>
      ) : (
        <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); if (valid) submit.mutate(); }}>
          <input required className={input} placeholder="Company name" value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} maxLength={120} />
          <input required className={input} placeholder="Contact name" value={f.contact} onChange={(e) => setF({ ...f, contact: e.target.value })} maxLength={120} />
          <input required type="email" className={input} placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} maxLength={200} />
          <input type="url" className={input} placeholder="Website (optional)" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} maxLength={200} />
          <div className="flex flex-wrap gap-2">
            {WAYS.map((w) => <Chip key={w.key} selected={f.way === w.key} onClick={() => setF({ ...f, way: w.key })}>{w.title}</Chip>)}
          </div>
          {(f.way === "chapter" || f.way === "category") && (
            <select className={input} value={f.chapter} onChange={(e) => setF({ ...f, chapter: Number(e.target.value) })} aria-label="Chapter">
              {chapters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          {f.way === "category" && (
            <select className={input} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} aria-label="Category">
              {(cats.data ?? []).map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {[100, 250, 500, 1000].map((a) => <Chip key={a} selected={!f.custom && f.amount === a} onClick={() => setF({ ...f, amount: a, custom: "" })}>EUR {a}</Chip>)}
            <input type="number" min={1} placeholder="Other" aria-label="Custom amount" className={cn(input, "w-28")} value={f.custom} onChange={(e) => setF({ ...f, custom: e.target.value })} />
          </div>
          <textarea rows={2} className={cn(input, "py-2")} placeholder="What would you like in return?" value={f.reward} onChange={(e) => setF({ ...f, reward: e.target.value })} maxLength={500} />
          <PrimaryButton type="submit" block disabled={!valid || submit.isPending}>{submit.isPending ? "Sending…" : `Pledge EUR ${amount || 0}`}</PrimaryButton>
        </form>
      )}
    </BottomSheet>
  );
}
