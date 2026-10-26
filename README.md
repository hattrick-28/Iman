# Iman · Kur'an çdo ditë

Expo (React Native) app for iOS and Android: daily Quran habit, streaks, reminders, challenges,
leaderboard, and "Pyet Imanin", an assistant that answers only from the Quran and sahih/hasan hadith
with server-checked references. Premium 4,99 €/month, optional team tips (10/20/50 €), and a
donations screen for people in need (switched off until a registered charity is set up).

```
src/app/            screens (Expo Router)          supabase/migrations/   database (run in order)
src/lib/            store, sync, streak, quran     supabase/functions/    ask, delete-account, revenuecat
src/components/     UI kit, icons, sheet           scripts/               content build, corpus import
assets/quran/       bundled Arabic + Albanian text
```

## 1. Database (Supabase project `nhwntiaueadwzwzjrlxo`)

In Supabase → SQL Editor, run the two files in `supabase/migrations/` in order
(`…0001_iman_schema.sql`, then `…0002_seed.sql`). Skip anything you already ran:
the schema file is the same one you may have pasted before, plus service-role grants at the end.

Auth → Providers → Email: on. Auth → URL Configuration → Site URL: `https://iman-one-delta.vercel.app`.

## 2. Server functions

```bash
npx supabase login
npx supabase link --project-ref nhwntiaueadwzwzjrlxo
npx supabase functions deploy ask delete-account revenuecat
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-... VOYAGE_API_KEY=pa-... REVENUECAT_WEBHOOK_SECRET=<long random string>
```

The Claude API (console.anthropic.com) and Voyage AI are billed per use, separately from any Claude plan.
`ask` caps usage at 3 questions/day free and 50/day premium; every answer stores its token counts.

## 3. Assistant library (once)

See the header of `scripts/ingest-corpus.mjs` for the exact commands. It loads 6 236 verses
(Arabic + Sherif Ahmeti) and ~34 000 hadith from Bukhari, Muslim, Abu Dawud, Tirmidhi, Nasa'i and
Ibn Majah (Arabic + English), embeds ~37 000 passages, and records each hadith's grade. Only sahih
and hasan hadith are ever used as evidence (3 165 da'if and 67 fabricated are stored but excluded).
It can resume with `--from N`.

## 4. Payments (RevenueCat)

1. App Store Connect / Play Console: auto-renewing subscription `iman_premium_monthly` (4,99 €),
   consumables `iman_tip_10`, `iman_tip_20`, `iman_tip_50`.
2. RevenueCat: entitlement `premium` on the subscription, a current offering with a monthly package,
   webhook → `https://nhwntiaueadwzwzjrlxo.supabase.co/functions/v1/revenuecat`,
   Authorization header `Bearer <REVENUECAT_WEBHOOK_SECRET>`.
3. Put the public SDK keys in `.env` (copy `.env.example`): `EXPO_PUBLIC_RC_IOS_KEY`, `EXPO_PUBLIC_RC_ANDROID_KEY`.

Donations for people in need are collected outside the app (App Store guideline 3.2.2(iv)).
When a registered charity is ready, give it a donation page and set
`EXPO_PUBLIC_DONATIONS_ENABLED=true` and `EXPO_PUBLIC_DONATION_URL=...`.

## 5. Run and build

```bash
npm install
npx expo start                 # web preview works; purchases and reminders need a device build
npx eas-cli@latest login
npx eas-cli@latest build --profile development --platform ios   # or android
npx eas-cli@latest build --profile production --platform all
npx eas-cli@latest submit --platform all
```

Bundle id / package: `app.iman.kuran` (change in `app.json` before the first store build if you prefer another).

## Checks

```bash
npx tsc --noEmit                                                     # app types
node --experimental-strip-types scripts/…                            # see supabase/functions/_shared/logic.ts for tested logic
python3 scripts/build-content.py <quran-api> assets/quran <seed.sql>  # rebuild bundled text
```

## Before launch

- **Translation rights:** written permission for Sherif Ahmeti's and Hassan Nahi's translations for a paid app.
- **Scholar review:** have a qualified person check ~50 real assistant answers and their references.
- **Support email and legal pages:** `src/lib/config.ts` and the website pages use dimalmaloku@gmail.com; change if you prefer a dedicated address.
- **Brand:** confirm you own or have permission to use the @imanditor brand; run name/trademark checks for "Iman" in the stores.
