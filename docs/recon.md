# Recon map: Quranly (iOS and Android)

Scope: the habit-tracking core loop: reader, daily goal, streaks, reminders, challenges, light social, paywall. Not the Quran content itself.
For: a product to sell, under a new name and brand.
Date: 2026-10-26

## How this was built, and what it cannot tell you

Built from public sources plus 20 screenshots the user took of their own account (version 3.0.76, free tier). The screenshots are in `replica/screens/` as reference only: they show other users' names on the leaderboard and Quranly's art, so they never ship. Screens not in the screenshots (onboarding, paywall, calendar, streak overlays) still come from a third-party gallery, described in words.

Rules kept: no logins, no scraping, no app code or network calls read. Quranly's name, logo, illustrations, copy, scholar endorsements and testimonials are never reused.

Not Quranly (surfaced by search, excluded): Quranicly (id6749783580, $6.99/month, SheikhBot AI) and IslamEncyclo (hasanat and tasbeeh) are different apps by different developers.

## Sources

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | screen gallery (about 131 screens, many behind a paywall) | https://screensdesign.com/apps/quran-by-quranly/?vs=326143 | Main source for screens and flows. Third party. |
| 2 | iOS app description (paraphrased via aggregator) | https://apps.appfollow.io/ios/quranly/1559233786?country=nl | Habit app; tracks verses, pages, time, hasanat; adapts targets to performance. No ratings or IAP data. |
| 3 | Android release notes, 3.0.31 and 3.0.53 | https://www.apkmirror.com/apk/quranly/quranly/quran-by-quranly-3-0-53-release/ | Changelog: word-by-word, tajweed, streaks, reminders, leaderboard, Ayah of the Day, community. Android 7.0+. |
| 4 | Android version list | https://www.apkmirror.com/apk/quranly/quranly/ | 3.0.54 uploaded 2025-12-08. About 118 MB. |
| 5 | Google Play pricing and stats | https://apppricinglab.com/app/google_play/com.quranly.app | 4.5 stars, 17.6K reviews, about 1M installs, rank #131 Books and Reference (top grossing) on 2026-03-10. No prices on this page. |
| 6 | Paywall pricing | https://adapty.io/paywall-library/quranly/ | $4.99/month, $29.99/year, lifetime $79.99 and $199.99. Single source. |
| 7 | Directory entry | https://alternativeto.net/software/quranly/about | Freemium, $4 to $7 per month; cloud sync, reminders, offline, dark mode, goals, gamification. |
| 8 | Competitor reference: Quran.com reading streaks | https://quran.com/product-updates/quran-reading-streaks | Goal units: time, pages, verse range; streak by at least one verse a day; local-time-zone reset. |
| 9 | Scholarly note on counting hasanat | https://islamqa.info/en/answers/247769 | Counting the Quran's letters is permitted; keeping a tally of your own reward is disliked by some early scholars. |
| 10 | User's own account, 20 screenshots, 2026-10-26 | replica/screens/ | Home, reader, Reading tab, challenge reader, Explore, Gems, Challenges, Leaderboard, Search, Settings. Highest-confidence source. |

## Confirmed from the user's screenshots

- Five tabs, not four: Home, Reading, Explore, Leaderboard, Settings.
- Two separate reading positions. The daily-goal Quran (Home, "Read Quran") and the Reading tab, which the app labels a separate Quran so free reading never moves the daily position. Challenges have a third, their own progress (0 of 6236 verses).
- The reader shows one verse per card, with Arabic in tajweed colours, transliteration, and an optional translation. Each card has play, repeat-1, a heart with a global like count, bookmark, share and note. The bottom bar is Prev / I'm Done / Next, and Next previews the hasanat for the coming verse.
- Hasanat is letters x 10: the preview shows +1,070 for a long verse and +190 for the short opening verse. The original has a Hide Hasanat setting.
- A time-based level card in the reader (level 1 with a 2:00 countdown and total minutes), switchable with a Reading Levels toggle.
- Home: greeting, calendar icon, a counter with an orange badge (likely streak or coins, unconfirmed), weekday strip, goal card (10 verses per day, current surah and verse with edit pencil, juz progress), "You haven't read today" nudge, Today / Week / All metrics, surah chips, Ayah of the Day in the chosen translation, Challenges and Invite cards, Bonus Hasanat, and live community counters (people reading now, verses read in a day).
- The leaderboard ranks by hasanat, shows country flags and your global rank, and resets daily at UTC 00:00. It runs on UTC, not local time, unlike the personal goal.
- Translation: choose up to 2 at once from a long list of named translations.
- Search has a language selector and a Translation or Ayaat mode.
- Settings: alerts, notifications, hide hasanat, reciter, Quran script, daily goal, account fields, gender, font size, translation, vibration, reading themes, and toggles for translation, reading levels, leaderboard, transliteration, autoplay and auto-next.

Not reachable: quranly.app (blocked here) and the App Store page (fetch failed). No help center was found, so streak and grace-period rules are unconfirmed.

## Core loop

Read a little of the Quran every day, tap "I'm Done" to log it against a personal goal, and keep a streak going.

## Screens

| ID | screen | route / how to reach | purpose | key components | states seen |
| --- | --- | --- | --- | --- | --- |
| S01 | Permissions | first launch | tracking and notification prompts | system dialogs, pre-prompt card | pre-prompt, system |
| S02 | Welcome and language | after S01 | start and choose language | illustration, button, language list | English preselected |
| S03 | Feature carousel | after S02 | pitch the value | swipe pages, dots, Next | 5 to 6 pages |
| S04 | Sign up / sign in | after S03 | create account | social buttons, email form | form, sign-in link |
| S05 | Name and gender | onboarding | personalise | text field, choice, Skip | skippable |
| S06 | Daily goal | onboarding | set goal | selection grid | 1 verse preselected |
| S07 | Streak goal | onboarding | set target | selection grid | 3 days preselected |
| S08 | Reading setup | onboarding | font, size, reciter, translation | font cards, sliders, pickers | Arabic preview |
| S09 | Reminder time | onboarding | pick reminder | 4 time cards, button | morning, evening |
| S10 | Plan loading | after S09 | build the plan | illustration, progress bar | personal greeting |
| S11 | Paywall | after S10 | sell premium | hero, plan cards, social proof | several variants, slider, FAQ |
| S12 | Plan and checkout | from S11 | choose plan | plan modal, payment sheet | trial, success |
| S13 | Home / dashboard | tab Home | daily status | goal card, streak, metric cards, Read button, Ayah of the Day, surah chips | empty, filled |
| S14 | Streak explainers | overlay from S13 | explain streak, grace, pause | modals | first-run |
| S15 | Calendar | from S13 | history | month grid | locked until 7-day streak |
| S16 | Reader | Read button | read and log | Arabic text, translation, audio bar, progress, I'm Done | normal, point bonus variant |
| S17 | Reader navigation | top bar | jump to place | chapter, verse, page and juz pickers, verse grid | search |
| S18 | Chapter list and downloads | from S17 | find and download | list, download icons | delete confirm |
| S19 | Audio controls | reader | play and repeat | reciter, repeat, speed | settings |
| S20 | Tafsir | reader | commentary | modal | single source |
| S21 | Notes (modal) | reader | note on a verse | modal, counter | 0 of 3 used |
| S22 | Bookmarks | reader | save verses | list creator, toast | empty, filled |
| S23 | Share | reader | share verse | native sheet | |
| S24 | Chapter completion | end of chapter | show goal progress | summary card | |
| S25 | Celebration | after I'm Done | reward streak | weekly tracker, button | day 1 |
| S26 | Explore | tab Explore | discovery | 4 cards, topic grid, short lessons | |
| S27 | Search and results | from S26 | find verses | field, filters, badges | empty, results |
| S28 | Challenges | from S26 or S13 | structured reading | level cards, lists | complete, incomplete |
| S29 | Leaderboard | tab Leaderboard | rank | segmented control, top three | friends, global, region |
| S30 | Leaderboard consent | first open of S29 | privacy | toggles, country, Revoke | |
| S31 | Invite | from S29 | invite friends | link, QR, share | |
| S32 | Friends | from S29 | friend list | list | empty |
| S33 | Favourites | settings | saved surahs | swipe rows, confirm | |
| S34 | Notes list | settings | all notes | list | |
| S35 | Settings | tab Settings | hub | grouped list, search | |
| S36 | Account | from S35 | profile | avatar and crop, forms | |
| S37 | Notifications | from S35 | alerts | 4 toggles | Friends off |
| S38 | Preferences | from S35 | look and feel | vibration, theme grid, appearance | dark default |
| S39 | Help and FAQ | from S35 | support | search, accordion, Get Support | |
| S40 | Destructive confirms | from S36 | reset, delete, sign out | modals | |
| S41 | Splash | app launch | brand moment | logo on gradient | seen |
| S42 | Reading tab | tab Reading | free reading in a separate position | current surah, start-from-verse, Start Reading, Favourites and Bookmarks counts, Past Challenges | seen |
| S43 | Challenge reader | from a challenge | read toward a group challenge | challenge header, own progress, translation-only card | seen |
| S44 | Topic gems grid | Explore | themed verse collections | 2-column illustrated topic grid | seen, detail not seen |
| S45 | Mushaf page view | Explore | classic page layout | page renderer | card seen, view not seen |
| S46 | Translation picker | Settings | choose up to 2 | selectable list with order badges | seen |

## Flows

```
F01 First run to first read
    S41 -> S01 -> S02 -> S03 -> S04 -> S05 -> S06 -> S07 -> S08 -> S09 -> S10 -> S11 -> S13
    happy path taps: about 20 (estimate from a roughly 25-screen onboarding)
    edge: skip paywall, deny notifications, offline signup, social login cancelled

F02 Read and log the day
    S13 -> S16 -> (I'm Done) -> S24 -> S25 -> S13
    happy path taps: 3
    edge: goal not met, time zone change, midnight rollover, offline, duplicate submit

F03 Protect the streak
    S13 -> S14 (grace, pause, resume) -> S13
    edge: missed day, grace used, pause then resume, device clock change

F04 Subscribe
    S11 -> S12 -> success -> unlocked features
    edge: trial, cancel, restore purchases, price in local currency, lifetime

F05 Change goal or reading setup
    S35 -> S38 or S36 -> S13 ; translation: S35 -> S46 (up to 2)

F06 Find a place and read
    S16 -> S17 -> S18 -> S16 ; or S26 -> S27 -> S16

F07 Annotate a verse
    S16 -> S20 / S21 / S22 / S23

F08 Take a challenge
    S26 or S13 -> S28 -> S16 -> S28 (progress)

F09 Join the leaderboard
    S29 -> S30 (consent) -> S29 -> S31 -> S32
    edge: revoke consent, privacy of name and photo, country choice

F10 Manage reminders
    S35 -> S37

F11 Leave
    S35 -> S36 -> S40 (reset, delete, sign out)

F12 Review history and saved items
    S13 -> S15 (calendar, after a 7-day streak) ; S35 -> S33 (favourites) or S34 (notes list)
    edge: calendar locked before 7 days, empty favourites, empty notes

F13 Listen while reading
    S16 -> S19 (reciter, repeat, speed) -> S16
    edge: audio not downloaded, offline, reciter change mid-verse

F14 Get help
    S35 -> S39 (search FAQ, Get Support)

F15 Free reading without touching the daily goal
    S42 -> S16 (free position) -> back to S42 ; daily position on S13 unchanged
    edge: same verse in both positions, which one counts toward stats

F16 Group challenge
    S42 or S28 -> S43 -> I'm Done -> challenge progress
    edge: challenge ends mid-way, joining late, participant count accuracy

F18 Ask Iman (Iman addition, not in the original)
    Home or Explore -> S47 chat -> answer with citations -> S48 citation sheet -> S16 reader
    edge: no source found, ruling question, crisis, daily limit reached, offline

F17 Explore by topic or page
    S26 -> S44 -> verse list -> S16 ; S26 -> S45 (Mushaf pages)
```

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| Button | primary full-width, secondary, text | default, pressed, disabled, loading | all |
| Card | metric, goal, challenge, topic | default, locked | S13, S26, S28 |
| Bottom tab bar | Home, Reading, Explore, Leaderboard, Settings | selected, badge dot | main tabs |
| Verse card | Arabic, translation-only | playing, liked, bookmarked | S16, S43 |
| Stat pill | hasanat, verses, time | live counting | S16 header |
| Level timer card | countdown digits | running, done | S16 |
| Tooltip nudge | below a button | | S13 |
| Modal and bottom sheet | confirm, picker, consent, upsell | open | many |
| Segmented control | friends, global, region | selected | S29 |
| Selection grid | goal, streak, time | selected | S06, S07, S09 |
| Slider | font size, speed, vibration | | S08, S19, S38 |
| Toggle | notifications | on, off | S37 |
| Progress bar | goal, chapter | partial, full | S13, S16 |
| List row | swipe-to-delete | default, swiped | S33, S22 |
| Toast | success | | S22 |
| Audio player bar | reciter, repeat | playing, paused | S16 |
| Verse picker grid | numbered | | S17 |
| Lock badge | streak, premium | | S15, S11 |
| Empty state | friends, bookmarks, notes | | S32, S22 |

## Inferred data model

```
User             id, email, name, gender?, country, created_at
                 evidence: S04, S05, S30  confidence: high
Preferences      user_id, daily_goal, streak_goal, font, font_size, reciter, speed,
                 translation_lang, theme, appearance, vibration
                 evidence: S06-S09, S38  confidence: high
ReadingPosition  user_id, kind (daily | free | challenge), challenge_id?, surah, ayah
                 evidence: S13 goal card, S42 "separate Quran", S43  confidence: high
ReadingSession   id, user_id, position_kind, start_ayah, end_ayah, pages, seconds,
                 hasanat (letters x 10), logged_at, tz
                 evidence: S16 stat pills, Next preview, S24  confidence: medium (ranges are a guess)
VerseLike        user_id, ayah ; global count per ayah  evidence: S16 heart counts  confidence: high
ReadingLevel     user_id, level, minutes_total  evidence: S16 level card  confidence: medium
DailyProgress    user_id, local_date, verses, pages, seconds, goal_met
                 evidence: S13, S25  confidence: medium (derive from sessions)
Streak           user_id, current, longest, grace_used, paused_until
                 evidence: S14  confidence: medium (rules unconfirmed)
Challenge        id, level, title, target ; ChallengeProgress user_id, challenge_id, done
                 evidence: S28  confidence: medium
Bookmark         id, list_id, ayah ; BookmarkList id, user_id, name
                 evidence: S22  confidence: high
Note             id, user_id, ayah, text  (free cap 3)
                 evidence: S21  confidence: high
Favourite        user_id, surah  evidence: S33  confidence: high
Friendship       user_id, friend_id, status ; Invite code, link
                 evidence: S31, S32  confidence: medium
LeaderboardEntry user_id, utc_date, hasanat, verses, seconds, share_name, share_photo,
                 country, opted_in   (daily, resets at UTC 00:00)
                 evidence: S29 screenshots, S30  confidence: high
Reminder         user_id, time, enabled  evidence: S09, S37  confidence: high
Entitlement      user_id, plan, trial_end, source  evidence: S11, S12  confidence: high
Content (not user data, from licensed or open sources)
                 Surah, Ayah, Word, Translation, Tafsir, Reciter, AudioFile
```

Relationships: User 1-1 Preferences, User 1-n ReadingSession, User 1-n DailyProgress, User 1-1 Streak, User n-n Challenge, User 1-n BookmarkList, BookmarkList 1-n Bookmark, User 1-n Note, User n-n User (Friendship), User 1-1 Entitlement.

Metric note: the original also tracks hasanat. Counting the Quran's letters is permitted, but some scholars dislike keeping a tally of your own reward, so build it optional and off by default.

## Feature matrix

See `features.csv`. Must: 24, should: 31, could: 29, skip: 5 (89 rows).

## Out of scope (cannot or should not be cloned)

- The Quran text, translations, tafsir and recitation audio. These are content owned or licensed by others. Take each from a source whose license you have read; some translations and tafsirs are copyrighted.
- Quranly's user base, leaderboard standings and community.
- Scholar endorsements, testimonials and ratings shown on its paywall.
- Its name, logo, illustrations, challenge and level names (the four letter levels, "Break the egg", its 30-day challenge name), topic-gem art, copy and mascot-style art.
- Its live community numbers (people reading now, global like counts). Rebuild the feature, but your counters start at zero and must be real.
- Any private API or app code.

## Size

Screens 46, flows 17, entities about 17. Hard parts: (1) the content pipeline (Arabic text, word-by-word, tajweed, translations, tafsir, audio with verse timing); (2) streak and goal logic across time zones, grace and pause, offline; (3) subscriptions with free and premium gating on iOS and Android; (4) leaderboard privacy and consent; (5) reliable reminders.

Full parity: L (a quarter). A sellable v1 (reader, goals, streaks, reminders, paywall, sync): M (a few weeks of focused work). No promise of a perfect clone.

Still open: exact streak, grace and pause rules; what the orange counter on home is; what is free versus premium (and what the paywall looks like today); whether the 3-day trial is universal; what a topic gem opens to; whether free reading counts toward the daily goal and the leaderboard. Screenshots of the streak overlays, the Purchase screen, a gem detail and the calendar would close these. None of them block `/replica-architect`.
