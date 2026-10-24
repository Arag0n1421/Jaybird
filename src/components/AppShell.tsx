import { useEffect, useState, type ReactNode } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Home, ListChecks, Compass, Trophy, User, Megaphone, FolderKanban, Users, Share2, MoreHorizontal, HeartHandshake, Award, type LucideIcon } from "lucide-react";
import { ActingAsPicker } from "./ActingAsPicker";
import { NotificationBell } from "./NotificationBell";
import { useMe } from "@/hooks/use-me";
import { useIsLead } from "@/hooks/use-is-lead";
import { useLang } from "@/hooks/use-lang";
import { cn } from "@/lib/utils";

type To = "/" | "/my" | "/browse" | "/leaderboard" | "/me" | "/lead" | "/projects" | "/people" | "/network" | "/sponsors" | "/honors";
type NavItem = { to: To; key: string; icon: LucideIcon };
const I = {
  home: { to: "/", key: "home", icon: Home },
  projects: { to: "/projects", key: "projects", icon: FolderKanban },
  my: { to: "/my", key: "my", icon: ListChecks },
  browse: { to: "/browse", key: "browse", icon: Compass },
  people: { to: "/people", key: "people", icon: Users },
  ranks: { to: "/leaderboard", key: "ranks", icon: Trophy },
  network: { to: "/network", key: "network", icon: Share2 },
  me: { to: "/me", key: "me", icon: User },
  lead: { to: "/lead", key: "lead", icon: Megaphone },
  sponsors: { to: "/sponsors", key: "sponsors", icon: HeartHandshake },
  honors: { to: "/honors", key: "honors", icon: Award },
} satisfies Record<string, NavItem>;
const DESKTOP: NavItem[] = [I.home, I.projects, I.my, I.browse, I.people, I.ranks, I.network, I.me];
const SECONDARY: NavItem[] = [I.sponsors, I.honors];
const MOBILE: NavItem[] = [I.home, I.my, I.browse, I.ranks];
const MORE: NavItem[] = [I.me, I.projects, I.people, I.network];

function LangSwitch() {
  const { lang, setLang, t } = useLang();
  return (
    <div role="group" aria-label={t("language")} className="flex gap-1">
      {(["en", "lv"] as const).map((l) => (
        <button key={l} aria-pressed={lang === l} onClick={() => setLang(l)}
          className={cn("min-h-11 min-w-11 rounded-full border px-3 text-sm font-bold uppercase", lang === l ? "border-jci-blue bg-jci-blue text-jci-white" : "border-border hover:border-jci-blue")}>
          {l}
        </button>
      ))}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const isLead = useIsLead();
  const { t } = useLang();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { me } = useMe();
  const navigate = useNavigate();
  const [more, setMore] = useState(false);

  useEffect(() => {
    if (me && !me.onboarded && pathname !== "/onboarding") void navigate({ to: "/onboarding" });
  }, [me, pathname, navigate]);
  useEffect(() => setMore(false), [pathname]);

  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`));
  const desktop = isLead ? [...DESKTOP, I.lead] : DESKTOP;
  const moreItems = [...MORE, ...(isLead ? [I.lead] : []), ...SECONDARY];
  const moreActive = moreItems.some((i) => isActive(i.to));

  const sideLink = ({ to, key, icon: Icon }: NavItem) => (
    <Link key={to} to={to}
      className={cn("flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 transition-colors", isActive(to) ? "bg-jci-blue-25 font-bold text-jci-black" : "text-jci-black hover:bg-surface")}>
      <Icon className={cn("h-5 w-5", isActive(to) && "text-jci-blue")} strokeWidth={1.75} />
      {t(key)}
    </Link>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-jci-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 lg:px-6">
          <Link to="/" className="shrink-0 py-2 pr-3" aria-label="Jaybird home">
            <img src="/jci-logo.png" alt="JCI" className="h-8 w-auto" />
          </Link>
          <div className="flex min-w-0 items-center gap-1">
            <NotificationBell />
            <ActingAsPicker />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl">
        <nav aria-label="Main" className="sticky top-16 hidden h-[calc(100vh-4rem)] w-56 shrink-0 flex-col gap-1 overflow-y-auto border-r border-border p-4 lg:flex">
          {desktop.map(sideLink)}
          <div className="my-2 border-t border-border" />
          {SECONDARY.map(sideLink)}
          <div className="mt-auto pt-4"><LangSwitch /></div>
        </nav>
        <main className="min-w-0 flex-1 px-4 pb-28 pt-6 lg:px-8 lg:pb-12">
          {children}
          <XpFooter />
        </main>
      </div>

      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-jci-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        <ul className="flex">
          {MOBILE.map(({ to, key, icon: Icon }) => (
            <li key={to} className="flex-1">
              <Link to={to} className={cn("flex min-h-14 flex-col items-center justify-center gap-0.5 py-2 text-[11px]", isActive(to) ? "font-bold text-jci-black" : "text-muted-foreground")}>
                <Icon className={cn("h-5 w-5", isActive(to) && "text-jci-blue")} strokeWidth={1.75} />
                {t(key)}
              </Link>
            </li>
          ))}
          <li className="flex-1">
            <button onClick={() => setMore(true)} aria-haspopup="dialog" className={cn("flex min-h-14 w-full flex-col items-center justify-center gap-0.5 py-2 text-[11px]", moreActive ? "font-bold text-jci-black" : "text-muted-foreground")}>
              <MoreHorizontal className={cn("h-5 w-5", moreActive && "text-jci-blue")} strokeWidth={1.75} />
              {t("more")}
            </button>
          </li>
        </ul>
      </nav>
      <BottomSheet open={more} onClose={() => setMore(false)} title={t("more")}>
        <div className="flex flex-col gap-1">{moreItems.map(sideLink)}</div>
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
          <span className="text-sm font-bold">{t("language")}</span>
          <LangSwitch />
        </div>
      </BottomSheet>
    </div>
  );
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-title">{title}</h1>
      {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

const XP_RULES: [string, string][] = [
  ["Task size", "15 min = 30 XP, 1 hour = 60 XP, Half day = 120 XP."],
  ["Spark x2", "Social tasks pay x2 when your chapter had no social task done in 14 days."],
  ["Gap bonus x1.5", "When your chapter had none of that category done in 30 days. Spark wins over gap; they never stack."],
  ["First step", "+10 XP for your very first task."],
  ["Weekly streak", "+10 XP when you keep your streak going."],
  ["Reviewer & delegator", "+5 XP each for reviewing or delegating a task."],
  ["Levels", "Every 200 XP is one level up."],
];

function XpFooter() {
  const [open, setOpen] = useState(false);
  return (
    <footer className="mt-12 flex justify-center border-t border-border pt-4">
      <button onClick={() => setOpen(true)} className="min-h-11 px-3 text-sm text-jci-blue hover:underline">
        How XP works
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title="How XP works">
        <ul className="space-y-3">
          {XP_RULES.map(([k, v]) => (
            <li key={k}>
              <p className="font-semibold">{k}</p>
              <p className="text-sm text-muted-foreground">{v}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-muted-foreground">All XP is added automatically once a lead approves your work.</p>
      </BottomSheet>
    </footer>
  );
}
