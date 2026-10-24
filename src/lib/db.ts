import { supabase } from "./supabase";

/* ---------- Enums ---------- */
export type Role = "member" | "board" | "president";
export type TimeTag = "15m" | "1h" | "half_day";
export type TaskStatus = "open" | "asked" | "in_progress" | "review" | "done" | "cancelled";
export type AskStatus = "pending" | "accepted" | "declined";
export type DeclineReason = "not_now" | "not_my_thing" | "too_long";
export type FeedbackKind = "review" | "changes_requested" | "task_clarity";
export type XpReason =
  | "peer_badge_received" | "peer_badge_given"
  | "task" | "spark_bonus" | "gap_bonus" | "first_step" | "streak_bonus" | "role_bonus"
  | "reviewer" | "delegator" | "recruit" | "sponsorship";
export type PledgeTarget = "season_pool" | "chapter" | "category";

/* ---------- Tables ---------- */
export interface Category { key: string; label: string; blurb: string | null; sort?: number }
export interface CatalogItem { key: string; label: string }
export interface Chapter { id: number; name: string; country: string }
export interface Member {
  id: number; name: string; chapter_id: number; role: Role; is_senator: boolean; is_new: boolean;
  skills: string[]; interests: string[]; liked_categories: string[];
  available_time: TimeTag | null; weekly_minutes: number | null; calendar_ics_url: string | null;
  onboarded: boolean; avatar_color: string; linkedin_url?: string | null; is_national_board?: boolean;
}
export interface Recommendation {
  id: number; member_id: number; author_name: string; author_title: string | null;
  text: string; source: "linkedin" | "jam"; created_at: string;
}
export interface Project { id: number; name: string; chapter_id: number; lead_id: number | null; description: string | null }
export interface Task {
  id: number; project_id: number | null; chapter_id: number; title: string; description: string | null;
  category: string; tags: string[]; time_tag: TimeTag; est_minutes: number | null; xp: number;
  deadline: string | null; status: TaskStatus; created_by: number | null; assignee_id: number | null;
  verifier_id: number | null; submission_note: string | null; source: "manual" | "whatsapp";
  created_at: string; claimed_at: string | null; submitted_at: string | null; completed_at: string | null;
}
export interface Ask {
  id: number; task_id: number; member_id: number; asked_by: number | null; status: AskStatus;
  reason: DeclineReason | null; match_pct: number | null; why: string[]; auto: boolean;
  asked_at: string; answered_at: string | null; nudged_at: string | null;
}
export interface Feedback {
  id: number; task_id: number; from_member: number; to_member: number; kind: FeedbackKind;
  rating: number | null; comment: string | null; created_at: string;
}
export interface XpEntry { id: number; member_id: number; task_id: number | null; xp: number; reason: XpReason; season: number; created_at: string }
export interface Badge { id: number; code: string; name: string; description: string | null }
export interface MemberBadge { member_id: number; badge_id: number; earned_at: string }
export interface Buddy { new_member_id: number; buddy_id: number }
export interface Mentor { senator_id: number; member_id: number }
export interface Sponsor { id: number; name: string; contact_name: string | null; contact_email: string | null; website: string | null; logo_url: string | null }
export interface SponsorPledge {
  id: number; sponsor_id: number; target_type: PledgeTarget; chapter_id: number | null; category: string | null;
  amount_eur: number; reward_note: string | null; season: number; status: string;
}

/* ---------- Views ---------- */
export interface MemberStats {
  member_id: number; name: string; avatar_color: string; chapter_id: number; chapter_name: string; country: string;
  role: Role; is_senator: boolean; is_new: boolean; xp: number; season_xp: number; tasks_done: number;
  level: number; xp_in_level: number; xp_per_level: number; streak_weeks: number;
  chapter_rank: number; national_rank: number; global_rank: number;
}
export interface LeaderboardRow {
  member_id: number; name: string; avatar_color: string; chapter_id: number; chapter_name: string; country: string;
  is_senator: boolean; season: number; xp: number; tasks_done: number; chapter_rank: number; national_rank: number; global_rank: number;
}
export interface ProjectLeaderboardRow { project_id: number; member_id: number; name: string; avatar_color: string; xp: number; project_rank: number }
export interface TaskInsight {
  task_id: number; created_by: number | null; chapter_id: number; project_id: number | null; title: string; status: TaskStatus;
  days_open: number; asked_count: number; pending_count: number; declined_count: number; too_long_count: number;
  not_my_thing_count: number; not_now_count: number; no_count: number; yes_count: number; clarity: number | null;
}
export interface ChapterImpact { chapter_id: number; name: string; country: string; tasks_done: number; hours: number; active_members: number; open_tasks: number; members: number }
export interface SeasonPrizePool { season: number; total_eur: number; sponsors: number }
export interface CategoryChampion { category: string; season: number; member_id: number; name: string; avatar_color: string; tasks_done: number }

/* ---------- RPC results ---------- */
export interface SuggestedTask {
  task_id: number; ask_id: number | null; title: string; description: string | null; category: string; tags: string[];
  time_tag: TimeTag; est_minutes: number | null; xp: number; deadline: string | null; project_name: string | null;
  chapter_name: string | null; match_pct: number; reasons: string[]; is_ask: boolean; asked_by_name: string | null; gap: boolean;
}
export interface MatchCandidate {
  member_id: number; name: string; avatar_color: string; chapter_name: string; role: Role; is_new: boolean;
  match_pct: number; reasons: string[]; pending_asks: number;
}
export interface ParsedTask { title: string; description: string; category: string; tags: string[]; time_tag: TimeTag; xp: number; deadline: string | null }
export interface CalendarFree { free_minutes_total: number; longest_free_block_minutes: number; next_free_block: { start: string; end: string } | null }

/* ---------- Errors ---------- */
export class DbError extends Error {
  constructor(action: string, detail?: string) {
    super(detail ? `Couldn't ${action}: ${detail}` : `Couldn't ${action}. Please try again.`);
    this.name = "DbError";
  }
}
function unwrap<T>(action: string, res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new DbError(action, res.error.message);
  return res.data as T;
}
async function list<T>(action: string, table: string, order?: string, ascending = true): Promise<T[]> {
  let q = supabase.from(table).select("*");
  if (order) q = q.order(order, { ascending });
  return unwrap<T[]>(action, await q) ?? [];
}

/* ---------- Getters ---------- */
export const getCategories = () => list<Category>("load categories", "categories", "sort");
export const getSkills = () => list<CatalogItem>("load skills", "skills_catalog", "label");
export const getInterests = () => list<CatalogItem>("load interests", "interests_catalog", "label");
export const getChapters = () => list<Chapter>("load chapters", "chapters", "name");
export const getMembers = () => list<Member>("load members", "members", "name");
export async function getMember(id: number) {
  return unwrap<Member | null>("load this member", await supabase.from("members").select("*").eq("id", id).maybeSingle());
}
export const getProjects = () => list<Project>("load projects", "projects", "name");
export const getTasks = () => list<Task>("load tasks", "tasks", "created_at", false);
export async function getTask(id: number) {
  return unwrap<Task | null>("load this task", await supabase.from("tasks").select("*").eq("id", id).maybeSingle());
}
export async function getTasksByAssignee(memberId: number) {
  return unwrap<Task[]>("load your tasks", await supabase.from("tasks").select("*").eq("assignee_id", memberId).order("created_at", { ascending: false }));
}
export const getAsks = () => list<Ask>("load asks", "asks", "asked_at", false);
export async function getAsksForMember(memberId: number) {
  return unwrap<Ask[]>("load your asks", await supabase.from("asks").select("*").eq("member_id", memberId).order("asked_at", { ascending: false }));
}
export async function getAsksForTask(taskId: number) {
  return unwrap<Ask[]>("load asks for this task", await supabase.from("asks").select("*").eq("task_id", taskId).order("asked_at", { ascending: false }));
}
export const getFeedback = () => list<Feedback>("load feedback", "feedback", "created_at", false);
export const getRecommendations = () => list<Recommendation>("load recommendations", "recommendations", "created_at", false);
export async function getFeedbackForTask(taskId: number) {
  return unwrap<Feedback[]>("load feedback", await supabase.from("feedback").select("*").eq("task_id", taskId).order("created_at", { ascending: false }));
}
export const getXpLedger = () => list<XpEntry>("load XP history", "xp_ledger", "created_at", false);
export async function getXpForMember(memberId: number) {
  return unwrap<XpEntry[]>("load your XP history", await supabase.from("xp_ledger").select("*").eq("member_id", memberId).order("created_at", { ascending: false }));
}
export const getBadges = () => list<Badge>("load badges", "badges", "id");
export const getMemberBadges = () => list<MemberBadge>("load earned badges", "member_badges", "earned_at", false);
export async function getBadgesForMember(memberId: number) {
  return unwrap<MemberBadge[]>("load your badges", await supabase.from("member_badges").select("*").eq("member_id", memberId));
}
export const getBuddies = () => list<Buddy>("load buddies", "buddies");
export const getMentors = () => list<Mentor>("load mentors", "mentors");
export const getSponsors = () => list<Sponsor>("load sponsors", "sponsors", "name");
export const getPledges = () => list<SponsorPledge>("load pledges", "sponsor_pledges", "amount_eur", false);

/* Views */
export const getMemberStats = () => list<MemberStats>("load member stats", "member_stats", "name");
export async function getMemberStatsById(id: number) {
  return unwrap<MemberStats | null>("load your stats", await supabase.from("member_stats").select("*").eq("member_id", id).maybeSingle());
}
export async function getLeaderboard(season = 0) {
  return unwrap<LeaderboardRow[]>("load the leaderboard", await supabase.from("leaderboard").select("*").eq("season", season).order("xp", { ascending: false }));
}
export async function getProjectLeaderboard(projectId?: number) {
  let q = supabase.from("project_leaderboard").select("*").order("project_rank");
  if (projectId) q = q.eq("project_id", projectId);
  return unwrap<ProjectLeaderboardRow[]>("load the project leaderboard", await q);
}
export const getTaskInsights = () => list<TaskInsight>("load task insights", "task_insights", "days_open", false);
export const getChapterImpact = () => list<ChapterImpact>("load chapter impact", "chapter_impact", "tasks_done", false);
export const getSeasonPrizePool = () => list<SeasonPrizePool>("load the prize pool", "season_prize_pool", "season", false);
export const getCategoryChampions = () => list<CategoryChampion>("load category champions", "category_champions", "tasks_done", false);

/* ---------- Allowed direct writes ---------- */
export type NewTask = Pick<Task, "title" | "category" | "time_tag" | "xp" | "chapter_id"> &
  Partial<Pick<Task, "project_id" | "description" | "tags" | "est_minutes" | "deadline" | "created_by" | "verifier_id" | "status" | "source">>;
export async function insertTask(task: NewTask) {
  return unwrap<Task>("create the task", await supabase.from("tasks").insert(task).select().single());
}
export async function updateOpenTask(id: number, patch: Partial<Pick<Task, "title" | "description" | "xp" | "deadline" | "time_tag">>) {
  return unwrap<Task>("update the task", await supabase.from("tasks").update(patch).eq("id", id).eq("status", "open").select().single());
}
export async function cancelTask(id: number) {
  return unwrap<Task>("cancel the task", await supabase.from("tasks").update({ status: "cancelled" }).eq("id", id).select().single());
}
export async function insertMember(m: Partial<Member> & Pick<Member, "name" | "chapter_id">) {
  return unwrap<Member>("create your profile", await supabase.from("members").insert(m).select().single());
}
export async function updateMember(id: number, patch: Partial<Omit<Member, "id">>) {
  return unwrap<Member>("save your profile", await supabase.from("members").update(patch).eq("id", id).select().single());
}
export async function insertSponsor(s: Omit<Sponsor, "id">) {
  return unwrap<Sponsor>("add the sponsor", await supabase.from("sponsors").insert(s).select().single());
}
export async function insertPledge(p: Omit<SponsorPledge, "id">) {
  return unwrap<SponsorPledge>("add the pledge", await supabase.from("sponsor_pledges").insert(p).select().single());
}
export async function markAskNudged(askId: number) {
  return unwrap<Ask>("send the nudge", await supabase.from("asks").update({ nudged_at: new Date().toISOString() }).eq("id", askId).select().single());
}

/* ---------- RPCs ---------- */
async function rpc<T>(action: string, fn: string, args: Record<string, unknown>): Promise<T> {
  return unwrap<T>(action, await supabase.rpc(fn, args));
}
export const suggestTasks = (member: number, minutes: number | null = null, limit = 3) =>
  rpc<SuggestedTask[]>("find tasks for you", "suggest_tasks", { p_member: member, p_minutes: minutes, p_limit: limit });
export const rankMatches = (task: number, limit = 5) =>
  rpc<MatchCandidate[]>("rank the best matches", "rank_matches", { p_task: task, p_limit: limit });
export const createAsk = (task: number, member: number, askedBy: number) =>
  rpc<number>("send the ask", "create_ask", { p_task: task, p_member: member, p_asked_by: askedBy });
export const askTopMatches = (task: number, askedBy: number, count = 3) =>
  rpc<number>("ask the top matches", "ask_top_matches", { p_task: task, p_asked_by: askedBy, p_count: count });
export const answerAsk = (ask: number, status: "accepted" | "declined", reason: DeclineReason | null = null) =>
  rpc<boolean>("save your answer", "answer_ask", { p_ask: ask, p_status: status, p_reason: reason });
export const respondToSuggestion = (member: number, task: number, response: "yes" | "no", reason: DeclineReason | null = null) =>
  rpc<boolean>("save your answer", "respond_to_suggestion", { p_member: member, p_task: task, p_response: response, p_reason: reason });
export const submitTask = (task: number, member: number, note: string, clarity: number | null = null) =>
  rpc<boolean>("submit the task", "submit_task", { p_task: task, p_member: member, p_note: note, p_clarity: clarity });
export const approveTask = (task: number, reviewer: number, rating: number, comment: string | null = null) =>
  rpc<boolean>("approve the task", "approve_task", { p_task: task, p_reviewer: reviewer, p_rating: rating, p_comment: comment });
export const requestChanges = (task: number, reviewer: number, comment: string) =>
  rpc<boolean>("request changes", "request_changes", { p_task: task, p_reviewer: reviewer, p_comment: comment });
export const canReview = (member: number, task: number) =>
  rpc<boolean>("check review rights", "can_review", { p_member: member, p_task: task });

/* ---------- Edge functions ---------- */
export async function parseTask(text: string) {
  const { data, error } = await supabase.functions.invoke("parse-task", { body: { text } });
  if (error) throw new DbError("read that message", error.message);
  return data as { tasks: ParsedTask[]; engine: string };
}
export async function calendarFree(icsUrl: string, windowStart: string, windowEnd: string) {
  const { data, error } = await supabase.functions.invoke("calendar-free", {
    body: { ics_url: icsUrl, window_start: windowStart, window_end: windowEnd },
  });
  if (error) throw new DbError("read your calendar", error.message);
  return data as CalendarFree;
}

/* =====================================================================
   Community contract (follows, projects, supporters, news, notifications,
   peer badges). Reads go through the client; writes only via RPCs.
   ===================================================================== */
export type BadgeTier = "bronze" | "silver" | "gold" | "platinum";
export type ProjectStatus = "active" | "closed";
export type SupporterType = "sponsor" | "supporting_member" | "partner";
export type NewsType = "task_posted" | "task_approved" | "earned_badge" | "peer_badge" | "demo";

export interface CommunityProject extends Project { cover_url: string | null; status: ProjectStatus; created_at?: string }
export interface CommunityBadge extends Badge { icon: string | null; tier: BadgeTier | null; kind: "earned" | "peer" }
export interface MemberFlags { is_national_board?: boolean }
export interface Follow { follower_id: number; followee_id: number; created_at: string }
export interface ProjectMember { project_id: number; member_id: number; joined_at: string }
export interface ProjectPhoto { id: number; project_id: number; url: string; caption: string | null; created_at: string }
export interface Supporter {
  id: number; name: string; type: SupporterType; logo_url: string | null; ask: string | null; reward: string | null;
  chapter_id: number | null; url: string | null; created_at: string;
}
export interface SupporterInterest { supporter_id: number; member_id: number; created_at: string }
export interface NewsItem {
  id: number; chapter_id: number; type: NewsType | string; member_id: number | null; project_id: number | null;
  text: string; image_urls: string[]; event_key: string; created_at: string;
}
export interface Kudos { news_id: number; member_id: number; created_at: string }
export interface AppNotification {
  id: number; member_id: number; type: string; payload: Record<string, unknown> | null; event_key: string;
  read_at: string | null; created_at: string;
}
export interface PeerBadge {
  id: number; giver_id: number; receiver_id: number; badge_id: number; note: string; tier: BadgeTier; season: number; created_at: string;
}
export interface ProjectCommunityStats {
  project_id: number; participant_ids: number[]; participant_count: number; task_count: number; tasks_done: number;
  open_tasks: number; progress_pct: number; categories: string[]; joined_7d: number; completed_7d: number; posted_7d: number;
  activity_7d: number; last_activity_at: string | null; total_xp: number; photo_count: number;
}
export interface PeerAllowance { tier: BadgeTier; eligible: boolean; quota: number; used: number; remaining: number; xp: number }

export const getCommunityProjects = () => list<CommunityProject>("load projects", "projects", "name");
export const getCommunityBadges = () => list<CommunityBadge>("load badges", "badges", "id");
export const getFollows = () => list<Follow>("load follows", "follows", "created_at", false);
export const getProjectMembers = () => list<ProjectMember>("load project teams", "project_members", "joined_at");
export async function getProjectPhotos(projectId: number) {
  return unwrap<ProjectPhoto[]>("load the gallery", await supabase.from("project_photos").select("*").eq("project_id", projectId).order("id"));
}
export const getSupporters = () => list<Supporter>("load supporters", "supporters", "name");
export async function getSupporterInterestsFor(memberId: number) {
  return unwrap<SupporterInterest[]>("load your supporter interests", await supabase.from("supporter_interests").select("*").eq("member_id", memberId));
}
export async function getNews(chapterId: number, limit = 20) {
  return unwrap<NewsItem[]>("load the news", await supabase.from("news").select("*").eq("chapter_id", chapterId).order("created_at", { ascending: false }).limit(limit));
}
export async function getKudosFor(newsIds: number[]) {
  if (newsIds.length === 0) return [] as Kudos[];
  return unwrap<Kudos[]>("load kudos", await supabase.from("kudos").select("*").in("news_id", newsIds));
}
export async function getNotifications(memberId: number) {
  return unwrap<AppNotification[]>("load notifications", await supabase.from("notifications").select("*").eq("member_id", memberId).order("created_at", { ascending: false }).limit(50));
}
export async function getUnreadNotificationCount(memberId: number) {
  const { count, error } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("member_id", memberId).is("read_at", null);
  if (error) throw new Error(`Couldn't count notifications: ${error.message}`);
  return count ?? 0;
}
export const getPeerBadges = () => list<PeerBadge>("load recognition", "peer_badges", "created_at", false);
export async function getPeerBadge(id: number) {
  return unwrap<PeerBadge | null>("load the badge", await supabase.from("peer_badges").select("*").eq("id", id).maybeSingle());
}
export const getProjectCommunityStats = () => list<ProjectCommunityStats>("load project activity", "project_community_stats");

export const setFollow = (follower: number, followee: number, follow: boolean) =>
  rpc<boolean>(follow ? "follow" : "unfollow", "set_follow", { p_follower: follower, p_followee: followee, p_follow: follow });
export const joinProject = (project: number, member: number) =>
  rpc<boolean>("join the project", "join_project", { p_project: project, p_member: member });
export const leaveProject = (project: number, member: number) =>
  rpc<boolean>("leave the project", "leave_project", { p_project: project, p_member: member });
export const setKudos = (news: number, member: number, enabled: boolean) =>
  rpc<boolean>("save your kudos", "set_kudos", { p_news: news, p_member: member, p_enabled: enabled });
export const registerSupporterInterest = (supporter: number, member: number) =>
  rpc<boolean>("save your interest", "register_supporter_interest", { p_supporter: supporter, p_member: member });
export const markNotificationRead = (notification: number, member: number) =>
  rpc<boolean>("mark it read", "mark_notification_read", { p_notification: notification, p_member: member });
export const markAllNotificationsRead = (member: number) =>
  rpc<number>("mark all read", "mark_all_notifications_read", { p_member: member });
export const peerBadgeAllowance = (member: number, season: number | null = null) =>
  rpc<PeerAllowance[]>("load your giving power", "peer_badge_allowance", { p_member: member, p_season: season });
export const givePeerBadge = (giver: number, receiver: number, badge: number, note: string) =>
  rpc<number>("give the badge", "give_peer_badge", { p_giver: giver, p_receiver: receiver, p_badge: badge, p_note: note });
