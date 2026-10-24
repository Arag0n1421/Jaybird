import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { forceCenter, forceCollide, forceX, forceY, forceLink, forceManyBody, forceSimulation, type SimulationLinkDatum, type SimulationNodeDatum } from "d3-force";
import { Minus, Plus, RotateCcw, Search } from "lucide-react";
import { useMe } from "@/hooks/use-me";
import { PageTitle } from "@/components/AppShell";
import { Chip } from "@/components/ui/chip";
import { Avatar } from "@/components/ui/member-avatar";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { LoadingBlock, ErrorBlock } from "@/components/StateViews";
import { cq, fold } from "@/lib/community";
import { q } from "@/lib/queries";
import { pageHead } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/network")({
  head: () => pageHead("Network", "How JCI members connect through buddies, mentors, projects and follows."),
  component: NetworkPage,
});

type LinkKind = "buddy" | "mentor" | "project" | "follow";
type N = SimulationNodeDatum & { id: string; kind: "member" | "project"; label: string; r: number; chapterId: number; senator?: boolean; refId: number };
type L = SimulationLinkDatum<N> & { kind: LinkKind; source: string | N; target: string | N };

const W = 900, H = 640;
/** Chapter colors are data decoration, applied inline. */
const PALETTE = ["#57BCBC", "#EFC40F", "#FF7A6B", "#0A0818", "#7FA36B", "#B8C0CC", "#C08A5A"];
const LINK_LABEL: Record<LinkKind, string> = { buddy: "Buddy", mentor: "Mentor", project: "Project", follow: "Follows" };
const sel = "min-h-11 rounded-xl border border-border bg-jci-white px-3 text-sm";
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function NetworkPage() {
  const { members, chapters, isLoading } = useMe();
  const stats = useQuery(q.stats());
  const projects = useQuery(cq.projects());
  const team = useQuery(cq.projectStats());
  const follows = useQuery(cq.follows());
  const buddies = useQuery(cq.buddies());
  const mentors = useQuery(cq.mentors());
  const [chapter, setChapter] = useState("");
  const [country, setCountry] = useState("");
  const [kinds, setKinds] = useState<Record<LinkKind, boolean>>({ buddy: true, mentor: true, project: true, follow: true });
  const [text, setText] = useState("");
  const [focus, setFocus] = useState<string | null>(null);

  const loading = isLoading || stats.isLoading || projects.isLoading || team.isLoading || follows.isLoading || buddies.isLoading || mentors.isLoading;
  const err = stats.error ?? projects.error ?? team.error ?? follows.error ?? buddies.error ?? mentors.error;
  const chapterColor = (id: number) => PALETTE[Math.max(0, chapters.findIndex((c) => c.id === id)) % PALETTE.length]!;
  const countries = [...new Set(chapters.map((c) => c.country))].sort();

  const graph = useMemo(() => {
    if (loading || err) return { nodes: [] as N[], links: [] as L[] };
    const okChapter = (cid: number) => {
      const c = chapters.find((x) => x.id === cid);
      return (!chapter || String(cid) === chapter) && (!country || c?.country === country);
    };
    const xp = (id: number) => stats.data?.find((s) => s.member_id === id)?.xp ?? 0;
    const maxXp = Math.max(1, ...members.map((m) => xp(m.id)));
    const nodes: N[] = members.filter((m) => m.onboarded && okChapter(m.chapter_id)).map((m) => ({
      id: `m${m.id}`, kind: "member", label: m.name, refId: m.id, chapterId: m.chapter_id, senator: m.is_senator,
      r: 7 + 15 * Math.sqrt(xp(m.id) / maxXp), // bounded 7..22
    }));
    const ids = new Set(nodes.map((n) => n.id));
    for (const p of projects.data ?? []) if (okChapter(p.chapter_id)) nodes.push({ id: `p${p.id}`, kind: "project", label: p.name, refId: p.id, chapterId: p.chapter_id, r: 10 });
    nodes.forEach((n) => ids.add(n.id));
    const links: L[] = [];
    const add = (a: string, b: string, kind: LinkKind) => { if (kinds[kind] && ids.has(a) && ids.has(b) && a !== b) links.push({ source: a, target: b, kind }); };
    (buddies.data ?? []).forEach((b) => add(`m${b.buddy_id}`, `m${b.new_member_id}`, "buddy"));
    (mentors.data ?? []).forEach((m) => add(`m${m.senator_id}`, `m${m.member_id}`, "mentor"));
    (team.data ?? []).forEach((x) => [...new Set(x.participant_ids ?? [])].forEach((mid) => add(`m${mid}`, `p${x.project_id}`, "project")));
    (follows.data ?? []).forEach((f) => add(`m${f.follower_id}`, `m${f.followee_id}`, "follow"));
    return { nodes, links };
  }, [loading, err, members, chapters, stats.data, projects.data, team.data, follows.data, buddies.data, mentors.data, chapter, country, kinds]);

  const needle = fold(text.trim());
  const matches = needle ? new Set(graph.nodes.filter((n) => fold(n.label).includes(needle)).map((n) => n.id)) : null;
  const focused = graph.nodes.find((n) => n.id === focus) ?? null;
  const idOf = (x: string | N) => (typeof x === "string" ? x : x.id);
  const neighbors = focused ? graph.links.filter((l) => idOf(l.source) === focused.id || idOf(l.target) === focused.id) : [];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <PageTitle title="Network" subtitle="Who works with whom. Drag, zoom, tap a circle for details." />
      <div className="flex flex-wrap gap-2">
        <label className="relative min-w-0 flex-1 basis-56">
          <span className="sr-only">Search the network</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Find a person or project" className="min-h-11 w-full rounded-xl border border-border pl-10 pr-3" />
        </label>
        <select aria-label="Chapter" className={sel} value={chapter} onChange={(e) => setChapter(e.target.value)}>
          <option value="">All chapters</option>{chapters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select aria-label="Country" className={sel} value={country} onChange={(e) => setCountry(e.target.value)}>
          <option value="">All countries</option>{countries.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4" role="group" aria-label="Connection types">
        {(Object.keys(LINK_LABEL) as LinkKind[]).map((k) => <Chip key={k} selected={kinds[k]} onClick={() => setKinds({ ...kinds, [k]: !kinds[k] })}>{LINK_LABEL[k]}</Chip>)}
      </div>
      <Legend chapters={chapters.map((c) => ({ id: c.id, name: c.name, color: chapterColor(c.id) }))} />

      {loading ? <LoadingBlock label="Mapping connections…" /> : err ? <ErrorBlock error={err} /> : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <Graph nodes={graph.nodes} links={graph.links} color={chapterColor} matches={matches} focus={focus} onFocus={setFocus} />
          <aside className="hidden lg:block">
            {focused ? <Details node={focused} links={neighbors} nodes={graph.nodes} onFocus={setFocus} /> : <p className="rounded-xl border border-border p-4 text-sm text-muted-foreground">Tap a circle, diamond or square to see its connections.</p>}
          </aside>
        </div>
      )}
      <div className="lg:hidden">
        <BottomSheet open={!!focused} onClose={() => setFocus(null)} title={focused?.label}>
          {focused && <Details node={focused} links={neighbors} nodes={graph.nodes} onFocus={setFocus} hideTitle />}
        </BottomSheet>
      </div>

      <details className="rounded-xl border border-border p-4">
        <summary className="min-h-11 cursor-pointer content-center font-bold">Connections as a list</summary>
        <ul className="mt-3 flex flex-col gap-2">
          {graph.nodes.filter((n) => !matches || matches.has(n.id)).map((n) => {
            const c = graph.links.filter((l) => idOf(l.source) === n.id || idOf(l.target) === n.id).length;
            return (
              <li key={n.id}>
                <button onClick={() => setFocus(n.id)} className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-2 text-left hover:bg-surface">
                  <span>{n.label} <span className="text-xs text-muted-foreground">{n.kind === "project" ? "Project" : n.senator ? "Senator" : "Member"}</span></span>
                  <span className="text-sm tabular-nums text-muted-foreground">{c} links</span>
                </button>
              </li>
            );
          })}
        </ul>
      </details>
    </div>
  );
}

function Legend({ chapters }: { chapters: { id: number; name: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {chapters.map((c) => <span key={c.id} className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full" style={{ background: c.color }} />{c.name}</span>)}
      <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rotate-45 border border-jci-black" />Senator</span>
      <span className="inline-flex items-center gap-1"><span className="h-3 w-3 border border-jci-black" />Project</span>
      <span>Teal thick: buddy · Yellow dashed: mentor · Thin: project · Dotted arrow: follows</span>
    </div>
  );
}

function Graph({ nodes, links, color, matches, focus, onFocus }: { nodes: N[]; links: L[]; color: (id: number) => string; matches: Set<string> | null; focus: string | null; onFocus: (id: string | null) => void }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<ReturnType<typeof forceSimulation<N>> | null>(null);
  const [, setTick] = useState(0);
  const [view, setView] = useState({ k: 1, x: 0, y: 0 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const drag = useRef<{ node: N; moved: boolean } | null>(null);
  const pan = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);

  useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sim = forceSimulation<N>(nodes)
      .force("link", forceLink<N, L>(links).id((d) => d.id).distance((l) => (l.kind === "project" ? 95 : 130)).strength(0.35))
      .force("charge", forceManyBody().strength(-420))
      .force("center", forceCenter(W / 2, H / 2))
      .force("x", forceX<N>(W / 2).strength(0.045))
      .force("y", forceY<N>(H / 2).strength(0.06))
      .force("collide", forceCollide<N>().radius((d) => d.r + 12))
      .on("tick", () => {
        nodes.forEach((n) => { n.x = clamp(n.x ?? 0, n.r, W - n.r); n.y = clamp(n.y ?? 0, n.r, H - n.r); });
        setTick((t) => t + 1);
      });
    if (reduce) { sim.stop(); for (let i = 0; i < 300; i++) sim.tick(); setTick((t) => t + 1); }
    simRef.current = sim;
    return () => { sim.stop(); sim.on("tick", null); simRef.current = null; };
  }, [nodes, links]);

  // Wheel zoom anchored at the cursor; native non-passive listener so the page doesn't scroll.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const v = viewRef.current;
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const k = clamp(v.k * Math.exp(-dy * 0.0015), 0.4, 4);
      const pt = toSvg(el, e.clientX, e.clientY);
      const f = k / v.k;
      setView({ k, x: pt.x - (pt.x - v.x) * f, y: pt.y - (pt.y - v.y) * f });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  function zoomBy(f: number) {
    const v = viewRef.current;
    const k = clamp(v.k * f, 0.4, 4);
    const r = k / v.k;
    setView({ k, x: W / 2 - (W / 2 - v.x) * r, y: H / 2 - (H / 2 - v.y) * r });
  }
  const toWorld = (cx: number, cy: number) => {
    const p = toSvg(svgRef.current!, cx, cy);
    const v = viewRef.current;
    return { x: (p.x - v.x) / v.k, y: (p.y - v.y) / v.k };
  };

  function onPointerMove(e: React.PointerEvent) {
    if (drag.current) {
      const w = toWorld(e.clientX, e.clientY);
      drag.current.node.fx = w.x; drag.current.node.fy = w.y; drag.current.moved = true;
      simRef.current?.alphaTarget(0.3).restart();
    } else if (pan.current) {
      const p = toSvg(svgRef.current!, e.clientX, e.clientY);
      setView((v) => ({ ...v, x: pan.current!.vx + p.x - pan.current!.x, y: pan.current!.vy + p.y - pan.current!.y }));
    }
  }
  function endPointer() {
    if (drag.current) {
      const { node, moved } = drag.current;
      node.fx = null; node.fy = null;
      simRef.current?.alphaTarget(0);
      if (!moved) onFocus(node.id);
    }
    drag.current = null; pan.current = null;
  }

  const idOf = (x: string | N) => (typeof x === "string" ? x : x.id);
  const near = focus ? new Set([focus, ...links.flatMap((l) => (idOf(l.source) === focus ? [idOf(l.target)] : idOf(l.target) === focus ? [idOf(l.source)] : []))]) : null;
  const dim = (id: string) => (near && !near.has(id)) || (matches && !matches.has(id));

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-surface">
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="block h-[60vh] max-h-[640px] min-h-[360px] w-full touch-none select-none" role="img" aria-label="Network graph. Use the list below for an accessible version."
        onPointerDown={(e) => { if (e.target === svgRef.current) { const p = toSvg(svgRef.current!, e.clientX, e.clientY); pan.current = { x: p.x, y: p.y, vx: view.x, vy: view.y }; (e.currentTarget as Element).setPointerCapture(e.pointerId); } }}
        onPointerMove={onPointerMove} onPointerUp={endPointer} onPointerLeave={endPointer}
        onClick={(e) => { if (e.target === svgRef.current) onFocus(null); }}>
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#0A0818" opacity="0.5" /></marker>
        </defs>
        <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
          {links.map((l, i) => {
            const s = l.source as N, t = l.target as N;
            if (s.x == null || t.x == null) return null;
            const faded = dim(s.id) && dim(t.id);
            const style = l.kind === "buddy" ? { stroke: "#57BCBC", strokeWidth: 4 } : l.kind === "mentor" ? { stroke: "#EFC40F", strokeWidth: 2.5, strokeDasharray: "8 5" } : l.kind === "follow" ? { stroke: "#0A0818", strokeWidth: 1.25, strokeDasharray: "2 4", markerEnd: "url(#arrow)" } : { stroke: "#0A0818", strokeWidth: 0.75 };
            const dx = (t.x ?? 0) - (s.x ?? 0), dy = (t.y ?? 0) - (s.y ?? 0), d = Math.hypot(dx, dy) || 1;
            const ex = l.kind === "follow" ? (t.x ?? 0) - (dx / d) * (t.r + 2) : t.x, ey = l.kind === "follow" ? (t.y ?? 0) - (dy / d) * (t.r + 2) : t.y;
            return <line key={i} x1={s.x} y1={s.y} x2={ex} y2={ey} {...style} opacity={faded ? 0.08 : l.kind === "project" || l.kind === "follow" ? 0.45 : 0.9} />;
          })}
          {nodes.map((n) => {
            if (n.x == null || n.y == null) return null;
            const fill = n.kind === "project" ? "#FFFFFF" : color(n.chapterId);
            const strokeW = focus === n.id ? 3 : 1.5;
            const common = { fill, stroke: "#0A0818", strokeWidth: strokeW, opacity: dim(n.id) ? 0.2 : 1, style: { cursor: "pointer" } as const,
              onPointerDown: (e: React.PointerEvent) => { e.stopPropagation(); drag.current = { node: n, moved: false }; svgRef.current?.setPointerCapture(e.pointerId); } };
            return (
              <g key={n.id} transform={`translate(${n.x},${n.y})`}>
                <title>{n.label}</title>
                {n.kind === "project" ? <rect x={-n.r} y={-n.r} width={n.r * 2} height={n.r * 2} rx={2} {...common} />
                  : n.senator ? <rect x={-n.r * 0.8} y={-n.r * 0.8} width={n.r * 1.6} height={n.r * 1.6} transform="rotate(45)" {...common} />
                    : <circle r={n.r} {...common} />}
                {(view.k > 1.3 || focus === n.id || matches?.has(n.id)) && <text y={n.r + 12} textAnchor="middle" fontSize={11} fill="#0A0818" pointerEvents="none">{n.label}</text>}
              </g>
            );
          })}
        </g>
      </svg>
      <div className="absolute right-2 top-2 flex flex-col gap-1">
        <button onClick={() => zoomBy(1.3)} aria-label="Zoom in" className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-jci-white"><Plus className="h-5 w-5" /></button>
        <button onClick={() => zoomBy(1 / 1.3)} aria-label="Zoom out" className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-jci-white"><Minus className="h-5 w-5" /></button>
        <button onClick={() => setView({ k: 1, x: 0, y: 0 })} aria-label="Reset view" className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-jci-white"><RotateCcw className="h-5 w-5" /></button>
      </div>
    </div>
  );
}

function toSvg(svg: SVGSVGElement, cx: number, cy: number) {
  const r = svg.getBoundingClientRect();
  // viewBox uses preserveAspectRatio xMidYMid meet
  const s = Math.min(r.width / W, r.height / H);
  const ox = (r.width - W * s) / 2, oy = (r.height - H * s) / 2;
  return { x: (cx - r.left - ox) / s, y: (cy - r.top - oy) / s };
}

function Details({ node, links, nodes, onFocus, hideTitle }: { node: N; links: L[]; nodes: N[]; onFocus: (id: string) => void; hideTitle?: boolean }) {
  const { members } = useMe();
  const idOf = (x: string | N) => (typeof x === "string" ? x : x.id);
  const m = node.kind === "member" ? members.find((x) => x.id === node.refId) : null;
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
      {!hideTitle && <div className="flex items-center gap-2">{m && <Avatar name={m.name} color={m.avatar_color} size="sm" />}<p className="font-bold">{node.label}</p></div>}
      {node.kind === "member"
        ? <Link to="/people/$id" params={{ id: String(node.refId) }} className="min-h-11 content-center text-sm font-bold text-jci-blue underline">Open profile</Link>
        : <Link to="/projects/$id" params={{ id: String(node.refId) }} className="min-h-11 content-center text-sm font-bold text-jci-blue underline">Open project</Link>}
      {links.length === 0 ? <p className="text-sm text-muted-foreground">No connections in this view.</p> : (
        <ul className="flex flex-col gap-1">
          {links.map((l, i) => {
            const outgoing = idOf(l.source) === node.id;
            const other = nodes.find((n) => n.id === (outgoing ? idOf(l.target) : idOf(l.source)));
            if (!other) return null;
            const label = l.kind === "follow" ? (outgoing ? "Follows" : "Followed by") : l.kind === "mentor" ? (outgoing ? "Mentors" : "Mentored by") : l.kind === "buddy" ? "Buddy" : other.kind === "project" ? "On project" : "Team member";
            return (
              <li key={i}>
                <button onClick={() => onFocus(other.id)} className={cn("flex min-h-11 w-full items-center justify-between gap-2 rounded-lg px-2 text-left text-sm hover:bg-surface")}>
                  <span className="truncate">{other.label}</span><span className="shrink-0 text-xs text-muted-foreground">{label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
