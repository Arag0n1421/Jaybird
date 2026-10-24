import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useMe } from "@/hooks/use-me";
import { PageTitle } from "@/components/AppShell";
import { Chip } from "@/components/ui/chip";
import { Avatar } from "@/components/ui/member-avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingBlock, ErrorBlock } from "@/components/StateViews";
import { FollowButton } from "@/components/people/sheets";
import { RoleFlags } from "@/components/people/RoleFlags";
import { cq, fold } from "@/lib/community";
import { q } from "@/lib/queries";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/people/")({
  head: () => pageHead("People", "Find JCI members by skill, chapter and project, and follow their work."),
  component: PeoplePage,
});

const sel = "min-h-11 rounded-xl border border-border bg-jci-white px-3 text-sm";

function PeoplePage() {
  const { me, members, chapters, isLoading, error } = useMe();
  const stats = useQuery(q.stats());
  const follows = useQuery(cq.follows());
  const team = useQuery(cq.projectStats());
  const projects = useQuery(cq.projects());
  const [tab, setTab] = useState<"all" | "friends">("all");
  const [text, setText] = useState("");
  const [chapter, setChapter] = useState("");
  const [country, setCountry] = useState("");
  const [project, setProject] = useState("");
  const [role, setRole] = useState("");
  const [skill, setSkill] = useState("");

  const countries = [...new Set(chapters.map((c) => c.country))].sort();
  const skills = [...new Set(members.flatMap((m) => m.skills ?? []))].sort();
  const friends = new Set((follows.data ?? []).filter((f) => f.follower_id === me?.id).map((f) => f.followee_id));
  const inProject = (mid: number, pid: number) => (team.data ?? []).some((x) => x.project_id === pid && (x.participant_ids ?? []).includes(mid));
  const needle = fold(text.trim());

  const list = members.filter((m) => {
    if (!m.onboarded && m.id !== me?.id) return false;
    if (tab === "friends" && !friends.has(m.id)) return false;
    const ch = chapters.find((c) => c.id === m.chapter_id);
    if (needle && !fold([m.name, ch?.name, ...(m.skills ?? [])].join(" ")).includes(needle)) return false;
    if (chapter && String(m.chapter_id) !== chapter) return false;
    if (country && ch?.country !== country) return false;
    if (project && !inProject(m.id, Number(project))) return false;
    if (role === "senator" ? !m.is_senator : role === "new" ? !m.is_new : role && m.role !== role) return false;
    if (skill && !(m.skills ?? []).includes(skill)) return false;
    return true;
  });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <PageTitle title="People" subtitle="Find the right person, follow their work." />
      <div className="flex gap-2" role="group" aria-label="Who to show">
        <Chip selected={tab === "all"} onClick={() => setTab("all")}>Everyone</Chip>
        <Chip selected={tab === "friends"} onClick={() => setTab("friends")}>My friends <span className="tabular-nums">{friends.size}</span></Chip>
      </div>
      <label className="relative">
        <span className="sr-only">Search people</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Search name, chapter or skill" className="min-h-11 w-full rounded-xl border border-border pl-10 pr-3" />
      </label>
      <div className="flex flex-wrap gap-2">
        <select aria-label="Chapter" className={sel} value={chapter} onChange={(e) => setChapter(e.target.value)}>
          <option value="">All chapters</option>{chapters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select aria-label="Country" className={sel} value={country} onChange={(e) => setCountry(e.target.value)}>
          <option value="">All countries</option>{countries.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select aria-label="Project" className={sel} value={project} onChange={(e) => setProject(e.target.value)}>
          <option value="">All projects</option>{(projects.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select aria-label="Role" className={sel} value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">All roles</option><option value="member">Member</option><option value="board">Board</option><option value="president">President</option><option value="senator">Senator</option><option value="new">New member</option>
        </select>
        <select aria-label="Skill" className={sel} value={skill} onChange={(e) => setSkill(e.target.value)}>
          <option value="">All skills</option>{skills.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      {isLoading ? <LoadingBlock label="Finding people…" /> : error ? <ErrorBlock error={error} /> : list.length === 0 ? (
        <EmptyState mood="sleep" title={tab === "friends" ? "No friends here yet" : "Nobody matches"} message={tab === "friends" ? "Follow people to keep up with their work." : "Try a different search or clear a filter."} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((m) => {
            const st = stats.data?.find((s) => s.member_id === m.id);
            return (
              <li key={m.id} className="flex flex-col gap-3 rounded-xl border border-border p-4">
                <Link to="/people/$id" params={{ id: String(m.id) }} className="flex items-center gap-3">
                  <Avatar name={m.name} color={m.avatar_color} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{m.name}</span>
                    <span className="block truncate text-sm text-muted-foreground">{chapters.find((c) => c.id === m.chapter_id)?.name}{st && <> · Level <span className="text-number text-jci-black">{st.level}</span></>}</span>
                  </span>
                </Link>
                <RoleFlags m={m} />
                {(m.skills ?? []).length > 0 && <div className="flex flex-wrap gap-1">{m.skills.slice(0, 3).map((s) => <Chip key={s} tone="teal" className="py-0 text-xs">{s}</Chip>)}</div>}
                <FollowButton target={m} className="self-start" />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
