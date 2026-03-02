import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushMessage {
  to: string;
  title: string;
  body: string;
  sound: string;
  data?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  // Allow both scheduled (POST with no auth) and manual invocations
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Fetch all users who have a push token and have completed onboarding
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, push_token, push_token_tz')
    .not('push_token', 'is', null)
    .eq('onboarding_complete', true);

  if (error) {
    console.error('Failed to fetch profiles:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!profiles || profiles.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const now = new Date();
  const messages: PushMessage[] = [];

  for (const profile of profiles) {
    if (!profile.push_token) continue;

    const timezone = profile.push_token_tz ?? 'America/New_York';

    // Check if it is currently 8:00–8:05am in the user's timezone
    const localTimeStr = now.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const [hourStr, minuteStr] = localTimeStr.split(':');
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);

    const isEightAm = hour === 8 && minute < 5;
    if (!isEightAm) continue;

    messages.push({
      to: profile.push_token,
      title: 'Good morning ☀️',
      body: 'Complete your tasks for today — your dream self is waiting.',
      sound: 'default',
      data: { screen: 'tasks' },
    });
  }

  if (messages.length === 0) {
    return new Response(JSON.stringify({ sent: 0, reason: 'No users at 8am right now' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Send in batches of 100 (Expo limit)
  const batchSize = 100;
  let totalSent = 0;

  for (let i = 0; i < messages.length; i += batchSize) {
    const batch = messages.slice(i, i + batchSize);
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(batch),
    });

    if (response.ok) {
      totalSent += batch.length;
    } else {
      const errText = await response.text();
      console.error(`Expo push batch failed: ${errText}`);
    }
  }

  return new Response(JSON.stringify({ sent: totalSent }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
