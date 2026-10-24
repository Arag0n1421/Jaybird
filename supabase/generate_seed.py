"""Generate supabase/seed.sql: schema + fake data for the Jaybird hackathon demo.

Run: python3 supabase/generate_seed.py
All people and numbers are made up. Names and numbers that appear on the
concept page (Elza 1,240 pts, Family Day volunteers tasks, leaderboard) are kept.
"""
import random
from datetime import date, timedelta
from pathlib import Path

random.seed(23)
TODAY = date(2026, 10, 24)

CHAPTERS = [
    # id, name, city, country
    (1, "JCI Riga Go!", "Riga", "Latvia"),
    (2, "JCI Riga", "Riga", "Latvia"),
    (3, "JCI Tallinn", "Tallinn", "Estonia"),
    (4, "JCI Vilnius", "Vilnius", "Lithuania"),
    (5, "JCI Helsinki", "Helsinki", "Finland"),
]

SKILLS = ["event planning", "social media", "photography", "design", "copywriting",
          "public speaking", "fundraising", "sales", "finance", "project management",
          "coding", "video", "mentoring", "logistics", "community building",
          "translation", "facilitation", "partnerships"]
INTERESTS = ["startups", "education", "environment", "youth", "health", "culture",
             "tech", "sports", "entrepreneurship", "volunteering", "travel", "networking"]

# name, chapter, points (fixed where the concept page shows them, None = random)
MEMBERS = [
    ("Elza Kalna", 1, 1240), ("Roberts Ozoliņš", 1, 1860), ("Anna Liepiņa", 1, 1520),
    ("Kristaps Bērziņš", 1, 990), ("Laura Vītola", 1, 870), ("Inese Krūze", 1, None),
    ("Pēteris Zariņš", 1, None), ("Sandra Eglīte", 1, None), ("Artis Lācis", 1, 140),
    ("Zane Priede", 1, 95),
    ("Mārtiņš Kļaviņš", 2, 2410), ("Dace Sproģe", 2, 1790), ("Oskars Avotiņš", 2, 1330),
    ("Ieva Rozīte", 2, None), ("Gatis Jansons", 2, None), ("Ainārs Pūce", 2, None),
    ("Linda Strautiņa", 2, None), ("Edgars Muižnieks", 2, None), ("Rūta Saule", 2, 120),
    ("Valdis Ābele", 2, 80),
    ("Kadri Tamm", 3, None), ("Mart Kask", 3, None), ("Liis Saar", 3, None),
    ("Rasmus Mägi", 3, None), ("Triin Lepik", 3, None), ("Karl Sepp", 3, 110),
    ("Jonas Petraitis", 4, 3880), ("Rūta Kazlauskaitė", 4, None), ("Mantas Jankauskas", 4, None),
    ("Eglė Vaitkutė", 4, None), ("Lukas Žukauskas", 4, None), ("Gabija Butkutė", 4, 90),
    ("Aino Virtanen", 5, None), ("Mikko Korhonen", 5, None), ("Emilia Nieminen", 5, None),
    ("Juho Mäkinen", 5, None), ("Sanni Heikkinen", 5, 130),
]
NEW_MEMBER_POINTS_MAX = 150  # members under this are "new" and get a buddy

SENATORS = [
    # name, chapter, senator_since, expertise
    ("Jānis Ozols", 1, 2014, ["leadership", "fundraising", "partnerships"]),
    ("Ilze Bērziņa", 2, 2011, ["public speaking", "facilitation", "training"]),
    ("Uldis Kalniņš", 2, 2009, ["finance", "entrepreneurship", "governance"]),
    ("Vita Liepa", 1, 2017, ["marketing", "social media", "branding"]),
    ("Toomas Rebane", 3, 2012, ["tech", "startups", "mentoring"]),
    ("Darius Paulauskas", 4, 2015, ["sales", "partnerships", "event planning"]),
    ("Pekka Laine", 5, 2010, ["governance", "international relations", "training"]),
]

# name, chapter, lead (member name), category, status, start offset days, length days, description
PROJECTS = [
    ("Family Day volunteers", 1, "Elza Kalna", "Community", "active", -20, 35,
     "Family day for 100 families with games, auction and a picnic. Needs volunteers on the day."),
    ("Founders Evening", 1, "Roberts Ozoliņš", "Business", "active", -10, 25,
     "Evening where local founders share their first-year stories with members and guests."),
    ("Chapter growth", 1, "Anna Liepiņa", "Recruiting", "active", -60, 120,
     "Ongoing push to bring 15 new members into Riga Go! this year."),
    ("Youth Mentoring", 2, "Mārtiņš Kļaviņš", "Education", "active", -45, 90,
     "Members and senators mentor high-school students on careers and first jobs."),
    ("Business Breakfast Series", 2, "Dace Sproģe", "Business", "active", -30, 150,
     "Monthly breakfasts with a guest speaker. Sponsor covers food."),
    ("Clean-up Day", 3, "Kadri Tamm", "Environment", "planning", 10, 30,
     "City park clean-up with local schools and a partner company."),
    ("Baltic Leadership Academy", 4, "Jonas Petraitis", "Training", "active", -15, 60,
     "Two-day training for new board members from all Baltic chapters."),
    ("Nordic Hack Weekend", 5, "Aino Virtanen", "Tech", "planning", 20, 40,
     "Weekend hackathon for civic tech ideas. Open to all Nordic Group chapters."),
    ("Winter Charity Gala", 2, "Oskars Avotiņš", "Fundraising", "completed", -120, 60,
     "Annual gala. Raised money for the children's hospital."),
]

# Tasks fixed by the concept page. (title, category, points, status, assignee, skills)
FIXED_TASKS = {
    "Family Day volunteers": [
        ("Register families at the door", "Project", 60, "review", "Elza Kalna", ["logistics"]),
        ("Track the auction sheet", "Project", 50, "review", "Roberts Ozoliņš", ["finance"]),
        ("Print name badges", "Ops", 30, "done", "Anna Liepiņa", ["design"]),
        ("Set up the registration table", "Ops", 40, "done", "Kristaps Bērziņš", ["logistics"]),
        ("Confirm 100 family places", "Project", 120, "done", "Laura Vītola", ["event planning"]),
        ("Find 5 more volunteers", "Recruiting", 80, "open", None, ["community building"]),
        ("Photo coverage", "Social", 35, "open", None, ["photography"]),
        ("Write the Instagram recap", "Social", 35, "open", None, ["social media", "copywriting"]),
        ("Find a sponsor for the picnic food", "Sponsorship", 150, "open", None, ["sales", "fundraising"]),
    ],
    "Founders Evening": [
        ("Greet 2 new members at the welcome evening", "Ops", 40, "open", None, ["community building"]),
        ("Write the Instagram recap", "Social", 35, "open", None, ["social media", "copywriting"]),
        ("Book 3 founder speakers", "Project", 90, "in_progress", "Roberts Ozoliņš", ["partnerships"]),
        ("Book the venue", "Ops", 50, "done", "Inese Krūze", ["event planning"]),
        ("Design the event poster", "Social", 45, "review", "Sandra Eglīte", ["design"]),
        ("Moderate the Q&A", "Project", 60, "open", None, ["public speaking", "facilitation"]),
    ],
    "Chapter growth": [
        ("Invite a friend to the next open event", "Recruiting", 80, "open", None, ["networking", "community building"]),
        ("Run the info session for newcomers", "Recruiting", 70, "in_progress", "Anna Liepiņa", ["public speaking"]),
        ("Update the membership FAQ", "Ops", 30, "done", "Pēteris Zariņš", ["copywriting"]),
        ("Be a buddy for a new member", "Recruiting", 60, "done", "Kristaps Bērziņš", ["mentoring"]),
    ],
}

# Generic task templates for the other projects. (title, category, points, skills)
GENERIC_TASKS = [
    ("Make a sign-up form", "Ops", 30, ["coding", "project management"]),
    ("Post 3 stories in the week before", "Social", 35, ["social media"]),
    ("Write the press release", "Social", 50, ["copywriting"]),
    ("Find a venue partner", "Sponsorship", 120, ["partnerships", "sales"]),
    ("Prepare the budget sheet", "Ops", 45, ["finance"]),
    ("Translate the invite to English", "Ops", 25, ["translation"]),
    ("Film a 30-second promo video", "Social", 70, ["video"]),
    ("Run the volunteer briefing", "Project", 55, ["facilitation", "public speaking"]),
    ("Order printed materials", "Ops", 30, ["logistics", "design"]),
    ("Invite 10 guests from partner companies", "Recruiting", 80, ["networking", "sales"]),
    ("Collect feedback after the event", "Project", 40, ["project management"]),
    ("Photo coverage", "Social", 35, ["photography"]),
    ("Write the handover notes", "Ops", 50, ["copywriting", "project management"]),
    ("Pitch the project to a sponsor", "Sponsorship", 150, ["sales", "fundraising", "public speaking"]),
]

COLORS = ["#57BCBC", "#EFC40F", "#F2F0FA", "#1d1845", "#0097D7"]


def q(v):
    """SQL literal."""
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return str(v)
    if isinstance(v, date):
        return f"'{v.isoformat()}'"
    if isinstance(v, list):
        inner = ",".join('"' + s.replace('"', '\\"') + '"' for s in v)
        return "'{" + inner.replace("'", "''") + "}'"
    return "'" + str(v).replace("'", "''") + "'"


def insert(table, cols, rows):
    out = [f"insert into public.{table} ({', '.join(cols)}) values"]
    out.append(",\n".join("  (" + ", ".join(q(v) for v in r) + ")" for r in rows) + ";")
    return "\n".join(out)


def level_for(points):
    # 200 pts per level, matches "L7, 1,240 / 1,500 to level 8" roughly enough for a demo
    return 1 + points // 200


def email(name):
    tr = str.maketrans("āčēģīķļņšūžõäöüėęįųąšžåé", "acegiklnsuzoaoueeiuaszae")
    first, last = name.lower().translate(tr).split(" ", 1)
    return f"{first}.{last.replace(' ', '')}@example.com"


SCHEMA = """
-- Jaybird hackathon: schema + fake data. All people are made up.
-- Re-runnable: drops and recreates the demo tables.

drop table if exists public.tasks cascade;
drop table if exists public.projects cascade;
drop table if exists public.mentorships cascade;
drop table if exists public.senators cascade;
drop table if exists public.members cascade;
drop table if exists public.chapters cascade;

create table public.chapters (
  id          bigint generated by default as identity primary key,
  name        text not null unique,
  city        text not null,
  country     text not null,
  created_at  timestamptz not null default now()
);

create table public.members (
  id            bigint generated by default as identity primary key,
  full_name     text not null,
  email         text unique,
  chapter_id    bigint not null references public.chapters(id),
  birth_year    int,
  joined_at     date not null,
  is_new        boolean not null default false,
  buddy_id      bigint references public.members(id),
  skills        text[] not null default '{}',
  interests     text[] not null default '{}',
  bio           text,
  avatar_color  text,
  points        int not null default 0,
  level         int not null default 1,
  streak_days   int not null default 0,
  created_at    timestamptz not null default now()
);

create table public.senators (
  id                      bigint generated by default as identity primary key,
  full_name               text not null,
  email                   text unique,
  chapter_id              bigint not null references public.chapters(id),
  senator_since           int not null,
  senator_number          text unique,
  expertise               text[] not null default '{}',
  bio                     text,
  available_for_mentoring boolean not null default true,
  created_at              timestamptz not null default now()
);

create table public.mentorships (
  id               bigint generated by default as identity primary key,
  senator_id       bigint not null references public.senators(id) on delete cascade,
  member_id        bigint not null references public.members(id) on delete cascade,
  started_at       date not null,
  sessions_logged  int not null default 0,
  unique (senator_id, member_id)
);

create table public.projects (
  id           bigint generated by default as identity primary key,
  name         text not null,
  description  text,
  chapter_id   bigint not null references public.chapters(id),
  lead_id      bigint references public.members(id),
  category     text not null,
  status       text not null check (status in ('planning','active','completed')),
  start_date   date,
  end_date     date,
  created_at   timestamptz not null default now()
);

create table public.tasks (
  id            bigint generated by default as identity primary key,
  project_id    bigint not null references public.projects(id) on delete cascade,
  title         text not null,
  description   text,
  category      text not null check (category in ('Project','Ops','Social','Recruiting','Sponsorship')),
  skills        text[] not null default '{}',
  points        int not null default 0,
  status        text not null default 'open' check (status in ('open','in_progress','review','done')),
  assignee_id   bigint references public.members(id),
  verifier_id   bigint references public.members(id),
  due_date      date,
  completed_at  timestamptz,
  created_at    timestamptz not null default now()
);

create index on public.members (chapter_id);
create index on public.projects (chapter_id);
create index on public.tasks (project_id);
create index on public.tasks (assignee_id);
create index on public.tasks (status);

-- Points engine (minimal): when a task becomes 'done', the assignee gets its points.
create or replace function public.award_task_points() returns trigger
language plpgsql as $$
begin
  if new.status = 'done' and old.status is distinct from 'done' and new.assignee_id is not null then
    new.completed_at := coalesce(new.completed_at, now());
    update public.members
       set points = points + new.points,
           level  = 1 + (points + new.points) / 200
     where id = new.assignee_id;
  end if;
  return new;
end $$;

create trigger tasks_award_points
before update of status on public.tasks
for each row execute function public.award_task_points();
"""

POLICIES = """
-- Hackathon access: anyone with the anon key can read and write. Not for production.
do $$
declare t text;
begin
  foreach t in array array['chapters','members','senators','mentorships','projects','tasks'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "demo all" on public.%I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- Live updates for the demo (approve on lead screen -> points change on member screen).
do $$
begin
  alter publication supabase_realtime add table public.tasks, public.members;
exception when others then null;
end $$;

"""


def main():
    parts = [SCHEMA.strip(), ""]

    # chapters
    parts.append(insert("chapters", ["id", "name", "city", "country"], CHAPTERS))

    # members
    member_rows, member_id, by_chapter = [], {}, {}
    for i, (name, ch, pts) in enumerate(MEMBERS, start=1):
        if pts is None:
            pts = int(150 + random.random() * 1050)  # stays below the fixed leaderboard names
        is_new = pts < NEW_MEMBER_POINTS_MAX
        joined = TODAY - timedelta(days=random.randint(10, 60) if is_new else random.randint(200, 2500))
        skills = random.sample(SKILLS, random.randint(2, 4))
        interests = random.sample(INTERESTS, random.randint(2, 3))
        first = name.split()[0]
        bio = f"{first} joined {CHAPTERS[ch - 1][1]} to {random.choice(['meet people who build things', 'practice leading a team', 'grow a network abroad', 'learn by running real projects', 'give back to the city'])}."
        streak = 6 if name == "Elza Kalna" else random.choice([0, 0, 1, 2, 3, 5, 8, 12])
        member_id[name] = i
        by_chapter.setdefault(ch, []).append((i, name, is_new))
        member_rows.append([i, name, email(name), ch, random.randint(1987, 2006), joined, is_new,
                            None, skills, interests, bio, random.choice(COLORS), pts, level_for(pts), streak])
    # Elza: page shows level 7
    member_rows[member_id["Elza Kalna"] - 1][13] = 7
    # buddies: each new member gets an experienced buddy from the same chapter
    buddy_updates = []
    for ch, ms in by_chapter.items():
        veterans = [m for m in ms if not m[2]]
        for mid, _, is_new in ms:
            if is_new:
                buddy_updates.append((mid, random.choice(veterans)[0]))
    parts.append(insert("members", ["id", "full_name", "email", "chapter_id", "birth_year", "joined_at",
                                    "is_new", "buddy_id", "skills", "interests", "bio", "avatar_color",
                                    "points", "level", "streak_days"], member_rows))
    parts.append("\n".join(f"update public.members set buddy_id = {b} where id = {m};" for m, b in buddy_updates))

    # senators
    sen_rows = []
    for i, (name, ch, since, exp) in enumerate(SENATORS, start=1):
        sen_rows.append([i, name, email(name), ch, since, f"#{random.randint(60000, 75000)}", exp,
                         f"JCI Senator since {since}. Happy to mentor on {exp[0]} and {exp[1]}.",
                         i != 3])
    parts.append(insert("senators", ["id", "full_name", "email", "chapter_id", "senator_since",
                                     "senator_number", "expertise", "bio", "available_for_mentoring"], sen_rows))

    # mentorships: each senator mentors 2-3 members of own chapter
    ment_rows, mid_n = [], 1
    for sid, (_, ch, _, _) in enumerate(SENATORS, start=1):
        for m in random.sample(by_chapter[ch], min(len(by_chapter[ch]), random.randint(2, 3))):
            ment_rows.append([mid_n, sid, m[0], TODAY - timedelta(days=random.randint(20, 300)), random.randint(0, 6)])
            mid_n += 1
    parts.append(insert("mentorships", ["id", "senator_id", "member_id", "started_at", "sessions_logged"], ment_rows))

    # projects
    proj_rows, proj_id = [], {}
    for i, (name, ch, lead, cat, status, start, length, desc) in enumerate(PROJECTS, start=1):
        proj_id[name] = (i, ch, member_id[lead], status, TODAY + timedelta(days=start), TODAY + timedelta(days=start + length))
        proj_rows.append([i, name, desc, ch, member_id[lead], cat, status, TODAY + timedelta(days=start),
                          TODAY + timedelta(days=start + length)])
    parts.append(insert("projects", ["id", "name", "description", "chapter_id", "lead_id", "category",
                                     "status", "start_date", "end_date"], proj_rows))

    # tasks
    task_rows, tid = [], 1

    def add_task(pname, title, cat, pts, status, assignee, skills):
        nonlocal tid
        pid, ch, lead, pstatus, start, end = proj_id[pname]
        due = min(end, max(start, TODAY + timedelta(days=random.randint(-5, 21))))
        done_at = None
        if status == "done":
            done_at = f"{(TODAY - timedelta(days=random.randint(1, 15))).isoformat()} {random.randint(9, 20)}:00:00+03"
        desc = f"{title}. Part of {pname}."
        task_rows.append([tid, pid, title, desc, cat, skills, pts, status, assignee, lead, due, done_at])
        tid += 1

    for pname, rows in FIXED_TASKS.items():
        for title, cat, pts, status, who, skills in rows:
            add_task(pname, title, cat, pts, status, member_id[who] if who else None, skills)

    for pname, (pid, ch, lead, pstatus, _, _) in proj_id.items():
        if pname in FIXED_TASKS:
            continue
        for title, cat, pts, skills in random.sample(GENERIC_TASKS, random.randint(5, 7)):
            if pstatus == "completed":
                status = "done"
            elif pstatus == "planning":
                status = random.choice(["open", "open", "open", "in_progress"])
            else:
                status = random.choice(["open", "open", "in_progress", "review", "done", "done"])
            pool = [m[0] for m in by_chapter[ch]]
            # ~15% of tasks go to someone from another chapter (Bridge badge)
            if random.random() < 0.15:
                pool = [m for m in member_id.values() if m not in pool]
            assignee = None if status == "open" else random.choice(pool)
            add_task(pname, title, cat, pts, status, assignee, skills)

    parts.append(insert("tasks", ["id", "project_id", "title", "description", "category", "skills", "points",
                                  "status", "assignee_id", "verifier_id", "due_date", "completed_at"], task_rows))

    seqs = "\n".join(
        f"select setval(pg_get_serial_sequence('public.{t}', 'id'), (select max(id) from public.{t}));"
        for t in ["chapters", "members", "senators", "mentorships", "projects", "tasks"])
    parts.append(POLICIES.strip())
    parts.append("-- Explicit ids were used above; move sequences past them.\n" + seqs)

    out = Path(__file__).with_name("seed.sql")
    out.write_text("\n\n".join(parts) + "\n", encoding="utf-8")
    print(f"wrote {out}: {len(CHAPTERS)} chapters, {len(member_rows)} members, {len(sen_rows)} senators, "
          f"{len(ment_rows)} mentorships, {len(proj_rows)} projects, {len(task_rows)} tasks")


if __name__ == "__main__":
    main()
