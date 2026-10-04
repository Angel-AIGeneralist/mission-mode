alter table public.witnesses enable row level security;
alter table public.witness_children enable row level security;

create policy witnesses_select_own
  on public.witnesses
  for select
  to authenticated
  using (public.owns_profile(profile_id));

create policy witnesses_insert_own
  on public.witnesses
  for insert
  to authenticated
  with check (public.owns_profile(profile_id));

create policy witnesses_update_own
  on public.witnesses
  for update
  to authenticated
  using (public.owns_profile(profile_id))
  with check (public.owns_profile(profile_id));

create policy witness_children_select_own
  on public.witness_children
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.witnesses
      where witnesses.id = witness_children.witness_id
        and public.owns_profile(witnesses.profile_id)
    )
  );

create policy witness_children_insert_own
  on public.witness_children
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.witnesses
      join public.children on children.id = witness_children.child_id
      where witnesses.id = witness_children.witness_id
        and witnesses.profile_id = children.profile_id
        and public.owns_profile(witnesses.profile_id)
    )
  );
