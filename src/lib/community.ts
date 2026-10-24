import { queryOptions } from "@tanstack/react-query";
import * as db from "./db";
import type { BadgeTier } from "./db";

export const cq = {
  projects: () => queryOptions({ queryKey: ["projects", "community"], queryFn: db.getCommunityProjects }),
  projectStats: () => queryOptions({ queryKey: ["project_stats"], queryFn: db.getProjectCommunityStats }),
  projectMembers: () => queryOptions({ queryKey: ["project_members"], queryFn: db.getProjectMembers }),
  photos: (id: number) => queryOptions({ queryKey: ["project_photos", id], queryFn: () => db.getProjectPhotos(id) }),
  badges: () => queryOptions({ queryKey: ["badges", "community"], queryFn: db.getCommunityBadges, staleTime: Infinity }),
  memberBadges: () => queryOptions({ queryKey: ["member_badges", "all"], queryFn: db.getMemberBadges }),
  follows: () => queryOptions({ queryKey: ["follows"], queryFn: db.getFollows }),
  supporters: () => queryOptions({ queryKey: ["supporters"], queryFn: db.getSupporters }),
  interests: (me: number) => queryOptions({ queryKey: ["supporter_interests", me], queryFn: () => db.getSupporterInterestsFor(me) }),
  news: (chapter: number) => queryOptions({ queryKey: ["news", chapter], queryFn: () => db.getNews(chapter) }),
  kudos: (ids: number[]) => queryOptions({ queryKey: ["kudos", ids], queryFn: () => db.getKudosFor(ids) }),
  notifications: (me: number) => queryOptions({ queryKey: ["notifications", me], queryFn: () => db.getNotifications(me) }),
  unread: (me: number) => queryOptions({ queryKey: ["notifications", me, "unread"], queryFn: () => db.getUnreadNotificationCount(me) }),
  peerBadges: () => queryOptions({ queryKey: ["peer_badges"], queryFn: db.getPeerBadges }),
  allowance: (me: number) => queryOptions({ queryKey: ["allowance", me], queryFn: () => db.peerBadgeAllowance(me) }),
  leaderboard: (season: number) => queryOptions({ queryKey: ["leaderboard", season], queryFn: () => db.getLeaderboard(season) }),
  recommendations: () => queryOptions({ queryKey: ["recommendations"], queryFn: db.getRecommendations }),
  buddies: () => queryOptions({ queryKey: ["buddies"], queryFn: db.getBuddies }),
  mentors: () => queryOptions({ queryKey: ["mentors"], queryFn: db.getMentors }),
};

export const TIERS: BadgeTier[] = ["bronze", "silver", "gold", "platinum"];
export const TIER_LABEL: Record<BadgeTier, string> = { bronze: "Bronze", silver: "Silver", gold: "Gold", platinum: "Platinum" };
/** Tier colors are data-driven decoration, so applied as inline style. */
export const TIER_COLOR: Record<BadgeTier, string> = { bronze: "#C08A5A", silver: "#B8C0CC", gold: "#EFC40F", platinum: "#57BCBC" };
export const TIER_RULE: Record<BadgeTier, string> = {
  bronze: "Reach level 3",
  silver: "Reach level 6, or lead a closed project",
  gold: "Board members and presidents",
  platinum: "Senators and national board",
};

/** Lowercase, strip diacritics: "Ozoliņš" matches "ozolins". */
export function fold(s: string | null | undefined) {
  return (s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/** Only same-origin app paths (optionally with a #section) are followed from notification payloads. */
export function safePath(p: unknown): string | null {
  return typeof p === "string" && p.length <= 200 && /^\/(?!\/)[\w\-/.]*(#[A-Za-z][\w-]*)?$/.test(p) && !p.includes("..") ? p : null;
}

export const isDemoText = (s: string | null | undefined) => !!s && /\[demo\]|\(demo|demo /i.test(s);

/**
 * Scrolls to and focuses a section that may not be in the DOM yet (the route is
 * still rendering it). Polls with a MutationObserver plus a slow fallback timer
 * until the element appears, so we never rely on a fixed delay. Returns a cancel
 * function; the bounded timeout stops watching a section that never renders.
 */
export function focusSection(hash: string, timeoutMs = 5000): () => void {
  let done = false;
  const observer = new MutationObserver(() => { if (document.getElementById(hash)) stop(); });
  let interval = 0;
  let timer = 0;
  const stop = () => {
    if (done) return;
    done = true;
    observer.disconnect();
    clearInterval(interval);
    clearTimeout(timer);
    const el = document.getElementById(hash);
    if (!el) return;
    el.scrollIntoView({ block: "start" });
    el.focus({ preventScroll: true });
  };
  if (document.getElementById(hash)) { stop(); return () => {}; }
  observer.observe(document.body, { childList: true, subtree: true });
  interval = window.setInterval(() => { if (document.getElementById(hash)) stop(); }, 50);
  timer = window.setTimeout(stop, timeoutMs);
  return () => {
    done = true;
    observer.disconnect();
    clearInterval(interval);
    clearTimeout(timer);
  };
}
