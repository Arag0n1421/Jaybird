import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { Clock } from "lucide-react";
import { Mascot } from "@/components/Mascot";
import { Chip } from "@/components/ui/chip";
import { XpBadge } from "@/components/ui/xp-badge";
import { useCountUp } from "@/hooks/use-count-up";
import { getChapterImpact, getSeasonPrizePool } from "@/lib/db";
import { pageHead } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pitch")({
  head: () => pageHead("Pitch", "Jaybird: the JCI volunteer app that matches the right member to the right task."),
  component: Pitch,
});

const N = 6;

function Pitch() {
  const [i, setI] = useState(0);
  const refs = useRef<(HTMLElement | null)[]>([]);
  const go = useCallback((n: number) => {
    const t = Math.max(0, Math.min(N - 1, n));
    refs.current[t]?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setI(Number((e.target as HTMLElement).dataset["i"]))), { threshold: 0.6 });
    refs.current.forEach((r) => r && io.observe(r));
    const key = (e: KeyboardEvent) => {
      if (["ArrowDown", "ArrowRight", "PageDown", " "].includes(e.key)) { e.preventDefault(); go(i + 1); }
      if (["ArrowUp", "ArrowLeft", "PageUp"].includes(e.key)) { e.preventDefault(); go(i - 1); }
    };
    window.addEventListener("keydown", key);
    return () => { io.disconnect(); window.removeEventListener("keydown", key); };
  }, [i, go]);

  // Horizontal swipe also moves (vertical swipe is native scroll-snap)
  const touch = useRef<{ x: number; y: number } | null>(null);
  const sec = (n: number, cls: string, children: ReactNode) => (
    <section key={n} data-i={n} ref={(el) => { refs.current[n] = el; }} className={cn("flex min-h-[100svh] snap-start flex-col items-center justify-center px-4 py-12 lg:px-16", cls)}>
      <div className="w-full max-w-5xl">{children}</div>
    </section>
  );

  return (
    <main
      className="h-[100svh] snap-y snap-mandatory overflow-y-auto"
      onTouchStart={(e) => { touch.current = { x: e.touches[0]!.clientX, y: e.touches[0]!.clientY }; }}
      onTouchEnd={(e) => {
        const s = touch.current; if (!s) return;
        const dx = e.changedTouches[0]!.clientX - s.x, dy = e.changedTouches[0]!.clientY - s.y;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) go(i + (dx < 0 ? 1 : -1));
      }}
    >
      <nav aria-label="Slides" className="fixed right-3 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-2">
        {Array.from({ length: N }, (_, n) => (
          <button key={n} aria-label={`Slide ${n + 1}`} onClick={() => go(n)} className={cn("relative h-2.5 w-2.5 rounded-full border before:absolute before:-inset-4 before:content-[''] border-jci-navy transition", i === n ? "scale-125 bg-jci-navy" : "bg-jci-white/70")} />
        ))}
      </nav>

      {sec(0, "bg-jci-blue text-jci-white", (
        <div className="flex flex-col gap-10">
          <img src="/jci-logo.png" alt="JCI" className="h-10 w-auto self-start rounded bg-jci-white p-2" />
          <h1 className="text-title lg:text-[4.5rem] lg:leading-[1.1]">Lots of work.<br />No map of who can do it.</h1>
          <blockquote className="max-w-3xl border-l-4 border-jci-white pl-5">
            <p className="text-quote lg:text-[2.25rem]">“The biggest challenge is to manage people who are not formally subordinate.”</p>
            <footer className="mt-3 opacity-90">Uģis Krūmiņš, JCI Latvia Senator</footer>
          </blockquote>
        </div>
      ))}

      {sec(1, "bg-jci-white", (
        <div className="flex flex-col gap-6">
          <p className="text-sm text-jci-blue">We asked JCI members</p>
          <h2 className="text-title">What stops you from taking on more?</h2>
          <Bars max={9} rows={[["No time", 9], ["Don't know what tasks exist", 6], ["Not sure what I'm good at", 3], ["Nobody asked me", 1], ["My effort isn't seen", 1]]} />
          <p className="text-subtitle">Time and discoverability, <span className="text-jci-blue">not motivation.</span></p>
          <p className="text-xs text-muted-foreground">One WhatsApp group, multi-select: counts are votes, not people.</p>
        </div>
      ))}

      {sec(2, "bg-surface", (
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <div className="flex flex-col gap-4"><h2 className="text-subtitle">Project leads: is finding the right people hard?</h2><Bars max={10} rows={[["Very", 5], ["Somewhat", 8], ["No", 0]]} /></div>
          <div className="flex flex-col gap-4"><h2 className="text-subtitle">Would you use an app that matches you to tasks?</h2><Bars max={10} rows={[["Yes", 7], ["Maybe", 10], ["No", 0]]} color="bg-jci-teal" /></div>
        </div>
      ))}

      {sec(3, "bg-jci-white", (
        <div className="flex flex-col items-center gap-8">
          <h2 className="text-title text-center">One task at a time</h2>
          <div className="flex w-full flex-col items-center gap-6 lg:flex-row lg:justify-center">
            <Mascot mood="cheer" message="This one's perfect for you!" size={130} />
            <div className="w-full max-w-sm rounded-xl border border-border bg-jci-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-jci-blue">Your one task today</p>
              <p className="text-subtitle mt-2">Write the Instagram recap</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4 text-jci-blue" />15 min</span>
                <XpBadge xp={40} /><Chip tone="blue">92% match</Chip>
              </div>
              <div className="mt-3 flex flex-wrap gap-2"><Chip tone="teal">Good at social media</Chip><Chip tone="teal">No posts lately, x2 XP</Chip></div>
              <div className="mt-4 rounded-xl bg-jci-yellow py-3 text-center font-semibold text-jci-black">Yes, I'll do it</div>
              <p className="mt-2 text-center text-sm text-muted-foreground">Not now</p>
            </div>
          </div>
          <p className="text-subtitle text-center">Asked personally by your lead. <span className="text-jci-blue">Never a group broadcast.</span></p>
        </div>
      ))}

      {sec(4, "bg-jci-white", (
        <div className="flex flex-col items-center gap-6">
          <h2 className="text-title">The loop</h2>
          <Loop active={i === 4} />
        </div>
      ))}

      {sec(5, "bg-jci-blue text-jci-white", <Closing />)}
    </main>
  );
}

function Bars({ rows, max, color = "bg-jci-blue" }: { rows: [string, number][]; max: number; color?: string }) {
  return (
    <div className="flex flex-col gap-3">
      {rows.map(([l, v]) => (
        <div key={l} className="grid grid-cols-[minmax(0,10rem)_1fr_2rem] items-center gap-3 lg:grid-cols-[16rem_1fr_3rem]">
          <span className="text-sm lg:text-base">{l}</span>
          <div className="h-6 overflow-hidden rounded-md bg-jci-blue-25/60">
            <motion.div className={cn("h-full rounded-md", color)} initial={{ width: 0 }} whileInView={{ width: `${(v / max) * 100}%` }} viewport={{ once: true }} transition={{ duration: 0.9, ease: "easeOut" }} />
          </div>
          <span className="text-right font-semibold">{v}</span>
        </div>
      ))}
    </div>
  );
}

const LOOP = ["Lead posts a task", "Jaybird ranks the best fits", "Personal ask", "Member says yes", "Lead approves", "XP, badges, honors, sponsors"];

function Loop({ active }: { active: boolean }) {
  const reduce = useReducedMotion();
  const R = 38;
  return (
    <div className="relative aspect-square w-full max-w-[min(90vw,560px)]">
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
        <circle cx="50" cy="50" r={R} fill="none" stroke="var(--border)" strokeWidth="0.8" />
        <motion.circle cx="50" cy="50" r={R} fill="none" stroke="var(--jci-blue)" strokeWidth="1.2" strokeDasharray="6 4"
          animate={reduce || !active ? {} : { strokeDashoffset: [0, -40] }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} />
        {!reduce && (
          <motion.g animate={active ? { rotate: 360 } : {}} transition={{ duration: 9, repeat: Infinity, ease: "linear" }} style={{ originX: "50px", originY: "50px" }}>
            <path d={`M50 ${50 - R - 2.5} l4 2.5 l-4 2.5 z`} fill="var(--jci-navy)" />
          </motion.g>
        )}
      </svg>
      {LOOP.map((l, n) => {
        const a = (n / LOOP.length) * Math.PI * 2 - Math.PI / 2;
        return (
          <motion.div key={l} className="absolute flex w-[34%] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 text-center"
            style={{ left: `${50 + Math.cos(a) * R}%`, top: `${50 + Math.sin(a) * R}%` }}
            initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: n * 0.15 }}>
            <span className={cn("flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold lg:h-12 lg:w-12", n === 5 ? "bg-jci-navy text-jci-white" : "bg-jci-blue text-jci-white")}>{n + 1}</span>
            <span className="rounded-lg bg-jci-white/90 px-1 text-xs leading-tight lg:text-base">{l}</span>
          </motion.div>
        );
      })}
    </div>
  );
}

function Closing() {
  const impact = useQuery({ queryKey: ["tasks", "chapter_impact"], queryFn: getChapterImpact });
  const pool = useQuery({ queryKey: ["sponsor_pledges", "pool"], queryFn: getSeasonPrizePool });
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const rows = impact.data ?? [];
  const tasks = useCountUp(rows.reduce((s, r) => s + r.tasks_done, 0));
  const hours = useCountUp(Math.round(rows.reduce((s, r) => s + Number(r.hours), 0)));
  const members = useCountUp(rows.reduce((s, r) => s + r.active_members, 0));
  const eur = useCountUp(Math.round(Number(pool.data?.find((p) => p.season === new Date().getFullYear())?.total_eur ?? 0)));
  return (
    <div className="flex flex-col items-center gap-10 text-center lg:flex-row lg:justify-between lg:text-left">
      <div className="flex flex-col gap-8">
        <h2 className="text-title">Already live</h2>
        <div className="grid grid-cols-2 gap-6">
          {[["tasks done", tasks], ["hours given", hours], ["active members", members], ["EUR prize pool", eur]].map(([l, v]) => (
            <div key={l as string}><p className="text-title font-semibold">{v}</p><p className="opacity-90">{l}</p></div>
          ))}
        </div>
      </div>
      <div className="flex flex-col items-center gap-4">
        <p className="text-subtitle">Try it now</p>
        <div className="rounded-xl bg-jci-white p-4">{origin ? <QRCodeSVG value={origin} size={200} fgColor="#130F2D" /> : <div className="h-[200px] w-[200px]" />}</div>
        <p className="text-sm opacity-90">{origin.replace(/^https?:\/\//, "")}</p>
      </div>
    </div>
  );
}
