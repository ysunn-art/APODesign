-- Prevent users from voting on their own submissions (defense-in-depth).
-- The API route enforces this too, but RLS guarantees it for any direct
-- client write as well.

drop policy if exists votes_write_self on public.votes;
create policy votes_write_self on public.votes for insert
  with check (
    auth.uid() = user_id
    and not exists (
      select 1 from public.submissions s
      where s.id = submission_id and s.user_id = auth.uid()
    )
  );

drop policy if exists votes_update_self on public.votes;
create policy votes_update_self on public.votes for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and not exists (
      select 1 from public.submissions s
      where s.id = submission_id and s.user_id = auth.uid()
    )
  );
