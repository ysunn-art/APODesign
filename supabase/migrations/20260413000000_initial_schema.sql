-- A Piece of Design — initial schema
-- Apply in Supabase SQL editor, or via `supabase db push`.

-- ============================================================
-- Extensions
-- ============================================================
create extension if not exists "pgcrypto";

-- ============================================================
-- users (mirrors auth.users)
-- ============================================================
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  avatar_url text,
  is_moderator boolean not null default false,
  created_at timestamptz not null default now()
);

-- Auto-create profile row on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, username, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'user_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- submissions
-- ============================================================
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  image_url text not null,
  title text not null,
  description text not null default '',
  category text not null check (category in ('ui_ux','physical_product','architecture','signage','packaging','other')),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  poop_score smallint check (poop_score between 1 and 10),
  heuristics_violated text[],
  roast_text text,
  fix_suggestion text,
  ai_confidence real check (ai_confidence between 0 and 1),
  vote_score integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists submissions_status_created_idx
  on public.submissions (status, created_at desc);
create index if not exists submissions_category_idx
  on public.submissions (category);
create index if not exists submissions_vote_score_idx
  on public.submissions (vote_score desc);

-- ============================================================
-- votes
-- ============================================================
create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  submission_id uuid not null references public.submissions(id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  unique (user_id, submission_id)
);

-- Vote trigger keeps submissions.vote_score in sync
create or replace function public.handle_vote_change()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update public.submissions
      set vote_score = vote_score + new.value
      where id = new.submission_id;
  elsif tg_op = 'UPDATE' then
    update public.submissions
      set vote_score = vote_score + (new.value - old.value)
      where id = new.submission_id;
  elsif tg_op = 'DELETE' then
    update public.submissions
      set vote_score = vote_score - old.value
      where id = old.submission_id;
  end if;
  return null;
end;
$$;

drop trigger if exists votes_score_sync on public.votes;
create trigger votes_score_sync
  after insert or update or delete on public.votes
  for each row execute function public.handle_vote_change();

-- ============================================================
-- comments
-- ============================================================
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  submission_id uuid not null references public.submissions(id) on delete cascade,
  body text not null check (length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists comments_submission_idx
  on public.comments (submission_id, created_at);

-- ============================================================
-- flags
-- ============================================================
create table if not exists public.flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  submission_id uuid not null references public.submissions(id) on delete cascade,
  reason text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, submission_id)
);

-- ============================================================
-- awards
-- ============================================================
create table if not exists public.awards (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  trophy_type text not null,
  period_type text not null check (period_type in ('weekly','monthly','alltime')),
  period_label text not null,
  created_at timestamptz not null default now(),
  unique (submission_id, trophy_type, period_label)
);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.users enable row level security;
alter table public.submissions enable row level security;
alter table public.votes enable row level security;
alter table public.comments enable row level security;
alter table public.flags enable row level security;
alter table public.awards enable row level security;

-- users: anyone can read, only self can update
drop policy if exists users_read on public.users;
create policy users_read on public.users for select using (true);
drop policy if exists users_update_self on public.users;
create policy users_update_self on public.users for update using (auth.uid() = id);

-- submissions: read approved publicly; owner can read own; moderators read all
drop policy if exists submissions_public_read on public.submissions;
create policy submissions_public_read on public.submissions for select
  using (
    status = 'approved'
    or user_id = auth.uid()
    or exists (select 1 from public.users u where u.id = auth.uid() and u.is_moderator)
  );

drop policy if exists submissions_insert_self on public.submissions;
create policy submissions_insert_self on public.submissions for insert
  with check (auth.uid() = user_id);

drop policy if exists submissions_update_self_or_mod on public.submissions;
create policy submissions_update_self_or_mod on public.submissions for update
  using (
    auth.uid() = user_id
    or exists (select 1 from public.users u where u.id = auth.uid() and u.is_moderator)
  );

-- votes: read all, write own
drop policy if exists votes_read on public.votes;
create policy votes_read on public.votes for select using (true);
drop policy if exists votes_write_self on public.votes;
create policy votes_write_self on public.votes for insert with check (auth.uid() = user_id);
drop policy if exists votes_update_self on public.votes;
create policy votes_update_self on public.votes for update using (auth.uid() = user_id);
drop policy if exists votes_delete_self on public.votes;
create policy votes_delete_self on public.votes for delete using (auth.uid() = user_id);

-- comments: read all, write own
drop policy if exists comments_read on public.comments;
create policy comments_read on public.comments for select using (true);
drop policy if exists comments_write_self on public.comments;
create policy comments_write_self on public.comments for insert with check (auth.uid() = user_id);
drop policy if exists comments_delete_self on public.comments;
create policy comments_delete_self on public.comments for delete using (auth.uid() = user_id);

-- flags: write own; moderators read
drop policy if exists flags_write_self on public.flags;
create policy flags_write_self on public.flags for insert with check (auth.uid() = user_id);
drop policy if exists flags_mod_read on public.flags;
create policy flags_mod_read on public.flags for select
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.is_moderator));

-- awards: world readable
drop policy if exists awards_read on public.awards;
create policy awards_read on public.awards for select using (true);

-- ============================================================
-- Storage bucket
-- ============================================================
insert into storage.buckets (id, name, public)
values ('submissions', 'submissions', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "submissions_public_read" on storage.objects;
create policy "submissions_public_read" on storage.objects for select
  using (bucket_id = 'submissions');

drop policy if exists "submissions_upload_auth" on storage.objects;
create policy "submissions_upload_auth" on storage.objects for insert
  with check (bucket_id = 'submissions' and auth.role() = 'authenticated');

drop policy if exists "submissions_delete_self" on storage.objects;
create policy "submissions_delete_self" on storage.objects for delete
  using (bucket_id = 'submissions' and owner = auth.uid());
