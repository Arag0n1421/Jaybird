"""Generate supabase/seed.sql: schema + fake data for the Jaybird hackathon demo.

Schema follows docs/2026-10-24-product-spec.md, section 4 (data model).
Run: python3 supabase/generate_seed.py
All people and numbers are made up.

Seed is built around the demo story (spec section 5):
- Task "Write the Instagram recap" (15m, social) is open, nobody asked yet.
- Elza (social, writing) is the best match, has no pending asks, 6-week streak.
- Elza is 4th on the Riga Go! board, 30 XP behind Laura. Approving the task gives
  40 XP + 40 Spark bonus (chapter had no social task done in 14 days) -> she passes Laura.
"""
import random
from pathlib import Path

random.seed(24)


class Raw(str):
    """SQL expression, inserted without quotes."""


def q(v):
    if v is None:
        return "null"
    if isinstance(v, Raw):
        return v
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return str(v)
    if isinstance(v, list):
        return "'{" + ",".join(f'"{s}"' for s in v).replace("'", "''") + "}'"
    return "'" + str(v).replace("'", "''") + "'"


def insert(table, cols, rows):
    body = ",\n".join("  (" + ", ".join(q(v) for v in r) + ")" for r in rows)
    return f"insert into public.{table} ({', '.join(cols)}) values\n{body};"


def ago(days, hours=0):
    return Raw(f"now() - interval '{days} days {hours} hours'")


def week_ago(k):
    """A timestamp inside the calendar week k weeks back (k=0: this week, an hour ago)."""
    if k == 0:
        return Raw("now() - interval '1 hour'")
    return Raw(f"date_trunc('week', now()) - interval '{k} weeks' + interval '2 days {random.randint(9, 20)} hours'")


def in_days(n):
    return Raw(f"current_date + {n}")


# ---------------------------------------------------------------- data

CHAPTERS = [(1, "JCI Riga Go!", "Latvia"), (2, "JCI Riga", "Latvia"), (3, "JCI Tallinn", "Estonia")]

# Shared tag vocabulary: tasks.tags and members.skills/interests use the same words,
# so matching can be plain tag overlap (spec F5).
# id, name, chapter, role, is_senator, is_new, skills, interests, available_time, target_xp, streak_weeks
MEMBERS = [
    (1, "Elza Kalna", 1, "member", False, False, ["social", "writing", "events"], ["startups", "culture"], "15m", 1240, 6),
    (2, "Roberts Ozoliņš", 1, "board", False, False, ["partnerships", "sales", "speaking"], ["startups", "business"], "1h", 1860, 9),
    (3, "Anna Liepiņa", 1, "board", False, False, ["recruiting", "speaking", "events"], ["youth", "education"], "half_day", 1520, 4),
    (4, "Laura Vītola", 1, "member", False, False, ["events", "logistics", "finance"], ["family", "culture"], "1h", 1270, 3),
    (5, "Kristaps Bērziņš", 1, "member", False, False, ["logistics", "mentoring", "coding"], ["tech", "sports"], "1h", 990, 2),
    (6, "Inese Krūze", 1, "president", False, False, ["leadership", "events", "partnerships"], ["community", "education"], "half_day", 760, 1),
    (7, "Artis Lācis", 1, "member", False, True, ["design", "photo"], ["tech", "culture"], "1h", 60, 1),
    (8, "Zane Priede", 1, "member", False, True, ["writing", "translation"], ["environment", "travel"], "15m", 40, 0),
    (9, "Mārtiņš Kļaviņš", 2, "president", False, False, ["leadership", "recruiting", "speaking"], ["business", "youth"], "1h", 2410, 11),
    (10, "Dace Sproģe", 2, "board", False, False, ["finance", "sales", "partnerships"], ["business", "health"], "1h", 1790, 5),
    (11, "Oskars Avotiņš", 2, "member", False, False, ["events", "speaking", "video"], ["startups", "sports"], "half_day", 1330, 2),
    (12, "Rūta Saule", 2, "member", False, True, ["social", "photo"], ["culture", "travel"], "15m", 50, 1),
    (13, "Kadri Tamm", 3, "president", False, False, ["design", "social", "events"], ["environment", "community"], "1h", 1450, 4),
    (14, "Mart Kask", 3, "member", False, False, ["coding", "video", "logistics"], ["tech", "startups"], "half_day", 880, 0),
    (15, "Liis Saar", 3, "member", False, True, ["writing", "social"], ["education", "culture"], "15m", 30, 1),
    # senators: members with is_senator = true, optional mentors
    (16, "Jānis Ozols", 1, "member", True, False, ["mentoring", "partnerships", "leadership"], ["business"], "1h", 0, 0),
    (17, "Ilze Bērziņa", 2, "member", True, False, ["mentoring", "speaking", "training"], ["education"], "1h", 0, 0),
    (18, "Toomas Rebane", 3, "member", True, False, ["mentoring", "coding", "startups"], ["tech"], "half_day", 0, 0),
]
M = {m[1].split()[0]: m[0] for m in MEMBERS}

BUDDIES = [(M["Artis"], M["Kristaps"]), (M["Zane"], M["Elza"]), (M["Rūta"], M["Oskars"]), (M["Liis"], M["Kadri"])]
MENTORS = [(M["Jānis"], M["Elza"]), (M["Jānis"], M["Artis"]), (M["Ilze"], M["Rūta"]),
           (M["Ilze"], M["Oskars"]), (M["Toomas"], M["Mart"]), (M["Toomas"], M["Liis"])]

PROJECTS = [
    (1, "Family Day volunteers", 1, M["Inese"],
     "Family day for 100 families with games, an auction and a picnic. Needs volunteers on the day."),
    (2, "Founders Evening", 1, M["Roberts"],
     "Evening where local founders share their first-year stories with members and guests."),
]

# id, project, title, category, tags, time_tag, xp, status, assignee, verifier, due (days from today), completed (days ago)
TASKS = [
    (1, 1, "Register families at the door", "project", ["events", "logistics"], "half_day", 120, "review", M["Kristaps"], M["Inese"], 14, None),
    (2, 1, "Track the auction sheet", "ops", ["finance", "logistics"], "1h", 60, "review", M["Laura"], M["Inese"], 14, None),
    (3, 1, "Print name badges", "ops", ["design", "logistics"], "15m", 25, "done", M["Anna"], M["Inese"], 5, 3),
    (4, 1, "Confirm 100 family places", "project", ["events", "logistics"], "half_day", 120, "done", M["Laura"], M["Inese"], 2, 6),
    (5, 1, "Find 5 more volunteers", "recruiting", ["recruiting", "speaking"], "1h", 80, "asked", None, M["Inese"], 10, None),
    (6, 1, "Photo coverage on the day", "social", ["photo", "social"], "half_day", 100, "open", None, M["Inese"], 14, None),
    (7, 2, "Write the Instagram recap", "social", ["social", "writing"], "15m", 40, "open", None, M["Roberts"], 3, None),
    (8, 2, "Greet 2 new members at the welcome evening", "recruiting", ["recruiting", "events"], "1h", 50, "in_progress", M["Anna"], M["Roberts"], 8, None),
    (9, 2, "Book 3 founder speakers", "project", ["partnerships", "speaking"], "half_day", 130, "in_progress", M["Oskars"], M["Roberts"], 6, None),
    (10, 2, "Design the event poster", "social", ["design", "social"], "1h", 60, "asked", None, M["Anna"], 4, None),
    (11, 2, "Book the venue", "ops", ["events", "partnerships"], "1h", 50, "done", M["Inese"], M["Roberts"], -2, 9),
    (12, 2, "Moderate the Q&A", "project", ["speaking", "events"], "1h", 70, "open", None, M["Roberts"], 8, None),
    (13, 2, "Invite a friend to the evening", "recruiting", ["recruiting"], "15m", 30, "open", None, M["Roberts"], 7, None),
]

# id, task, member, asked_by, status, asked (days ago), answered (days ago)
ASKS = [
    (1, 5, M["Mārtiņš"], M["Inese"], "declined", 2, 1),
    (2, 5, M["Anna"], M["Inese"], "pending", 1, None),           # next match after decline
    (3, 10, M["Artis"], M["Anna"], "declined", 3, 2),
    (4, 10, M["Kadri"], M["Anna"], "pending", 2, None),
    (5, 8, M["Anna"], M["Roberts"], "accepted", 4, 4),
    (6, 9, M["Oskars"], M["Roberts"], "accepted", 6, 5),         # Bridge: other chapter
    (7, 1, M["Kristaps"], M["Inese"], "accepted", 8, 7),
    (8, 2, M["Laura"], M["Inese"], "accepted", 8, 8),
]

BADGES = [
    ("delegator", "Delegator", "3 tasks handed off and finished by others. Both earn."),
    ("spark", "Spark", "Social post when the chapter had no posts for 14 days. x2 XP."),
    ("connector", "Connector", "Buddy pair or intro that led to a task."),
    ("recruiter", "Recruiter", "A new member joined through you."),
    ("closer", "Closer", "Won a sponsorship."),
    ("rescuer", "Rescuer", "Took an overdue task and finished it."),
    ("quality_gate", "Quality Gate", "Checked 10 tasks as lead or verifier."),
    ("bridge", "Bridge", "Did a task for another chapter."),
    ("host", "Host", "Organized an event."),
    ("mentor", "Mentor", "Senator with 3 mentoring sessions."),
    ("handover_hero", "Handover Hero", "Documented own role before the term ended."),
    ("streak", "Streak", "1 task a week, N weeks in a row."),
]
B = {code: i for i, (code, _, _) in enumerate(BADGES, start=1)}

# member, badge code, days ago
MEMBER_BADGES = [
    (M["Elza"], "streak", 7), (M["Roberts"], "delegator", 20), (M["Roberts"], "host", 60),
    (M["Anna"], "recruiter", 30), (M["Anna"], "connector", 45), (M["Laura"], "rescuer", 12),
    (M["Kristaps"], "connector", 25), (M["Inese"], "quality_gate", 40), (M["Inese"], "host", 90),
    (M["Mārtiņš"], "host", 15), (M["Mārtiņš"], "handover_hero", 300), (M["Dace"], "closer", 50),
    (M["Oskars"], "bridge", 5), (M["Kadri"], "spark", 33), (M["Jānis"], "mentor", 80),
    (M["Ilze"], "mentor", 120),
]

HISTORY_REASONS = ["task", "task", "task", "task", "recruit", "streak_bonus", "role_bonus", "sponsorship"]

# ---------------------------------------------------------------- schema

SCHEMA = """
-- Jaybird hackathon: schema + fake data. All people are made up.
-- Follows docs/2026-10-24-product-spec.md section 4.
-- Re-runnable: drops and recreates the demo tables (any data in them is lost).

drop view if exists public.project_leaderboard;
drop view if exists public.member_stats;
drop table if exists public.member_badges, public.badges, public.xp_ledger, public.asks,
  public.tasks, public.projects, public.mentors, public.buddies, public.members, public.chapters cascade;
drop function if exists public.on_task_done() cascade;
drop function if exists public.on_ask_answered() cascade;
drop function if exists public.on_ask_created() cascade;

create table public.chapters (
  id       bigint generated by default as identity primary key,
  name     text not null unique,
  country  text not null
);

-- Senators are members with is_senator = true.
create table public.members (
  id              bigint generated by default as identity primary key,
  name            text not null,
  chapter_id      bigint not null references public.chapters(id),
  role            text not null default 'member' check (role in ('member','board','president')),
  is_senator      boolean not null default false,
  is_new          boolean not null default false,
  skills          text[] not null default '{}',
  interests       text[] not null default '{}',
  available_time  text check (available_time in ('15m','1h','half_day')),
  created_at      timestamptz not null default now()
);

create table public.projects (
  id           bigint generated by default as identity primary key,
  name         text not null,
  chapter_id   bigint not null references public.chapters(id),
  lead_id      bigint references public.members(id),
  description  text
);

create table public.tasks (
  id            bigint generated by default as identity primary key,
  project_id    bigint not null references public.projects(id) on delete cascade,
  title         text not null,
  category      text not null check (category in ('project','ops','social','recruiting')),
  tags          text[] not null default '{}',
  time_tag      text not null check (time_tag in ('15m','1h','half_day')),
  xp            int not null default 0,
  status        text not null default 'open' check (status in ('open','asked','in_progress','review','done')),
  assignee_id   bigint references public.members(id),
  verifier_id   bigint references public.members(id),
  due_date      date,
  completed_at  timestamptz,
  created_at    timestamptz not null default now()
);

create table public.asks (
  id           bigint generated by default as identity primary key,
  task_id      bigint not null references public.tasks(id) on delete cascade,
  member_id    bigint not null references public.members(id) on delete cascade,
  asked_by     bigint references public.members(id),
  status       text not null default 'pending' check (status in ('pending','accepted','declined')),
  asked_at     timestamptz not null default now(),
  answered_at  timestamptz
);

create table public.xp_ledger (
  id          bigint generated by default as identity primary key,
  member_id   bigint not null references public.members(id) on delete cascade,
  task_id     bigint references public.tasks(id) on delete set null,
  xp          int not null,
  reason      text not null,  -- task, spark_bonus, recruit, sponsorship, streak_bonus, role_bonus
  created_at  timestamptz not null default now()
);

create table public.badges (
  id           bigint generated by default as identity primary key,
  code         text not null unique,
  name         text not null,
  description  text
);

create table public.member_badges (
  member_id  bigint not null references public.members(id) on delete cascade,
  badge_id   bigint not null references public.badges(id) on delete cascade,
  earned_at  timestamptz not null default now(),
  primary key (member_id, badge_id)
);

create table public.buddies (
  new_member_id  bigint primary key references public.members(id) on delete cascade,
  buddy_id       bigint not null references public.members(id) on delete cascade
);

create table public.mentors (
  senator_id  bigint not null references public.members(id) on delete cascade,
  member_id   bigint not null references public.members(id) on delete cascade,
  primary key (senator_id, member_id)
);

create index on public.members (chapter_id);
create index on public.tasks (project_id);
create index on public.tasks (assignee_id);
create index on public.asks (member_id, status);
create index on public.xp_ledger (member_id);

-- XP engine. Task set to 'done' (lead or verifier approves):
--   ledger gets the task XP; social task in a chapter with no social task done
--   in the last 14 days also gets Spark: badge + same XP again (x2).
create function public.on_task_done() returns trigger language plpgsql as $$
declare ch bigint;
begin
  if new.status = 'done' and old.status is distinct from 'done' and new.assignee_id is not null then
    new.completed_at := coalesce(new.completed_at, now());
    insert into public.xp_ledger (member_id, task_id, xp, reason) values (new.assignee_id, new.id, new.xp, 'task');

    select chapter_id into ch from public.projects where id = new.project_id;
    if new.category = 'social' and not exists (
      select 1 from public.tasks t join public.projects p on p.id = t.project_id
       where p.chapter_id = ch and t.category = 'social' and t.status = 'done'
         and t.id <> new.id and t.completed_at > now() - interval '14 days'
    ) then
      insert into public.xp_ledger (member_id, task_id, xp, reason) values (new.assignee_id, new.id, new.xp, 'spark_bonus');
      insert into public.member_badges (member_id, badge_id)
        select new.assignee_id, id from public.badges where code = 'spark'
        on conflict do nothing;
    end if;
  end if;
  return new;
end $$;

create trigger tasks_on_done before update of status on public.tasks
for each row execute function public.on_task_done();

-- Personal ask answered (spec F3).
--   accepted: member gets the task (in_progress), other pending asks on it close.
--   declined: if nobody else is pending, task goes back to 'open' so the app can ask the next match.
create function public.on_ask_answered() returns trigger language plpgsql as $$
begin
  if new.status <> old.status then
    new.answered_at := coalesce(new.answered_at, now());
    if new.status = 'accepted' then
      update public.tasks set assignee_id = new.member_id, status = 'in_progress' where id = new.task_id;
      update public.asks set status = 'declined', answered_at = now()
       where task_id = new.task_id and id <> new.id and status = 'pending';
    elsif new.status = 'declined' and not exists (
      select 1 from public.asks where task_id = new.task_id and id <> new.id and status = 'pending'
    ) then
      update public.tasks set status = 'open' where id = new.task_id and status = 'asked';
    end if;
  end if;
  return new;
end $$;

create trigger asks_on_answer before update of status on public.asks
for each row execute function public.on_ask_answered();

-- A new pending ask moves an open task to 'asked'.
create function public.on_ask_created() returns trigger language plpgsql as $$
begin
  update public.tasks set status = 'asked' where id = new.task_id and status = 'open';
  return new;
end $$;

create trigger asks_on_create after insert on public.asks
for each row execute function public.on_ask_created();
"""

VIEWS = """
-- XP, level and weekly streak per member. 200 XP per level.
-- Ranks for the leaderboard scopes chapter / national / global (spec F7).
create view public.member_stats with (security_invoker = true) as
with xp as (
  select member_id, sum(xp)::int as xp from public.xp_ledger group by member_id
),
weeks as (
  select distinct member_id, date_trunc('week', created_at)::date as wk from public.xp_ledger
),
runs as (
  select member_id, wk,
         wk - (7 * row_number() over (partition by member_id order by wk))::int as grp
    from weeks
),
streak as (
  select member_id, count(*)::int as streak_weeks
    from runs group by member_id, grp
  having max(wk) >= date_trunc('week', now())::date - 7
)
select m.id as member_id, m.name, m.chapter_id, c.name as chapter_name, c.country,
       m.is_senator, m.is_new,
       coalesce(x.xp, 0) as xp,
       1 + coalesce(x.xp, 0) / 200 as level,
       coalesce(x.xp, 0) % 200 as xp_in_level,
       200 as xp_per_level,
       coalesce(s.streak_weeks, 0) as streak_weeks,
       rank() over (partition by m.chapter_id order by coalesce(x.xp, 0) desc) as chapter_rank,
       rank() over (partition by c.country order by coalesce(x.xp, 0) desc) as national_rank,
       rank() over (order by coalesce(x.xp, 0) desc) as global_rank
  from public.members m
  join public.chapters c on c.id = m.chapter_id
  left join xp x on x.member_id = m.id
  left join streak s on s.member_id = m.id;

-- XP earned inside one project, for the "project" leaderboard scope.
create view public.project_leaderboard with (security_invoker = true) as
select t.project_id, l.member_id, m.name, sum(l.xp)::int as xp,
       rank() over (partition by t.project_id order by sum(l.xp) desc) as project_rank
  from public.xp_ledger l
  join public.tasks t on t.id = l.task_id
  join public.members m on m.id = l.member_id
 group by t.project_id, l.member_id, m.name;
"""

POLICIES = """
-- Hackathon access: anyone with the anon key can read and write. Not for production.
do $$
declare t text;
begin
  foreach t in array array['chapters','members','projects','tasks','asks','xp_ledger','badges',
                           'member_badges','buddies','mentors'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "demo all" on public.%I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;
grant select on public.member_stats, public.project_leaderboard to anon, authenticated;

-- Live updates: approve on lead screen -> member screen sees new ledger row and badge.
do $$
begin
  alter publication supabase_realtime add table public.tasks, public.asks, public.xp_ledger, public.member_badges;
exception when others then null;
end $$;
"""

# ---------------------------------------------------------------- build


def build_ledger():
    """XP history per member so totals and weekly streaks match MEMBERS."""
    rows = []
    task_xp = {}
    for t in TASKS:
        if t[7] == "done":
            rows.append([t[8], t[0], t[6], "task", ago(t[11], 15)])
            task_xp[t[8]] = task_xp.get(t[8], 0) + t[6]
    for mid, _name, *_rest in MEMBERS:
        target, streak = _rest[-2], _rest[-1]
        rest = target - task_xp.get(mid, 0)
        if rest <= 0:
            continue
        # streak weeks: weeks 1..streak ago (current week left free, so a task today extends it)
        weeks = list(range(1, streak + 1))
        # older, scattered weeks before a gap
        older = sorted(random.sample(range(streak + 2, 60), k=min(8, max(1, rest // 150))))
        weeks += older
        n = len(weeks)
        cuts = sorted(random.sample(range(1, rest), n - 1)) if n > 1 else []
        parts = [b - a for a, b in zip([0] + cuts, cuts + [rest])]
        for wk, xp in zip(weeks, parts):
            rows.append([mid, None, xp, random.choice(HISTORY_REASONS), week_ago(wk)])
    return rows


def main():
    out = [SCHEMA.strip()]
    out.append(insert("chapters", ["id", "name", "country"], CHAPTERS))
    out.append(insert("members", ["id", "name", "chapter_id", "role", "is_senator", "is_new", "skills",
                                  "interests", "available_time"], [m[:9] for m in MEMBERS]))
    out.append(insert("buddies", ["new_member_id", "buddy_id"], BUDDIES))
    out.append(insert("mentors", ["senator_id", "member_id"], MENTORS))
    out.append(insert("projects", ["id", "name", "chapter_id", "lead_id", "description"], PROJECTS))
    out.append(insert("tasks", ["id", "project_id", "title", "category", "tags", "time_tag", "xp", "status",
                                "assignee_id", "verifier_id", "due_date", "completed_at"],
                      [list(t[:10]) + [in_days(t[10]), ago(t[11], 15) if t[11] is not None else None]
                       for t in TASKS]))
    # Triggers would change task status while seeding; insert asks with triggers off.
    out.append("alter table public.asks disable trigger user;")
    out.append(insert("asks", ["id", "task_id", "member_id", "asked_by", "status", "asked_at", "answered_at"],
                      [[a[0], a[1], a[2], a[3], a[4], ago(a[5], 10), ago(a[6], 2) if a[6] is not None else None]
                       for a in ASKS]))
    out.append("alter table public.asks enable trigger user;")
    out.append(insert("badges", ["id", "code", "name", "description"],
                      [[i, *b] for i, b in enumerate(BADGES, start=1)]))
    out.append(insert("member_badges", ["member_id", "badge_id", "earned_at"],
                      [[m, B[code], ago(d)] for m, code, d in MEMBER_BADGES]))
    ledger = build_ledger()
    out.append(insert("xp_ledger", ["member_id", "task_id", "xp", "reason", "created_at"], ledger))
    out.append(VIEWS.strip())
    out.append(POLICIES.strip())
    out.append("-- Explicit ids were used above; move sequences past them.\n" + "\n".join(
        f"select setval(pg_get_serial_sequence('public.{t}', 'id'), (select max(id) from public.{t}));"
        for t in ["chapters", "members", "projects", "tasks", "asks", "badges"]))

    path = Path(__file__).with_name("seed.sql")
    path.write_text("\n\n".join(out) + "\n", encoding="utf-8")
    print(f"wrote {path}: {len(CHAPTERS)} chapters, {len(MEMBERS)} members "
          f"({sum(m[4] for m in MEMBERS)} senators), {len(PROJECTS)} projects, {len(TASKS)} tasks, "
          f"{len(ASKS)} asks, {len(BADGES)} badges, {len(ledger)} ledger rows")


if __name__ == "__main__":
    main()
