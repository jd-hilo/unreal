-- Add current_location, net_worth, and political_views to profiles table
alter table profiles
  add column if not exists current_location text,
  add column if not exists net_worth text,
  add column if not exists political_views text;

