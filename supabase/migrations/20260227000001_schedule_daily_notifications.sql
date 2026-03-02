-- Enable required extensions (may already be enabled on your Supabase project)
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Schedule the send-daily-notifications edge function to run every 5 minutes.
-- The function internally checks which users are at 8:00–8:05am in their timezone.
select
  cron.schedule(
    'send-daily-notifications',
    '*/5 * * * *',
    $$
    select
      net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/send-daily-notifications',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
        ),
        body := '{}'::jsonb
      )
    $$
  );
