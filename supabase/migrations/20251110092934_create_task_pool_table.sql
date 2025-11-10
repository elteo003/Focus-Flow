create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.task_pool (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  category text not null default 'other',
  completed boolean not null default false,
  position integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index task_pool_user_id_position_idx on public.task_pool (user_id, position);

create trigger task_pool_set_updated_at
before update on public.task_pool
for each row execute function public.set_updated_at();

