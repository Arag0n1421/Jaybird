import { useEffect, useRef, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { useMe } from "@/hooks/use-me";
import { useLang } from "@/hooks/use-lang";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { toast } from "@/components/ui/toast";
import { cq, focusSection, safePath } from "@/lib/community";
import { markAllNotificationsRead, markNotificationRead, type AppNotification, type Member } from "@/lib/db";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const str = (v: unknown) => (typeof v === "string" ? v : "");
const num = (v: unknown) => (typeof v === "number" ? v : typeof v === "string" && /^\d+$/.test(v) ? Number(v) : null);

type Payload = Partial<Record<"task_id" | "asked_by" | "match_pct" | "title" | "creator_name" | "created_by" | "xp" | "badge_name" | "giver_id" | "note" | "text" | "path", unknown>>;

/** Turns a notification into readable copy and a safe in-app destination. Unknown types fall back gracefully. */
export function describe(n: AppNotification, members: Member[]): { title: string; text: string; path: string | null } {
  const p = (n.payload ?? {}) as Payload;
  const who = (id: unknown) => members.find((m) => m.id === num(id))?.name ?? "Someone";
  const task = num(p.task_id);
  const taskPath = task ? `/task/${task}` : null;
  switch (n.type) {
    case "personal_ask":
      return { title: `${who(p.asked_by)} asked you personally`, text: p.match_pct != null ? `${num(p.match_pct) ?? ""}% match` : "Take a look when you can.", path: taskPath };
    case "task_posted":
      return { title: `New task: ${str(p.title) || "untitled"}`, text: `Posted by ${str(p.creator_name) || who(p.created_by)}`, path: taskPath };
    case "task_approved":
      return { title: `Approved: ${str(p.title) || "your task"}`, text: num(p.xp) != null ? `+${num(p.xp)} XP saved` : "Nice work.", path: taskPath };
    case "badge_earned":
      return { title: `You earned ${str(p.badge_name) || "a badge"}`, text: "See it on your profile.", path: "/me#badges" };
    case "peer_badge_received":
      return { title: `${who(p.giver_id)} gave you ${str(p.badge_name) || "a badge"}`, text: str(p.note) || (num(p.xp) != null ? `+${num(p.xp)} XP` : ""), path: "/me#recognition" };
    case "demo":
      return { title: str(p.title) || "Sample notification", text: str(p.text), path: safePath(p.path) };
    default:
      return { title: "Something new happened", text: "Open Jaybird to see what changed.", path: null };
  }
}

export function NotificationBell() {
  const { meId, members } = useMe();
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const router = useRouter();
  const list = useQuery({ ...cq.notifications(meId ?? 0), enabled: !!meId });
  const unreadQ = useQuery({ ...cq.unread(meId ?? 0), enabled: !!meId });
  const unread = unreadQ.data ?? (list.data ?? []).filter((n) => !n.read_at).length;
  const invalidate = () => void qc.invalidateQueries({ queryKey: ["notifications", meId] });

  const readOne = useMutation({
    mutationFn: (id: number) => markNotificationRead(id, meId!),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error("Couldn't mark it read", e.message),
  });
  const readAll = useMutation({
    mutationFn: () => markAllNotificationsRead(meId!),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error("Couldn't mark all read", e.message),
  });

  const stopWatching = useRef<null | (() => void)>(null);
  useEffect(() => () => stopWatching.current?.(), []);

  function openItem(n: AppNotification) {
    const d = describe(n, members);
    if (!n.read_at) readOne.mutate(n.id);
    if (d.path) {
      setOpen(false);
      router.history.push(d.path);
      const hash = d.path.split("#")[1];
      stopWatching.current?.();
      stopWatching.current = hash ? focusSection(hash) : null;
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} aria-label={`${t("notifications")}${unread ? `, ${unread} unread` : ""}`} className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-surface">
        <Bell className="h-5 w-5" strokeWidth={1.75} />
        {unread > 0 && <span className="absolute right-1 top-1 min-w-5 rounded-full bg-coral px-1 text-center text-[11px] font-bold tabular-nums text-jci-black">{unread > 9 ? "9+" : unread}</span>}
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title={t("notifications")} side>
        {list.isLoading ? <div className="h-24 animate-pulse rounded-xl bg-surface" /> : list.error ? (
          <p className="text-muted-foreground">Couldn't load your notifications. <button className="min-h-11 underline" onClick={() => void list.refetch()}>Try again</button></p>
        ) : (list.data ?? []).length === 0 ? <p className="text-muted-foreground">All quiet. New asks and badges will show up here.</p> : (
          <>
            {unread > 0 && (
              <button disabled={readAll.isPending} onClick={() => readAll.mutate()} className="mb-2 min-h-11 text-sm font-semibold text-jci-blue underline">
                {readAll.isPending ? "Marking…" : "Mark all as read"}
              </button>
            )}
            <ul className="flex flex-col divide-y divide-border">
              {list.data!.map((n) => {
                const d = describe(n, members);
                return (
                  <li key={n.id}>
                    <button onClick={() => openItem(n)} className={cn("flex min-h-14 w-full items-start gap-3 py-3 text-left", !d.path && "cursor-default")}>
                      <span className={cn("mt-2 h-2 w-2 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-jci-blue")} aria-label={n.read_at ? undefined : "Unread"} />
                      <span className="min-w-0 flex-1">
                        <span className={cn("block", !n.read_at && "font-bold")}>{d.title}</span>
                        {d.text && <span className="block text-sm text-muted-foreground">{d.text}</span>}
                        <span className="block text-xs text-muted-foreground">{relativeTime(n.created_at)}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </BottomSheet>
    </>
  );
}
