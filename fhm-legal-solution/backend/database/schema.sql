-- ============================================================================
-- FHM-Legal-Solution — Supabase / PostgreSQL Schema
-- Run this once in Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================================

create extension if not exists "uuid-ossp";

-- ────────────────────────────────────────────────────────────────────────────
-- ADMIN USERS
-- Only people who can log in to the admin dashboard. Never exposed publicly.
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists admin_users (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  email         text unique not null,
  password_hash text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────────────────
-- ADVOCATES
-- One row per lawyer. Replaces the individual per-advocate HTML files.
-- The "slug" is what the dynamic advocate.html page loads by
-- (e.g. advocate.html?slug=faheem-uddin).
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists advocates (
  id                 uuid primary key default uuid_generate_v4(),
  slug               text unique not null,          -- url-safe id, e.g. "faheem-uddin"
  name               text not null,                 -- e.g. "Adv. Faheem Uddin"
  designation        text,                           -- e.g. "Senior MACT Lawyer & Motor Accident Claims Specialist"
  court              text,                           -- e.g. "Kanpur Court"
  city               text,
  state              text,
  experience_years   int default 0,
  cases_won          int default 0,
  rating             numeric(2,1) default 5.0,
  review_count       int default 0,
  success_rate       int default 0,                  -- percentage, e.g. 96
  languages          text[] default '{}',            -- e.g. {Hindi,English,Urdu}
  practice_tags      text[] default '{}',             -- short chips shown on the card, e.g. {MACT Expert, Insurance Disputes}
  consultation_fee   numeric(10,2) default 0,
  fee_unit           text default 'session',          -- "session" / "hour" / "case"
  is_available       boolean default true,
  is_featured        boolean default false,
  bar_council_text   text,                            -- e.g. "Bar Council of U.P. Registered"
  photo_url          text,                             -- Supabase Storage public URL
  short_bio          text,                             -- shown on the homepage / hero description
  long_bio           jsonb default '[]',               -- array of paragraph strings for the About section
  quote              text,
  quote_attribution  text,
  why_choose         jsonb default '[]',               -- [{ "title": "...", "desc": "..." }]
  practice_areas     jsonb default '[]',               -- [{ "title": "...", "desc": "..." }]  (numbered pa-cards on the profile page)
  fee_structure      jsonb default '[]',               -- [{ "name","type","original_price","price","save_text","inclusions":[...],"featured":bool,"button_text" }]
  achievements       jsonb default '[]',               -- [{ "title": "...", "desc": "..." }]
  reviews            jsonb default '[]',               -- [{ "name": "...", "case": "...", "text": "..." }]
  phone              text,
  whatsapp           text,
  email              text,
  address             text,
  meta_title          text,                            -- SEO
  meta_description    text,                            -- SEO
  sort_order          int default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_advocates_slug on advocates(slug);
create index if not exists idx_advocates_featured on advocates(is_featured);
create index if not exists idx_advocates_city on advocates(city);

-- ────────────────────────────────────────────────────────────────────────────
-- HOMEPAGE CONTENT
-- Flexible key → JSON store for editable homepage sections that aren't
-- naturally a "list" (hero banner, footer, stats strip, site settings, etc).
-- Add new sections any time without a migration.
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists homepage_content (
  id           uuid primary key default uuid_generate_v4(),
  section_key  text unique not null,   -- e.g. 'hero', 'footer', 'stats', 'site_settings'
  content      jsonb not null default '{}',
  updated_at   timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────────────────
-- PRACTICE AREAS
-- The homepage "Practice Areas" grid.
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists practice_areas (
  id           uuid primary key default uuid_generate_v4(),
  title        text not null,
  description  text,
  icon         text,          -- icon keyword/svg-name used by the frontend
  sort_order   int default 0,
  is_active    boolean default true,
  created_at   timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────────────────
-- TESTIMONIALS
-- Homepage testimonials carousel/grid.
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists testimonials (
  id            uuid primary key default uuid_generate_v4(),
  client_name   text not null,
  client_city   text,
  rating        int default 5,
  review_text   text not null,
  photo_url     text,
  is_featured   boolean default true,
  sort_order    int default 0,
  created_at    timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────────────────
-- CONSULTATIONS
-- Contact / "Book Consultation" form submissions, manageable from the admin.
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists consultations (
  id            uuid primary key default uuid_generate_v4(),
  advocate_id   uuid references advocates(id) on delete set null,
  name          text not null,
  phone         text not null,
  email         text,
  message       text,
  status        text default 'new',   -- new | contacted | closed
  created_at    timestamptz not null default now()
);

create index if not exists idx_consultations_advocate on consultations(advocate_id);
create index if not exists idx_consultations_status on consultations(status);

-- ────────────────────────────────────────────────────────────────────────────
-- updated_at auto-touch trigger (keeps updated_at fresh on every UPDATE)
-- ────────────────────────────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_advocates_updated_at on advocates;
create trigger trg_advocates_updated_at
before update on advocates
for each row execute function set_updated_at();

drop trigger if exists trg_admin_users_updated_at on admin_users;
create trigger trg_admin_users_updated_at
before update on admin_users
for each row execute function set_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- The backend talks to Supabase using the SERVICE ROLE key, which bypasses
-- RLS entirely — so the API stays in full control of who can do what (via
-- JWT middleware). We still enable RLS on every table as defense-in-depth,
-- in case the anon/public key is ever used directly from the browser.
-- No public policies are created, so the anon key gets zero access by default.
-- ============================================================================
alter table admin_users     enable row level security;
alter table advocates       enable row level security;
alter table homepage_content enable row level security;
alter table practice_areas  enable row level security;
alter table testimonials    enable row level security;
alter table consultations   enable row level security;
