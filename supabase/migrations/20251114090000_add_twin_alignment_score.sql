-- Add twin_alignment_score column to what_if for storing Twin Alignment percentage (0-100)
alter table what_if
  add column if not exists twin_alignment_score numeric;


