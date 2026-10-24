import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Linkedin } from "lucide-react";
import { useMe } from "@/hooks/use-me";
import { useIsLead } from "@/hooks/use-is-lead";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Avatar } from "@/components/ui/member-avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingBlock } from "@/components/StateViews";
import { AskSheet, FollowButton, GiveBadgeSheet } from "@/components/people/sheets";
import { RoleFlags } from "@/components/people/RoleFlags";
import { EarnedBadges, Recognition } from "@/components/Badges";
import { cq } from "@/lib/community";
import { q } from "@/lib/queries";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/people/$id")({
  head: () => pageHead("Member profile", "Skills, projects, badges and recognition of a JCI member."),
  component: PersonPage,
});

function PersonPage() {
  const { id } = Route.useParams();
  const pid = Number(id);
  const { me, members, chapters, isLoading } = useMe();
  const isLead = useIsLead();
  const stats = useQuery(q.stats());
  const team = useQuery(cq.projectStats());
  const projects = useQuery(cq.projects());
  const recs = useQuery(cq.recommendations());
  const follows = useQuery(cq.follows());
  const [give, setGive] = useState(false);
  const [ask, setAsk] = useState(false);

  if (isLoading) return <LoadingBlock label="Opening the profile…" />;
  const m = members.find((x) => x.id === pid);
  if (!m) return <EmptyState mood="sleep" title="Member not found" message="They may have left." action={<Link to="/people" className="min-h-11 font-bold text-jci-blue underline">All people</Link>} />;
  const st = stats.data?.find((s) => s.member_id === m.id);
  const ch = chapters.find((c) => c.id === m.chapter_id);
  const myProjects = (projects.data ?? []).filter((p) => (team.data ?? []).some((x) => x.project_id === p.id && (x.participant_ids ?? []).includes(m.id)));
  const myRecs = (recs.data ?? []).filter((r) => r.member_id === m.id);
  const followers = (follows.data ?? []).filter((f) => f.followee_id === m.id).length;
  const self = me?.id === m.id;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link to="/people" className="flex min-h-11 items-center gap-1 self-start text-sm font-bold text-jci-blue"><ArrowLeft className="h-4 w-4" />People</Link>
      <section className="ripple flex flex-col gap-4 rounded-xl p-5 sm:flex-row sm:items-center">
        <Avatar name={m.name} color={m.avatar_color} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="text-subtitle">{m.name}</h1>
          <p className="text-sm opacity-90">{ch?.name}{ch && ` · ${ch.country}`} · {followers} followers</p>
        </div>
      </section>
      <div className="flex flex-wrap items-center gap-2">
        <RoleFlags m={m} />
        {self ? <Link to="/me" className="flex min-h-11 items-center text-sm font-bold text-jci-blue underline">This is you. Edit on Me</Link> : (
          <>
            <FollowButton target={m} />
            <button onClick={() => setGive(true)} className="min-h-11 rounded-full border border-border px-4 text-sm font-bold hover:border-jci-blue">Give a badge</button>
            {isLead && <button onClick={() => setAsk(true)} className="min-h-11 rounded-full border border-border px-4 text-sm font-bold hover:border-jci-blue">Ask personally</button>}
          </>
        )}
      </div>

      {st && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {([["Level", st.level], ["Total XP", st.xp], ["Tasks done", st.tasks_done], ["Streak", `${st.streak_weeks} wk`]] as const).map(([l, v]) => (
            <Card key={l} className="p-4"><p className="text-sm text-muted-foreground">{l}</p><p className="mt-1 text-xl text-number">{v}</p></Card>
          ))}
        </div>
      )}

      {(m.skills ?? []).length > 0 && (
        <section><h2 className="text-subheading mb-2">Skills</h2><div className="flex flex-wrap gap-2">{m.skills.map((s) => <Chip key={s} tone="teal">{s}</Chip>)}</div></section>
      )}

      <section>
        <h2 className="text-subheading mb-2">Projects</h2>
        {myProjects.length === 0 ? <p className="text-sm text-muted-foreground">Not on a project team yet.</p> : (
          <ul className="flex flex-wrap gap-2">{myProjects.map((p) => (
            <li key={p.id}><Link to="/projects/$id" params={{ id: String(p.id) }} className="flex min-h-11 items-center rounded-full border border-border px-4 text-sm hover:border-jci-blue">{p.name}{p.lead_id === m.id && <span className="ml-1 text-xs text-muted-foreground">· Lead</span>}</Link></li>
          ))}</ul>
        )}
      </section>

      <section><h2 className="text-subheading mb-3">Badges</h2><EarnedBadges memberId={m.id} /></section>
      <section><h2 className="text-subheading mb-3">Recognized by</h2><Recognition memberId={m.id} /></section>

      <section>
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-subheading">What people say</h2>
          {m.linkedin_url && <a href={m.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center gap-1 text-sm font-bold text-jci-blue underline"><Linkedin className="h-4 w-4" strokeWidth={1.75} />LinkedIn</a>}
        </div>
        {recs.isLoading ? <div className="h-20 animate-pulse rounded-xl bg-surface" /> : myRecs.length === 0 ? <p className="text-sm text-muted-foreground">No recommendations yet.</p> : (
          <div className="flex flex-col gap-2">{myRecs.map((r) => (
            <Card key={r.id} className="p-4">
              <p>“{r.text}”</p>
              <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">{r.author_name}{r.author_title ? `, ${r.author_title}` : ""}<Chip tone={r.source === "linkedin" ? "blue" : "teal"} className="py-0 text-xs">{r.source === "linkedin" ? "LinkedIn" : "JAM"}</Chip></p>
            </Card>
          ))}</div>
        )}
      </section>

      {!self && <GiveBadgeSheet receiver={m} open={give} onClose={() => setGive(false)} />}
      {!self && isLead && <AskSheet target={m} open={ask} onClose={() => setAsk(false)} />}
    </div>
  );
}
