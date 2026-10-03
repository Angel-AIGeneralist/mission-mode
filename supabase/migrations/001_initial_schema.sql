-- now() is stable, and Postgres only allows immutable expressions in CHECK
-- constraints. This wrapper keeps the birth-year bounds enforceable at write time.
create or replace function public.child_birth_year_in_range(birth_year integer)
returns boolean
language plpgsql
immutable
as $$
begin
  return birth_year between (extract(year from now())::int - 10)
                        and (extract(year from now())::int - 4);
end;
$$;

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users (id),
  parent_name text,
  language text,
  timezone text default 'Asia/Kolkata',
  send_time time default '07:30',
  whatsapp_status text default 'pending',
  created_at timestamptz default now()
);

create table public.children (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id),
  name text,
  birth_year int check (public.child_birth_year_in_range(birth_year)),
  pronouns text,
  language text,
  duration text,
  paused boolean default false,
  created_at timestamptz default now()
);

create table public.child_interests (
  child_id uuid references public.children (id),
  interest_code text,
  domain text,
  tier int check (tier in (1, 2, 3)),
  selection_order int,
  active boolean default true
);

create table public.child_materials (
  child_id uuid references public.children (id),
  material_code text,
  active boolean default true
);

create table public.missions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid references public.children (id),
  mission_date date,
  title text,
  narrative text,
  steps_json jsonb,
  safety_level text,
  status text default 'queued',
  model_version text,
  mechanic text,
  "interestIntegrationCheck" text,
  "grandparentMoment" text,
  fallback_used boolean default false,
  idempotency_key text unique,
  created_at timestamptz default now()
);

create unique index missions_active_unique
  on public.missions (child_id, mission_date)
  where status not in ('swapped', 'cancelled', 'closed');

create table public.mission_attempts (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid references public.missions (id),
  attempt_no int,
  validation_result text,
  failure_reason text,
  latency_ms int
);

create table public.message_events (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid references public.missions (id),
  recipient_type text,
  provider_id text,
  direction text,
  type text,
  status text,
  occurred_at timestamptz
);

create unique index message_events_provider_direction_unique
  on public.message_events (provider_id, direction)
  where provider_id is not null;

create table public.voice_notes (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid references public.missions (id),
  storage_path text,
  duration_seconds int,
  transcript_status text default 'pending'
);

create table public.scores (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid references public.missions (id),
  specificity int,
  length int,
  discovery int,
  enthusiasm int,
  overall_score int,
  parent_summary text,
  transcript_excerpt text
);

create table public.witnesses (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id),
  name text,
  relationship text,
  phone text,
  language text,
  frequency text default 'weekly',
  verified_at timestamptz
);

create table public.witness_children (
  witness_id uuid references public.witnesses (id),
  child_id uuid references public.children (id),
  unique (witness_id, child_id)
);

create table public.witness_reactions (
  id uuid primary key default gen_random_uuid(),
  witness_id uuid references public.witnesses (id),
  mission_id uuid references public.missions (id),
  text text,
  storage_path text,
  created_at timestamptz default now()
);

create table public.orb_transactions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid references public.children (id),
  mission_id uuid references public.missions (id),
  amount int,
  reason text,
  idempotency_key text unique
);

create table public.story_chapters (
  id uuid primary key default gen_random_uuid(),
  child_id uuid references public.children (id),
  chapter_no int,
  title text,
  text text,
  unlocked_at timestamptz,
  model_version text
);

create table public.operator_actions (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id),
  target_type text,
  target_id uuid,
  action text,
  reason text,
  created_at timestamptz default now()
);

-- True when this profile id is the signed-in user, or it belongs to that user
-- through profiles.auth_user_id. profiles.id is compared with auth.uid() directly;
-- other tables pass their profile_id or the profile_id reached through a foreign key.
create or replace function public.owns_profile(target_profile_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select target_profile_id is not null
    and (
      target_profile_id = (select auth.uid())
      or exists (
        select 1
        from public.profiles
        where profiles.id = target_profile_id
          and profiles.auth_user_id = (select auth.uid())
      )
    );
$$;

alter table public.profiles enable row level security;
alter table public.children enable row level security;
alter table public.child_interests enable row level security;
alter table public.child_materials enable row level security;
alter table public.missions enable row level security;
alter table public.scores enable row level security;
alter table public.voice_notes enable row level security;
alter table public.orb_transactions enable row level security;
alter table public.story_chapters enable row level security;

create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()) or auth_user_id = (select auth.uid()));

create policy profiles_insert_own
  on public.profiles
  for insert
  to authenticated
  with check (id = (select auth.uid()) or auth_user_id = (select auth.uid()));

create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()) or auth_user_id = (select auth.uid()))
  with check (id = (select auth.uid()) or auth_user_id = (select auth.uid()));

create policy children_select_own
  on public.children
  for select
  to authenticated
  using (public.owns_profile(profile_id));

create policy children_insert_own
  on public.children
  for insert
  to authenticated
  with check (public.owns_profile(profile_id));

create policy children_update_own
  on public.children
  for update
  to authenticated
  using (public.owns_profile(profile_id))
  with check (public.owns_profile(profile_id));

create policy child_interests_select_own
  on public.child_interests
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.children
      where children.id = child_interests.child_id
        and public.owns_profile(children.profile_id)
    )
  );

create policy child_interests_insert_own
  on public.child_interests
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.children
      where children.id = child_interests.child_id
        and public.owns_profile(children.profile_id)
    )
  );

create policy child_interests_update_own
  on public.child_interests
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.children
      where children.id = child_interests.child_id
        and public.owns_profile(children.profile_id)
    )
  )
  with check (
    exists (
      select 1
      from public.children
      where children.id = child_interests.child_id
        and public.owns_profile(children.profile_id)
    )
  );

create policy child_materials_select_own
  on public.child_materials
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.children
      where children.id = child_materials.child_id
        and public.owns_profile(children.profile_id)
    )
  );

create policy child_materials_insert_own
  on public.child_materials
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.children
      where children.id = child_materials.child_id
        and public.owns_profile(children.profile_id)
    )
  );

create policy child_materials_update_own
  on public.child_materials
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.children
      where children.id = child_materials.child_id
        and public.owns_profile(children.profile_id)
    )
  )
  with check (
    exists (
      select 1
      from public.children
      where children.id = child_materials.child_id
        and public.owns_profile(children.profile_id)
    )
  );

create policy missions_select_own
  on public.missions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.children
      where children.id = missions.child_id
        and public.owns_profile(children.profile_id)
    )
  );

create policy missions_insert_own
  on public.missions
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.children
      where children.id = missions.child_id
        and public.owns_profile(children.profile_id)
    )
  );

create policy missions_update_own
  on public.missions
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.children
      where children.id = missions.child_id
        and public.owns_profile(children.profile_id)
    )
  )
  with check (
    exists (
      select 1
      from public.children
      where children.id = missions.child_id
        and public.owns_profile(children.profile_id)
    )
  );

create policy scores_select_own
  on public.scores
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.missions
      join public.children on children.id = missions.child_id
      where missions.id = scores.mission_id
        and public.owns_profile(children.profile_id)
    )
  );

create policy scores_insert_own
  on public.scores
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.missions
      join public.children on children.id = missions.child_id
      where missions.id = scores.mission_id
        and public.owns_profile(children.profile_id)
    )
  );

create policy scores_update_own
  on public.scores
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.missions
      join public.children on children.id = missions.child_id
      where missions.id = scores.mission_id
        and public.owns_profile(children.profile_id)
    )
  )
  with check (
    exists (
      select 1
      from public.missions
      join public.children on children.id = missions.child_id
      where missions.id = scores.mission_id
        and public.owns_profile(children.profile_id)
    )
  );

create policy voice_notes_select_own
  on public.voice_notes
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.missions
      join public.children on children.id = missions.child_id
      where missions.id = voice_notes.mission_id
        and public.owns_profile(children.profile_id)
    )
  );

create policy voice_notes_insert_own
  on public.voice_notes
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.missions
      join public.children on children.id = missions.child_id
      where missions.id = voice_notes.mission_id
        and public.owns_profile(children.profile_id)
    )
  );

create policy voice_notes_update_own
  on public.voice_notes
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.missions
      join public.children on children.id = missions.child_id
      where missions.id = voice_notes.mission_id
        and public.owns_profile(children.profile_id)
    )
  )
  with check (
    exists (
      select 1
      from public.missions
      join public.children on children.id = missions.child_id
      where missions.id = voice_notes.mission_id
        and public.owns_profile(children.profile_id)
    )
  );

create policy orb_transactions_select_own
  on public.orb_transactions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.children
      where children.id = orb_transactions.child_id
        and public.owns_profile(children.profile_id)
    )
    or exists (
      select 1
      from public.missions
      join public.children on children.id = missions.child_id
      where missions.id = orb_transactions.mission_id
        and public.owns_profile(children.profile_id)
    )
  );

create policy orb_transactions_insert_own
  on public.orb_transactions
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.children
      where children.id = orb_transactions.child_id
        and public.owns_profile(children.profile_id)
    )
    or exists (
      select 1
      from public.missions
      join public.children on children.id = missions.child_id
      where missions.id = orb_transactions.mission_id
        and public.owns_profile(children.profile_id)
    )
  );

create policy orb_transactions_update_own
  on public.orb_transactions
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.children
      where children.id = orb_transactions.child_id
        and public.owns_profile(children.profile_id)
    )
    or exists (
      select 1
      from public.missions
      join public.children on children.id = missions.child_id
      where missions.id = orb_transactions.mission_id
        and public.owns_profile(children.profile_id)
    )
  )
  with check (
    exists (
      select 1
      from public.children
      where children.id = orb_transactions.child_id
        and public.owns_profile(children.profile_id)
    )
    or exists (
      select 1
      from public.missions
      join public.children on children.id = missions.child_id
      where missions.id = orb_transactions.mission_id
        and public.owns_profile(children.profile_id)
    )
  );

create policy story_chapters_select_own
  on public.story_chapters
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.children
      where children.id = story_chapters.child_id
        and public.owns_profile(children.profile_id)
    )
  );

create policy story_chapters_insert_own
  on public.story_chapters
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.children
      where children.id = story_chapters.child_id
        and public.owns_profile(children.profile_id)
    )
  );

create policy story_chapters_update_own
  on public.story_chapters
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.children
      where children.id = story_chapters.child_id
        and public.owns_profile(children.profile_id)
    )
  )
  with check (
    exists (
      select 1
      from public.children
      where children.id = story_chapters.child_id
        and public.owns_profile(children.profile_id)
    )
  );
