-- Add biometrics column to what_if table for storing AI life change data
alter table what_if
  add column if not exists biometrics jsonb default '{}'::jsonb;












