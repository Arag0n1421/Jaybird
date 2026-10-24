import { queryOptions } from "@tanstack/react-query";
import * as db from "./db";

// Shared query options. RealtimeSync invalidates these on live changes.
export const q = {
  members: () => queryOptions({ queryKey: ["members"], queryFn: db.getMembers }),
  stats: () => queryOptions({ queryKey: ["member_stats"], queryFn: db.getMemberStats }),
  projects: () => queryOptions({ queryKey: ["projects"], queryFn: db.getProjects }),
  tasks: () => queryOptions({ queryKey: ["tasks"], queryFn: db.getTasks }),
  task: (id: number) => queryOptions({ queryKey: ["tasks", id], queryFn: () => db.getTask(id) }),
  myAsks: (me: number) => queryOptions({ queryKey: ["asks", "member", me], queryFn: () => db.getAsksForMember(me) }),
  taskFeedback: (id: number) => queryOptions({ queryKey: ["feedback", id], queryFn: () => db.getFeedbackForTask(id) }),
  myXp: (me: number) => queryOptions({ queryKey: ["xp_ledger", me], queryFn: () => db.getXpForMember(me) }),
  myBadges: (me: number) => queryOptions({ queryKey: ["member_badges", me], queryFn: () => db.getBadgesForMember(me) }),
  badges: () => queryOptions({ queryKey: ["badges"], queryFn: db.getBadges, staleTime: Infinity }),
  suggest: (me: number, minutes: number | null) =>
    queryOptions({ queryKey: ["suggest", me, minutes], queryFn: () => db.suggestTasks(me, minutes, 3) }),
};

export const TIME_CHIPS = [
  { tag: "15m", label: "15 min", minutes: 15 },
  { tag: "1h", label: "1 hour", minutes: 60 },
  { tag: "half_day", label: "Half day", minutes: 240 },
] as const;

export function firstName(name: string | undefined | null) {
  return (name ?? "").split(" ")[0] ?? "";
}
