// Public configuration. Everything here is safe to ship inside the app.
// Secrets (Anthropic, Voyage, RevenueCat webhook secret, Supabase service key) live only
// in Supabase Edge Function secrets, never here.
const env = process.env;

export const CONFIG = {
  supabaseUrl: env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://nhwntiaueadwzwzjrlxo.supabase.co',
  supabaseKey: env.EXPO_PUBLIC_SUPABASE_KEY ?? 'sb_publishable_FWtKvPHKzIMvVFbuNesyzA__4X0K_BE',

  // RevenueCat public SDK keys (Project settings → API keys). Empty = purchases switched off.
  revenueCatIos: env.EXPO_PUBLIC_RC_IOS_KEY ?? '',
  revenueCatAndroid: env.EXPO_PUBLIC_RC_ANDROID_KEY ?? '',
  premiumEntitlement: 'premium',
  premiumPriceLabel: '4,99 €',
  // One-time tips to the team. Create these as consumable products in both stores.
  teamTipProducts: [
    { id: 'iman_tip_10', label: '10 €' },
    { id: 'iman_tip_20', label: '20 €' },
    { id: 'iman_tip_50', label: '50 €' },
  ],

  // Donations for people in need are collected outside the app (App Store 3.2.2(iv)).
  // Switch on once a registered organisation receives the money.
  donationsEnabled: env.EXPO_PUBLIC_DONATIONS_ENABLED === 'true',
  donationUrl: env.EXPO_PUBLIC_DONATION_URL ?? 'https://iman-one-delta.vercel.app/dhuro',
  donationAmounts: [10, 20, 50],

  websiteUrl: 'https://iman-one-delta.vercel.app',
  privacyUrl: 'https://iman-one-delta.vercel.app/privatesia',
  termsUrl: 'https://iman-one-delta.vercel.app/kushtet',
  supportEmail: 'dimalmaloku@gmail.com',

  freeNotesLimit: 3,
  freeQuestionsPerDay: 3,
} as const;
