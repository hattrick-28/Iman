# Architecture: Iman (a rebuild of Quranly's core features, plus an Islamic assistant)

Name: **Iman**. Brand from @imanditor: night sky, midnight sea, dawn light, white type, a mosque line mark. Albanian-first ("Për zemrën që kërkon Allahun"), with English second.
Date: 2026-10-26. Reads `recon.md` and `features.csv`. Schema: `schema.sql` (tested, 37 checks pass). Theme: `design/tokens.json` (17 contrast pairs, 0 failing).

## Stack

| layer | choice | why |
| --- | --- | --- |
| mobile app | Expo (React Native) + TypeScript, Expo Router | One codebase for iOS and Android; over-the-air fixes |
| styling | NativeWind (Tailwind for RN) fed by `design/tokens.json` | Tokens stay the single source for colour and type |
| local data | expo-sqlite: bundled `content.db` + an outbox for offline sessions | Reading and logging work with no signal |
| database | Supabase Postgres + pgvector | One database for app data and the assistant's library; you have Supabase connected |
| auth | Supabase Auth: email, Sign in with Apple, Google | Apple is required on iOS once any social login is offered |
| access rules | Row level security on every table; scores computed only in database functions | A client can never invent its own hasanat, streak or rank |
| payments | RevenueCat over App Store and Google Play billing | Digital subscriptions inside the app must use store billing, not Stripe |
| assistant model | Claude API (Sonnet for answers, Haiku for query rewriting and triage) via a Supabase Edge Function | The API key stays on the server; separate billing from your Claude Pro plan |
| embeddings | Voyage AI multilingual embeddings (1024 dims) | Anthropic's recommended embedding partner; test Albanian quality before launch |
| push | Expo Notifications: local for daily reminders, remote for streak-at-risk | Local reminders fire even offline |
| jobs | pg_cron + scheduled Edge Functions | No extra service |
| files | Supabase Storage (avatars), a CDN for recitation audio | |
| landing page | Next.js on Vercel (later, `/replica-launch`) | You have Vercel connected |
| errors | Sentry | Crashes in a reading app lose trust fast |

One database, one edge-function project, one app. No microservices.

## Content: where the Quran, translations, hadith and audio come from

None of this is taken from Quranly. Each item needs its licence read and recorded in `corpus_passages.licence` or the content build's manifest.

| content | source to evaluate | what the terms say | action |
| --- | --- | --- | --- |
| Arabic Quran text (Uthmani) | Tanzil, via alquran.cloud | Paid apps bundling the text offline don't need permission, but must acknowledge the source in the colophon and must not alter the text or mix it with non-Quranic material | Use it, credit Tanzil, never edit the text |
| Translations (Albanian: Sherif Ahmeti, Hasan Nahi, Feti Mehdiu; English) | Tanzil / alquran.cloud editions | Each keeps its translator attribution; commercial rights belong to the translator or publisher | Get written permission per translation you sell; until then, ship only those with permission |
| Word-by-word, transliteration, tajweed markup | Quran.com / Quran Foundation API, open datasets | Separate terms per dataset | Check each before use |
| Hadith (Arabic + English, grades) | fawazahmed0/hadith-api (Unlicense); sunnah.com API (key required, commercial terms unstated) | The open dataset is permissive, but who assigned its grades must be checked per collection | Start with the open dataset; record the grader per hadith; ask sunnah.com before using theirs |
| Albanian hadith | Few digital Albanian collections exist | — | Show Arabic + English, plus an Albanian rendering clearly labelled "machine translation, not an official translation" |
| Recitation audio | alquran.cloud / EveryAyah CDN | Can be bundled commercially, but reciters keep copyright and may ask for removal | Cache per verse; keep a removal path |
| Fonts | Amiri Quran (OFL); KFGQPC Uthmanic (check terms) | | |

The content build is a script that produces `content.db` (text, translations, word data, page and juz maps, letter counts) and seeds `ayah_meta` (6236 rows) and `corpus_passages`. Hasanat uses letters × 10. Scholars differ on whether a "harf" means a letter or a word, so document the counting method and keep hasanat off by default.

## Theme (from the @imanditor brand)

| token | value | use |
| --- | --- | --- |
| bg | #0B0D17 night | screens |
| surface / surface-raised | #111A26 / #152531 midnight sea | cards, sheets |
| glow | #1F365C ocean glow | Ayah of the Day, the assistant's header, gradients to bg |
| text / text-muted | #F5F3EE / #A3A9B2 | |
| primary + on-primary | #F5F3EE on #0B0D17 | white pill buttons, like the brand's white type |
| accent | #CBA68B dawn | streak, goal progress, highlights |
| link | #8FB3DC | references, links |
| type | Oswald (tall condensed caps) for headlines, Cormorant SC (serif small caps) for captions, Inter for body, Amiri Quran for Arabic | matches the brand's posters; all are open-licence fonts |

Dark is the default, because the brand is dark. A light theme comes in `/replica-design`.

## The Islamic assistant ("Pyet Imanin" / "Ask Iman")

What it does: the user describes any problem or question, and Iman answers with guidance drawn only from the Quran and accepted hadith, citing each source.

**How the references stay correct**
1. Retrieval first. The question is rewritten into Arabic and English search queries (Haiku), embedded, and matched against `corpus_passages` with `match_passages()`. That combines meaning-based and exact-word search over the Quran and hadith graded sahih or hasan only. Weak and fabricated hadith are never retrieved.
2. The model sees only those passages, each labelled P1…P12, and must cite them as [P3]. It is told not to quote from memory and not to cite anything outside the list.
3. The server maps each [P#] back to a passage id with `keep_valid_citations()`. Anything not retrieved is dropped, and if a claim loses its only citation, the answer is regenerated once and then shown with "no source found" for that point.
4. The app never displays scripture the model typed. Each citation card shows the stored Arabic and stored translation from the database, plus the reference (e.g. Al-Baqarah 2:255, Sahih Muslim 2564), the grade and who graded it.
5. Each answer has a "Report a wrong reference" button (`chat_reports`), and you review reports weekly.

**Rules in the system prompt**
- Answer only from the given passages. If they don't cover the question, say so plainly instead of filling the gap.
- Rulings (halal/haram on specific cases, divorce, inheritance, finance, worship details): show the relevant texts, note that scholars may differ, and recommend asking a qualified local scholar or imam. Never issue a fatwa. Marked `refer_scholar`.
- Crisis (self-harm, abuse, danger): respond with care first, urge the person to contact emergency services or a crisis line for their country (from a maintained list in config), and only then offer comforting verses. Marked `crisis`.
- Out of scope (unrelated tasks, attacks on other faiths or groups, declaring people disbelievers): decline kindly and steer back. Stay respectful of other faiths.
- Reply in the user's language, Albanian by default. Gentle, humble tone, and no claims about anyone's reward or fate.

**Limits and cost:** 3 questions a day free, 50 a day premium (`take_chat_quota()`). Every message records token counts so you can see the real cost per user. The assistant is the natural premium hook.

**Before launch:** build a test set of about 50 real questions in Albanian with the references a scholar expects, and have a qualified person review the answers. This is the step that makes "correct references" true in practice.

**New screens:** S47 Assistant chat (from a new Home card and the Explore tab), S48 Citation sheet (Arabic, translation, grade, "open in reader" for Quran verses), S49 Past conversations.

## Schema

Tables: 30. Access rules: row level security on all of them. Scores, streaks, rankings and assistant messages are written only by security-definer functions or the edge function.

Content: `ayah_meta`, `corpus_passages`. People: `profiles`, `preferences`. Reading: `reading_positions` (daily, free and per-challenge), `reading_sessions`, `daily_progress`, `streaks`, `streak_pauses`. Saved: `bookmark_lists`, `bookmarks`, `favourites`, `notes`. Social: `verse_likes`, `verse_like_counts`, `friendships`, `invites`, `leaderboard_optins`, `leaderboard_daily`, `presence`. Challenges: `challenges`, `challenge_participants`. Other: `reminders`, `push_tokens`, `entitlements`, `webhook_events`. Assistant: `chat_threads`, `chat_messages`, `chat_usage`, `chat_reports`.

**Decisions made here (original rules unconfirmed):**
- A streak day counts when the day's goal is met in the user's local time. One freeze a week is banked automatically (up to 2), and paused days neither break nor extend a streak.
- Free reading and challenge reading count toward the day's goal, but only the daily track moves the daily position.
- The leaderboard ranks by verses, not hasanat, so nobody publicly ranks reward. Days run on UTC, like the original. Only opted-in users appear, with their name and photo shared only if they choose.
- Sessions faster than 25 letters a second are kept but flagged and left off the leaderboard.
- Invite rewards are not hasanat. If you offer any, make them app perks such as premium days.

See `schema.sql` for the full SQL.

## API

Most calls go straight to Supabase from the app with RLS. Anything that computes a score is a database function, and anything with a secret is an Edge Function.

| method / call | does | who | input | output | flow |
| --- | --- | --- | --- | --- | --- |
| auth.signUp / signInWithOAuth (apple, google) / signIn | account | anyone | email+password or provider | session | F01 |
| trigger handle_new_user | creates profile + preferences | system | | | F01 |
| update preferences | goal, streak goal, script, translations (max 2), reciter, toggles | owner | fields | row | F01, F05 |
| rpc log_reading | one "I'm Done": computes verses, pages, time, hasanat; moves position; updates day, goal, streak, leaderboard, challenge; idempotent on client_id | owner | client_id, kind, challenge_id, start, end, started_at, ended_at, tz | day totals | F02, F15, F16 |
| rpc streak_status | streak shown today, freezes left, at-risk flag | owner | today | row | F03 |
| insert streak_pauses | pause a streak (max 30 days) | owner | from, until | row | F03 |
| select daily_progress | Today / Week / All, weekday strip, calendar | owner | date range | rows | F12 |
| update reading_positions | pencil on the goal card, "start from verse" | owner | ayah_key | row | F06, F15 |
| CRUD bookmark_lists, bookmarks, favourites, notes (3 free) | saved content | owner | | | F07, F12 |
| insert / delete verse_likes; select verse_like_counts | like a verse, show global count | owner / anyone | ayah_key | | F07 |
| select challenges; rpc join_challenge | list and join | owner | challenge_id | | F08, F16 |
| upsert leaderboard_optins / delete | consent, sharing toggles, revoke | owner | share_name, share_photo, country | | F09 |
| rpc leaderboard | friends / global / region for a UTC day, plus your rank | owner | scope, date | ranked rows | F09 |
| insert invites; rpc accept_invite; rpc remove_friend | friends by link or QR | owner | code | | F09 |
| rpc heartbeat (every 60 s while reading); rpc community_stats | people reading now, verses today | owner / anyone | | counts | Home |
| CRUD reminders; upsert push_tokens | reminder times, device token | owner | | | F10 |
| rpc reset_stats | wipes reading history, keeps saved content | owner | | | F11 |
| POST /functions/v1/delete-account | deletes the auth user (cascades everything) and avatar | owner | | 204 | F11 |
| POST /functions/v1/ask | the assistant (below) | signed-in owner | thread_id?, message, lang | event stream | F18 |
| insert chat_threads; select chat_messages | history | owner | | | F18 |
| insert chat_reports | report a wrong reference or weak answer | owner | message_id, reason, detail | | F18 |
| RevenueCat SDK (client) | purchase, restore, trial | owner | | entitlement | F04 |

**/functions/v1/ask, step by step:** verify the JWT → `take_chat_quota` (429 if spent) → triage with Haiku (crisis / ruling / out of scope / normal) → rewrite the query into Arabic and English → embed → `match_passages` (k=12, sahih and hasan only) → Sonnet with the rules and passages, streamed → `keep_valid_citations` → save the user and assistant messages with citation ids, safety label and token counts → stream to the app: `meta` (thread id), `delta` (text), `citations` (cards from the database), `done` (safety label).

**Webhooks in:** RevenueCat → `/functions/v1/revenuecat` (shared-secret header; event id saved in `webhook_events` first, so a repeat delivery is ignored; updates `entitlements`).
**Webhooks out:** none.

**Jobs:**
- `presence-cleanup` (pg_cron, every 5 min): delete presence older than 10 minutes.
- `streak-risk-push` (Edge Function, hourly): users whose local time is their streak-risk reminder time, who haven't met today's goal and have a live streak, get one push.
- `chat-reports-digest` (weekly): email open reports to you.
- `content-build` (manual script): builds `content.db`, seeds `ayah_meta` and `corpus_passages`, and computes embeddings.

## The parts that bite

- **Time zones:** goals and streaks follow the user's local day (stored per session as `tz` and `local_date`), and the leaderboard follows UTC. Travel can make a day appear twice or be skipped. The streak replay handles both, and DST is handled by real IANA zones, never fixed offsets.
- **Offline and idempotency:** every "I'm Done" gets a `client_id` on the device and waits in the outbox. Retries are ignored by `unique (user_id, client_id)`. Late, out-of-order uploads replay the streak correctly, and the position follows the most recent reading, not the latest upload. Both are tested.
- **Races:** like counts update atomically, quota uses a conditional upsert, and the invite is single-use in one statement.
- **Cheating:** clients send only a verse range and times, and the server computes the rest. Too-fast sessions are flagged off the leaderboard.
- **Assistant accuracy:** retrieval quality in Albanian is the risk. Measure it on the 50-question test set; if Albanian embeddings are weak, the English and Arabic query rewrite carries the search.
- **Assistant cost:** daily caps plus token logging. Watch cost per premium user against the subscription price.
- **Religious sensitivity:** text never altered, translator credited, hadith grade and grader always shown, no fatwas, and a scholar's review before launch.
- **Store rules:** Sign in with Apple, account deletion in-app, restore purchases, store billing for subscriptions, and a privacy policy that covers chat history (users can delete threads).
- **GDPR:** deleting the account cascades every row, including chats. A data export can come later.
- **Search:** Arabic search needs normalisation (diacritics, alif forms). Do it in the content build with a stripped-text column.

## Build order (on your Pro plan, roughly a week each)

1. **Vertical slice:** sign up (S04) → Home with goal card and streak (S13) → reader with I'm Done (S16) → totals update. Tables: profiles, preferences, ayah_meta, reading_positions, reading_sessions, daily_progress, streaks. Calls: log_reading, streak_status. Content: Arabic text plus one licensed Albanian translation.
2. **Must-haves:** onboarding and goal setup (S01–S10), reader navigation and resume (S17, S18), offline outbox, reminders (S09, S37), settings and account, delete account (S35, S36, S40), paywall and restore with RevenueCat (S11, S12), Iman theme.
3. **Assistant v1:** content build for the corpus, `/ask`, chat and citation screens (S47–S49), quota, reports, then the 50-question review. This is Iman's main difference from the original.
4. **Should-haves:** bookmarks, notes, favourites, stats tabs, challenges, search, transliteration, tajweed, audio, topic collections, Mushaf view.
5. **Could-haves:** leaderboard and friends, verse likes, live counters, reading levels, extra themes.
6. **Fixes from `/replica-entrepreneur`**, once it has read the reviews.

Next step: `/replica-design`, which builds the components and screens on these tokens.
