// Deletes the signed-in user. Every table cascades from auth.users, so all their data goes too.
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return new Response('method', { status: 405, headers: cors });

  const url = Deno.env.get('SUPABASE_URL')!;
  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data } = await userClient.auth.getUser();
  if (!data.user) return new Response('auth', { status: 401, headers: cors });

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: profile } = await admin.from('profiles').select('avatar_path').eq('id', data.user.id).maybeSingle();
  if (profile?.avatar_path) await admin.storage.from('avatars').remove([profile.avatar_path]);

  const { error } = await admin.auth.admin.deleteUser(data.user.id);
  if (error) {
    console.error('delete failed', error.message);
    return new Response('error', { status: 500, headers: cors });
  }
  return new Response(null, { status: 204, headers: cors });
});
