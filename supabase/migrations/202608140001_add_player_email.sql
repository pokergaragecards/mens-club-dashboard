alter table public.players
  add column if not exists email text;

comment on column public.players.email is
  'Member contact email used for committee communications.';
