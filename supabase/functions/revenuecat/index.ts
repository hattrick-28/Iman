// RevenueCat webhook → entitlements table. Set the same secret in RevenueCat's webhook
// "Authorization header" field and here: supabase secrets set REVENUECAT_WEBHOOK_SECRET=...
// App user IDs are Supabase user ids (the app calls Purchases.logIn(user.id)).
import { createClient } from 'npm:@supabase/supabase-js@2';

const ACTIVE = new Set(['INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE', 'UNCANCELLATION', 'NON_RENEWING_PURCHASE', 'SUBSCRIPTION_EXTENDED', 'TEMPORARY_ENTITLEMENT_GRANT']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  const secret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');
  if (!secret || req.headers.get('Authorization') !== `Bearer ${secret}`) return new Response('unauthorized', { status: 401 });

  let payload: { event?: Record<string, unknown> };
  try { payload = await req.json(); } catch { return new Response('bad json', { status: 400 }); }
  const e = payload.event ?? {};
  const id = String(e.id ?? '');
  const userId = String(e.app_user_id ?? '');
  const type = String(e.type ?? '');
  if (!id) return new Response('no id', { status: 400 });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // Idempotency: a repeated delivery hits the primary key and is ignored.
  const { error: dup } = await admin.from('webhook_events').insert({ id, source: 'revenuecat', payload });
  if (dup) return new Response('duplicate', { status: 200 });

  // Tips (consumables) need no entitlement; anonymous RevenueCat ids can't be matched to a user.
  const products = (e.entitlement_ids as string[] | undefined) ?? [];
  if (!UUID.test(userId) || (type === 'NON_RENEWING_PURCHASE' && !products.includes('premium'))) return new Response('ok');

  const expires = typeof e.expiration_at_ms === 'number' ? new Date(e.expiration_at_ms).toISOString() : null;
  const store = e.store === 'PLAY_STORE' ? 'play_store' : e.store === 'APP_STORE' ? 'app_store' : 'promo';
  let status: string | null = null;
  if (ACTIVE.has(type)) status = e.period_type === 'TRIAL' ? 'trial' : 'active';
  else if (type === 'BILLING_ISSUE') status = 'grace';
  else if (type === 'EXPIRATION') status = 'expired';
  else if (type === 'CANCELLATION') status = 'active'; // still active until expiration_at
  if (!status) return new Response('ignored');

  const { error } = await admin.from('entitlements').upsert({
    user_id: userId, product_id: String(e.product_id ?? 'iman_premium_monthly'), status, store, expires_at: expires, updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error('entitlement upsert failed', error.message);
    return new Response('error', { status: 500 });
  }
  return new Response('ok');
});
