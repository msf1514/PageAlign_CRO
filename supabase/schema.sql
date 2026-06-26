-- PageAlign CRO — database schema
-- Run this in YOUR Supabase project: Dashboard → SQL Editor → New query → paste → Run.
-- Safe to re-run (idempotent). Uses a distinct table name (cro_runs) so it can
-- coexist with other apps in the same Supabase project.

create table if not exists public.cro_runs (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references auth.users (id) on delete cascade,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),

  -- A friendly label (defaults to the target host on the client).
  title                     text,

  -- Inputs.
  target_url                text not null,
  user_vision               text,
  ad_creative               text,

  -- Engine metadata.
  mode                      text,
  confidence_score          numeric,
  iteration                 int,
  scrape_method             text,
  original_source_is_mocked boolean,

  -- Generated artifacts.
  global_adjustments        jsonb,
  sections_optimized        jsonb,
  change_log_summary        text,
  scraped_text_preview      text,
  enhanced_html             text
);

create index if not exists cro_runs_user_id_created_at_idx
  on public.cro_runs (user_id, created_at desc);

-- Keep updated_at fresh on edits.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists cro_runs_set_updated_at on public.cro_runs;
create trigger cro_runs_set_updated_at
  before update on public.cro_runs
  for each row execute function public.set_updated_at();

-- ─── Row-level security: each user sees only their own rows ───────────────────
alter table public.cro_runs enable row level security;

drop policy if exists "own_select" on public.cro_runs;
create policy "own_select" on public.cro_runs
  for select using (auth.uid() = user_id);

drop policy if exists "own_insert" on public.cro_runs;
create policy "own_insert" on public.cro_runs
  for insert with check (auth.uid() = user_id);

drop policy if exists "own_update" on public.cro_runs;
create policy "own_update" on public.cro_runs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own_delete" on public.cro_runs;
create policy "own_delete" on public.cro_runs
  for delete using (auth.uid() = user_id);
