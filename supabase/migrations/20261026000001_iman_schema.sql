-- Schema for the Quran habit app (a clean-room rebuild of Quranly's core features)
-- Target: Supabase (Postgres 15+). Times are timestamptz in UTC. Access via row level security.
-- Quran text, translations and audio are NOT in this database: they ship in the app's
-- bundled content database. Only per-verse metadata lives here, so the server can
-- compute progress and stop clients from inventing it.

create extension if not exists pgcrypto with schema extensions;

create or replace function set_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Content metadata (read-only, seeded from the content build: 6236 rows)
-- ---------------------------------------------------------------------------
create table ayah_meta (
  ayah_key   smallint primary key check (ayah_key between 1 and 6236), -- 1 = 1:1, 6236 = 114:6
  surah      smallint not null check (surah between 1 and 114),
  ayah       smallint not null check (ayah >= 1),
  page       smallint not null check (page between 1 and 604),        -- Madani mushaf
  juz        smallint not null check (juz between 1 and 30),
  letters    smallint not null check (letters >= 0),                  -- counting method documented in the content build
  page_share real not null check (page_share > 0 and page_share <= 1), -- 1 / ayahs on this page
  unique (surah, ayah)
);
create index on ayah_meta (page);
create index on ayah_meta (juz);

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 60),
  gender       text check (gender in ('male', 'female')),
  country      char(2) check (country ~ '^[A-Z]{2}$'),
  avatar_path  text,
  timezone     text not null default 'UTC',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger profiles_updated before update on profiles
  for each row execute function set_updated_at();

create table preferences (
  user_id              uuid primary key references profiles(id) on delete cascade,
  goal_unit            text not null default 'verses' check (goal_unit in ('verses', 'pages', 'minutes')),
  goal_amount          int not null default 10 check (goal_amount between 1 and 6236),
  streak_goal          int not null default 3 check (streak_goal between 1 and 365),
  script               text not null default 'uthmani',
  font_size            smallint not null default 28 check (font_size between 12 and 64),
  translations         text[] not null default '{}' check (cardinality(translations) <= 2),
  reciter              text,
  playback_speed       numeric(3,2) not null default 1.00 check (playback_speed between 0.5 and 2.0),
  show_translation     boolean not null default true,
  show_transliteration boolean not null default true,
  show_hasanat         boolean not null default false,  -- off by default, by design
  reading_levels       boolean not null default true,
  show_leaderboard     boolean not null default true,
  autoplay             boolean not null default false,
  auto_next            boolean not null default false,
  theme                text not null default 'default',
  appearance           text not null default 'system' check (appearance in ('system', 'light', 'dark')),
  haptics              smallint not null default 2 check (haptics between 0 and 3),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create trigger preferences_updated before update on preferences
  for each row execute function set_updated_at();

-- Create the profile and preferences rows when someone signs up.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name)
    values (new.id, coalesce(new.raw_user_meta_data->>'name', ''));
  insert into preferences (user_id) values (new.id);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- Challenges (managed by you, read by everyone)
-- ---------------------------------------------------------------------------
create table challenges (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  title            text not null,
  description      text not null default '',
  kind             text not null check (kind in ('level', 'group')),
  level            smallint check (level between 1 and 10),
  target_unit      text not null check (target_unit in ('verses', 'minutes', 'days')),
  target_value     int not null check (target_value > 0),
  translation_only boolean not null default false,
  starts_at        timestamptz,
  ends_at          timestamptz,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check ((kind = 'level') = (level is not null)),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create index on challenges (is_active, kind, level);
create trigger challenges_updated before update on challenges
  for each row execute function set_updated_at();

create table challenge_participants (
  challenge_id uuid not null references challenges(id) on delete cascade,
  user_id      uuid not null references profiles(id) on delete cascade,
  progress     int not null default 0 check (progress >= 0),
  joined_at    timestamptz not null default now(),
  completed_at timestamptz,
  updated_at   timestamptz not null default now(),
  primary key (challenge_id, user_id)
);
create index on challenge_participants (user_id);

-- ---------------------------------------------------------------------------
-- Reading: positions, sessions, daily totals, streaks
-- ---------------------------------------------------------------------------
-- One place per reading track: the daily-goal Quran, free reading, and one per challenge.
create table reading_positions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  kind         text not null check (kind in ('daily', 'free', 'challenge')),
  challenge_id uuid references challenges(id) on delete cascade,
  ayah_key     smallint not null default 1 references ayah_meta(ayah_key),
  moved_at     timestamptz not null default now(), -- when the reading that set it happened
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check ((kind = 'challenge') = (challenge_id is not null)),
  unique nulls not distinct (user_id, kind, challenge_id)
);
create index on reading_positions (challenge_id) where challenge_id is not null;
create trigger reading_positions_updated before update on reading_positions
  for each row execute function set_updated_at();

-- A manual move (pencil, "start from verse") counts as the newest position.
create or replace function stamp_manual_move() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.ayah_key <> old.ayah_key
     and coalesce(current_setting('iman.logging', true), '') <> 'on' then
    new.moved_at = now();
  end if;
  return new;
end $$;
create trigger reading_positions_manual before update on reading_positions
  for each row execute function stamp_manual_move();

-- One row per "I'm Done". Written only by log_reading(), which computes the numbers.
create table reading_sessions (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null,     -- made on the device; a retried upload is ignored
  user_id       uuid not null references profiles(id) on delete cascade,
  position_kind text not null check (position_kind in ('daily', 'free', 'challenge')),
  challenge_id  uuid references challenges(id) on delete set null,
  start_ayah    smallint not null references ayah_meta(ayah_key),
  end_ayah      smallint not null references ayah_meta(ayah_key),
  verses        smallint not null check (verses between 1 and 6236),
  pages         numeric(6,2) not null,
  seconds       int not null check (seconds between 0 and 86400),
  letters       int not null,
  hasanat       int not null,      -- letters x 10, shown only if the user turns it on
  started_at    timestamptz not null,
  ended_at      timestamptz not null,
  tz            text not null,     -- the device time zone when this was read
  local_date    date not null,     -- the day it counts for, in that time zone
  flagged       boolean not null default false, -- implausible pace: kept, but not on the leaderboard
  created_at    timestamptz not null default now(),
  unique (user_id, client_id),
  check (end_ayah >= start_ayah),
  check (ended_at >= started_at)
);
create index on reading_sessions (user_id, local_date);
create index on reading_sessions (challenge_id) where challenge_id is not null;

create table daily_progress (
  user_id     uuid not null references profiles(id) on delete cascade,
  local_date  date not null,
  verses      int not null default 0,
  pages       numeric(7,2) not null default 0,
  seconds     int not null default 0,
  hasanat     int not null default 0,
  goal_unit   text not null check (goal_unit in ('verses', 'pages', 'minutes')), -- the goal that day
  goal_amount int not null,
  goal_met    boolean not null default false,
  updated_at  timestamptz not null default now(),
  primary key (user_id, local_date)
);

create table streaks (
  user_id       uuid primary key references profiles(id) on delete cascade,
  current       int not null default 0,
  longest       int not null default 0,
  last_met_date date,
  freezes       smallint not null default 1 check (freezes between 0 and 2),
  updated_at    timestamptz not null default now()
);

create table streak_pauses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  from_date  date not null,
  until_date date not null,
  created_at timestamptz not null default now(),
  check (until_date >= from_date and until_date - from_date <= 30)
);
create index on streak_pauses (user_id, from_date);

-- ---------------------------------------------------------------------------
-- Saved content
-- ---------------------------------------------------------------------------
create table bookmark_lists (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);
create trigger bookmark_lists_updated before update on bookmark_lists
  for each row execute function set_updated_at();

create table bookmarks (
  id         uuid primary key default gen_random_uuid(),
  list_id    uuid not null references bookmark_lists(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  ayah_key   smallint not null references ayah_meta(ayah_key),
  created_at timestamptz not null default now(),
  unique (list_id, ayah_key)
);
create index on bookmarks (user_id);

create table favourites (
  user_id    uuid not null references profiles(id) on delete cascade,
  surah      smallint not null check (surah between 1 and 114),
  created_at timestamptz not null default now(),
  primary key (user_id, surah)
);

create table notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  ayah_key   smallint not null references ayah_meta(ayah_key),
  body       text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on notes (user_id, ayah_key);
create trigger notes_updated before update on notes
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Likes on verses
-- ---------------------------------------------------------------------------
create table verse_likes (
  user_id    uuid not null references profiles(id) on delete cascade,
  ayah_key   smallint not null references ayah_meta(ayah_key),
  created_at timestamptz not null default now(),
  primary key (user_id, ayah_key)
);
create index on verse_likes (ayah_key);

create table verse_like_counts (
  ayah_key smallint primary key references ayah_meta(ayah_key),
  likes    int not null default 0 check (likes >= 0)
);

create or replace function bump_like_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into verse_like_counts (ayah_key, likes) values (new.ayah_key, 1)
      on conflict (ayah_key) do update set likes = verse_like_counts.likes + 1;
  else
    update verse_like_counts set likes = greatest(likes - 1, 0) where ayah_key = old.ayah_key;
  end if;
  return null;
end $$;
create trigger verse_likes_count after insert or delete on verse_likes
  for each row execute function bump_like_count();

-- ---------------------------------------------------------------------------
-- Friends and leaderboard
-- ---------------------------------------------------------------------------
create table friendships (           -- stored in both directions when an invite is accepted
  user_id    uuid not null references profiles(id) on delete cascade,
  friend_id  uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);
create index on friendships (friend_id);

create table invites (
  code       text primary key default encode(extensions.gen_random_bytes(6), 'hex'),
  inviter_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days',
  used_by    uuid references profiles(id) on delete set null,
  used_at    timestamptz
);
create index on invites (inviter_id);

create table leaderboard_optins (
  user_id     uuid primary key references profiles(id) on delete cascade,
  share_name  boolean not null default true,
  share_photo boolean not null default false,
  country     char(2) check (country ~ '^[A-Z]{2}$'),
  opted_in_at timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index on leaderboard_optins (country);

-- Daily totals per UTC day for everyone; only opted-in users are ever shown.
create table leaderboard_daily (
  utc_date   date not null,
  user_id    uuid not null references profiles(id) on delete cascade,
  verses     int not null default 0,
  seconds    int not null default 0,
  hasanat    int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (utc_date, user_id)
);
create index on leaderboard_daily (utc_date, verses desc);
create index on leaderboard_daily (user_id);

-- "People reading now"
create table presence (
  user_id   uuid primary key references profiles(id) on delete cascade,
  last_seen timestamptz not null default now()
);
create index on presence (last_seen);

-- ---------------------------------------------------------------------------
-- Reminders, push, subscriptions
-- ---------------------------------------------------------------------------
create table reminders (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  kind       text not null default 'daily' check (kind in ('daily', 'streak_risk')),
  local_time time not null,
  weekdays   smallint[] not null default '{1,2,3,4,5,6,7}',
  enabled    boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on reminders (user_id);
create trigger reminders_updated before update on reminders
  for each row execute function set_updated_at();

create table push_tokens (
  token      text primary key,
  user_id    uuid not null references profiles(id) on delete cascade,
  platform   text not null check (platform in ('ios', 'android')),
  updated_at timestamptz not null default now()
);
create index on push_tokens (user_id);

create table entitlements (           -- written only by the RevenueCat webhook
  user_id    uuid primary key references profiles(id) on delete cascade,
  product_id text not null,
  status     text not null check (status in ('trial', 'active', 'grace', 'expired', 'lifetime')),
  store      text not null check (store in ('app_store', 'play_store', 'promo')),
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

create table webhook_events (         -- webhooks arrive more than once; the id makes them idempotent
  id          text primary key,
  source      text not null,
  received_at timestamptz not null default now(),
  payload     jsonb not null
);

create or replace function is_premium(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from entitlements e
    where e.user_id = uid
      and e.status in ('trial', 'active', 'grace', 'lifetime')
      and (e.expires_at is null or e.expires_at > now())
  );
$$;

-- Free users get 3 notes.
create or replace function enforce_note_cap() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not is_premium(new.user_id)
     and (select count(*) from notes where user_id = new.user_id) >= 3 then
    raise exception 'note_limit_reached' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger notes_cap before insert on notes
  for each row execute function enforce_note_cap();

-- ---------------------------------------------------------------------------
-- Streak rules (a product decision, since the original's rules are unconfirmed):
-- * A day counts when that day's goal is met, in the user's local time zone.
-- * One freeze a week is banked automatically (max 2); a missed day uses one.
-- * Paused days never break or count toward a streak.
-- The streak is replayed from daily_progress, so offline sessions that arrive
-- late or out of order still give the right answer.
-- ---------------------------------------------------------------------------
create or replace function paused_days(uid uuid, d1 date, d2 date) returns int
language sql stable set search_path = public as $$
  select coalesce(sum(greatest(0, least(p.until_date, d2) - greatest(p.from_date, d1) + 1)), 0)::int
  from streak_pauses p
  where p.user_id = uid and p.from_date <= d2 and p.until_date >= d1;
$$;

create or replace function recompute_streak(uid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  r      record;
  cur    int := 0;
  best   int := 0;
  last   date;
  fz     int := 1;
  missed int;
begin
  for r in select local_date from daily_progress
           where user_id = uid and goal_met order by local_date loop
    if last is null then
      cur := 1;
    else
      fz := least(2, fz + (date_trunc('week', r.local_date)::date - date_trunc('week', last)::date) / 7);
      missed := (r.local_date - last - 1) - paused_days(uid, last + 1, r.local_date - 1);
      if missed <= 0 then
        cur := cur + 1;
      elsif missed <= fz then
        fz := fz - missed;
        cur := cur + 1;
      else
        cur := 1;
      end if;
    end if;
    best := greatest(best, cur);
    last := r.local_date;
  end loop;

  insert into streaks (user_id, current, longest, last_met_date, freezes, updated_at)
    values (uid, cur, best, last, fz, now())
  on conflict (user_id) do update
    set current = excluded.current, longest = excluded.longest,
        last_met_date = excluded.last_met_date, freezes = excluded.freezes, updated_at = now();
end $$;

-- What the app shows today: the streak, or 0 if it has already broken.
create or replace function streak_status(today date)
returns table (current int, longest int, freezes int, met_today boolean, at_risk boolean)
language plpgsql stable security definer set search_path = public as $$
declare
  s      streaks%rowtype;
  fz     int;
  missed int;
begin
  select * into s from streaks where user_id = auth.uid();
  if s.user_id is null or s.last_met_date is null then
    return query select 0, 0, 1, false, false;
    return;
  end if;
  fz := least(2, s.freezes + (date_trunc('week', today)::date - date_trunc('week', s.last_met_date)::date) / 7);
  missed := greatest(0, (today - s.last_met_date - 1) - paused_days(s.user_id, s.last_met_date + 1, today - 1));
  if s.last_met_date >= today - 1 or missed <= fz then
    return query select s.current, s.longest, fz - missed, s.last_met_date = today, missed > 0;
  else
    return query select 0, s.longest, fz, false, false;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- The core loop: log one "I'm Done". The server computes every number.
-- ---------------------------------------------------------------------------
create or replace function log_reading(
  p_client_id     uuid,
  p_position_kind text,
  p_challenge_id  uuid,
  p_start_ayah    int,
  p_end_ayah      int,
  p_started_at    timestamptz,
  p_ended_at      timestamptz,
  p_tz            text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid      uuid := auth.uid();
  v_verses int;
  v_letters int;
  v_pages  numeric;
  v_secs   int;
  v_local  date;
  v_utc    date;
  v_flag   boolean;
  v_pref   preferences%rowtype;
  v_dp     daily_progress%rowtype;
  v_was_met boolean;
  v_target int;
  v_inserted int;
begin
  if uid is null then raise exception 'not_signed_in' using errcode = '28000'; end if;
  if p_start_ayah < 1 or p_end_ayah > 6236 or p_end_ayah < p_start_ayah then
    raise exception 'bad_range' using errcode = '22023';
  end if;
  if p_ended_at < p_started_at or p_ended_at > now() + interval '5 minutes'
     or p_ended_at < now() - interval '30 days' then
    raise exception 'bad_times' using errcode = '22023';
  end if;
  if not exists (select 1 from pg_timezone_names where name = p_tz) then
    raise exception 'bad_timezone' using errcode = '22023';
  end if;
  if p_position_kind = 'challenge' and not exists (
       select 1 from challenge_participants where challenge_id = p_challenge_id and user_id = uid) then
    raise exception 'not_in_challenge' using errcode = '42501';
  end if;

  select count(*), sum(letters), round(sum(page_share)::numeric, 2)
    into v_verses, v_letters, v_pages
    from ayah_meta where ayah_key between p_start_ayah and p_end_ayah;
  v_secs  := least(86400, extract(epoch from (p_ended_at - p_started_at))::int);
  v_local := (p_ended_at at time zone p_tz)::date;
  v_utc   := (p_ended_at at time zone 'UTC')::date;
  v_flag  := v_letters > v_secs * 25;   -- faster than 25 letters a second: not on the leaderboard

  insert into reading_sessions (client_id, user_id, position_kind, challenge_id, start_ayah, end_ayah,
      verses, pages, seconds, letters, hasanat, started_at, ended_at, tz, local_date, flagged)
    values (p_client_id, uid, p_position_kind,
            case when p_position_kind = 'challenge' then p_challenge_id end,
            p_start_ayah, p_end_ayah, v_verses, v_pages, v_secs, v_letters, v_letters * 10,
            p_started_at, p_ended_at, p_tz, v_local, v_flag)
    on conflict (user_id, client_id) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    return jsonb_build_object('duplicate', true);   -- already counted
  end if;

  -- Move the reading position (a challenge keeps its own). A late offline upload of an
  -- older session never moves it back past something read more recently.
  perform set_config('iman.logging', 'on', true);
  insert into reading_positions (user_id, kind, challenge_id, ayah_key, moved_at)
    values (uid, p_position_kind,
            case when p_position_kind = 'challenge' then p_challenge_id end,
            least(p_end_ayah + 1, 6236), p_ended_at)
  on conflict (user_id, kind, challenge_id) do update
    set ayah_key = excluded.ayah_key, moved_at = excluded.moved_at
    where reading_positions.moved_at <= excluded.moved_at;
  perform set_config('iman.logging', 'off', true);

  -- Daily totals and the goal. Free reading and challenges count toward the day too.
  select * into v_pref from preferences where user_id = uid;
  select goal_met into v_was_met from daily_progress where user_id = uid and local_date = v_local;
  insert into daily_progress (user_id, local_date, verses, pages, seconds, hasanat, goal_unit, goal_amount)
    values (uid, v_local, v_verses, v_pages, v_secs, v_letters * 10, v_pref.goal_unit, v_pref.goal_amount)
  on conflict (user_id, local_date) do update
    set verses  = daily_progress.verses + excluded.verses,
        pages   = daily_progress.pages + excluded.pages,
        seconds = daily_progress.seconds + excluded.seconds,
        hasanat = daily_progress.hasanat + excluded.hasanat,
        updated_at = now()
  returning * into v_dp;

  update daily_progress
     set goal_met = case goal_unit
                      when 'verses'  then verses >= goal_amount
                      when 'pages'   then pages >= goal_amount
                      when 'minutes' then seconds >= goal_amount * 60
                    end
   where user_id = uid and local_date = v_local
  returning * into v_dp;

  if v_dp.goal_met and not coalesce(v_was_met, false) then
    perform recompute_streak(uid);
  end if;

  -- Leaderboard day (UTC). Flagged sessions do not count.
  if not v_flag then
    insert into leaderboard_daily (utc_date, user_id, verses, seconds, hasanat)
      values (v_utc, uid, v_verses, v_secs, v_letters * 10)
    on conflict (utc_date, user_id) do update
      set verses  = leaderboard_daily.verses + excluded.verses,
          seconds = leaderboard_daily.seconds + excluded.seconds,
          hasanat = leaderboard_daily.hasanat + excluded.hasanat,
          updated_at = now();
  end if;

  -- Challenge progress.
  if p_position_kind = 'challenge' then
    select target_value into v_target from challenges where id = p_challenge_id;
    update challenge_participants
       set progress = least(v_target, progress + case (select target_unit from challenges where id = p_challenge_id)
                                                  when 'verses'  then v_verses
                                                  when 'minutes' then v_secs / 60
                                                  else 0 end),
           updated_at = now()
     where challenge_id = p_challenge_id and user_id = uid;
    update challenge_participants
       set completed_at = now()
     where challenge_id = p_challenge_id and user_id = uid
       and completed_at is null and progress >= v_target;
  end if;

  return jsonb_build_object(
    'duplicate', false,
    'local_date', v_local,
    'verses', v_verses, 'pages', v_pages, 'seconds', v_secs, 'hasanat', v_letters * 10,
    'day', to_jsonb(v_dp),
    'flagged', v_flag);
end $$;

-- ---------------------------------------------------------------------------
-- Leaderboard, community counters, account actions
-- ---------------------------------------------------------------------------
create or replace function leaderboard(p_scope text, p_date date default (now() at time zone 'UTC')::date,
                                       p_limit int default 50)
returns table (rank bigint, user_id uuid, display_name text, avatar_path text, country char(2),
               verses int, seconds int, is_me boolean)
language sql stable security definer set search_path = public as $$
  with board as (
    select l.user_id, l.verses, l.seconds,
           rank() over (order by l.verses desc, l.seconds asc) as rank
    from leaderboard_daily l
    join leaderboard_optins o on o.user_id = l.user_id
    where l.utc_date = p_date
      and (p_scope = 'global'
        or (p_scope = 'region' and o.country = (select country from leaderboard_optins where user_id = auth.uid()))
        or (p_scope = 'friends' and (l.user_id = auth.uid()
              or l.user_id in (select friend_id from friendships where user_id = auth.uid()))))
  )
  select b.rank, b.user_id,
         case when o.share_name then p.display_name else 'Reader' end,
         case when o.share_photo then p.avatar_path end,
         o.country, b.verses, b.seconds, b.user_id = auth.uid()
  from board b
  join profiles p on p.id = b.user_id
  join leaderboard_optins o on o.user_id = b.user_id
  where b.rank <= p_limit or b.user_id = auth.uid()
  order by b.rank;
$$;

create or replace function heartbeat() returns void
language sql security definer set search_path = public as $$
  insert into presence (user_id, last_seen) values (auth.uid(), now())
  on conflict (user_id) do update set last_seen = now();
$$;

create or replace function community_stats() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'reading_now', (select count(*) from presence where last_seen > now() - interval '2 minutes'),
    'verses_today', (select coalesce(sum(verses), 0) from leaderboard_daily
                     where utc_date = (now() at time zone 'UTC')::date));
$$;

create or replace function accept_invite(p_code text) returns void
language plpgsql security definer set search_path = public as $$
declare v_inviter uuid;
begin
  update invites set used_by = auth.uid(), used_at = now()
   where code = p_code and used_by is null and expires_at > now() and inviter_id <> auth.uid()
  returning inviter_id into v_inviter;
  if v_inviter is null then raise exception 'invite_invalid' using errcode = 'P0002'; end if;
  insert into friendships (user_id, friend_id) values (auth.uid(), v_inviter), (v_inviter, auth.uid())
  on conflict do nothing;
end $$;

create or replace function remove_friend(p_friend uuid) returns void
language sql security definer set search_path = public as $$
  delete from friendships
   where (user_id = auth.uid() and friend_id = p_friend) or (user_id = p_friend and friend_id = auth.uid());
$$;

create or replace function join_challenge(p_challenge uuid) returns void
language sql security definer set search_path = public as $$
  insert into challenge_participants (challenge_id, user_id)
  select id, auth.uid() from challenges
   where id = p_challenge and is_active and (ends_at is null or ends_at > now())
  on conflict do nothing;
$$;

-- Wipe reading history but keep bookmarks, notes and settings.
create or replace function reset_stats() returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from reading_sessions  where user_id = auth.uid();
  delete from daily_progress    where user_id = auth.uid();
  delete from streaks           where user_id = auth.uid();
  delete from streak_pauses     where user_id = auth.uid();
  delete from leaderboard_daily where user_id = auth.uid();
  update challenge_participants set progress = 0, completed_at = null where user_id = auth.uid();
  update reading_positions set ayah_key = 1 where user_id = auth.uid();
end $$;

-- ---------------------------------------------------------------------------
-- Islamic assistant: answers only from the Quran and graded hadith, with
-- references the server checks. The model never writes a quote itself: it
-- cites passage ids, and the app shows the stored text for each id.
-- ---------------------------------------------------------------------------
create extension if not exists vector with schema extensions;

create table corpus_passages (
  id          uuid primary key default gen_random_uuid(),
  source      text not null check (source in ('quran', 'hadith')),
  ref         text not null,            -- '2:255', 'bukhari:6018', 'muslim:2564'
  collection  text not null,            -- 'quran', 'bukhari', 'muslim', 'abudawud', 'tirmidhi', 'nasai', 'ibnmajah', 'riyadussalihin', ...
  ayah_from   smallint references ayah_meta(ayah_key),  -- Quran passages only
  ayah_to     smallint references ayah_meta(ayah_key),
  grade       text check (grade in ('sahih', 'hasan', 'daif', 'mawdu', 'ungraded')),
  graded_by   text,                     -- whose grading this is
  lang        text not null,            -- 'ar', 'sq', 'en'
  translator  text not null default '', -- '' for the Arabic original
  body        text not null,
  licence     text not null,            -- the licence under which you hold this text
  embedding   vector(1024),
  tsv         tsvector generated always as (to_tsvector('simple', body)) stored,
  created_at  timestamptz not null default now(),
  check ((source = 'quran') = (ayah_from is not null)),
  check ((source = 'hadith') = (grade is not null)),
  unique (ref, lang, translator)
);
create index on corpus_passages using hnsw (embedding vector_cosine_ops);
create index on corpus_passages using gin (tsv);
create index on corpus_passages (source, grade, lang);

create table chat_threads (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  title      text not null default '' check (char_length(title) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on chat_threads (user_id, updated_at desc);
create trigger chat_threads_updated before update on chat_threads
  for each row execute function set_updated_at();

create table chat_messages (
  id            uuid primary key default gen_random_uuid(),
  thread_id     uuid not null references chat_threads(id) on delete cascade,
  user_id       uuid not null references profiles(id) on delete cascade,
  role          text not null check (role in ('user', 'assistant')),
  content       text not null check (char_length(content) <= 20000),
  citations     uuid[] not null default '{}',   -- corpus_passages ids, checked server-side
  safety        text check (safety in ('crisis', 'refer_scholar', 'out_of_scope')),
  model         text,
  input_tokens  int,
  output_tokens int,
  created_at    timestamptz not null default now()
);
create index on chat_messages (thread_id, created_at);
create index on chat_messages (user_id);

create table chat_usage (               -- daily limit, so API costs stay bounded
  user_id  uuid not null references profiles(id) on delete cascade,
  utc_date date not null,
  messages int not null default 0,
  primary key (user_id, utc_date)
);

create table chat_reports (             -- "this reference is wrong" button
  id         uuid primary key default gen_random_uuid(),
  message_id uuid not null references chat_messages(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  reason     text not null check (reason in ('wrong_reference', 'weak_hadith', 'wrong_ruling', 'unhelpful', 'other')),
  detail     text check (char_length(detail) <= 2000),
  status     text not null default 'open' check (status in ('open', 'confirmed', 'dismissed')),
  created_at timestamptz not null default now(),
  unique (message_id, user_id)
);
create index on chat_reports (status, created_at);

-- Hybrid search: meaning (embeddings) plus exact words, Quran and accepted hadith only by default.
create or replace function match_passages(
  p_embedding vector(1024),
  p_query     text,
  p_langs     text[] default '{sq,ar,en}',
  p_k         int default 12,
  p_grades    text[] default '{sahih,hasan}'
) returns table (id uuid, source text, ref text, collection text, grade text, lang text,
                 translator text, body text, score real)
language sql stable security definer set search_path = public, extensions as $$
  with semantic as (
    select c.id, row_number() over (order by c.embedding <=> p_embedding) as r
    from corpus_passages c
    where c.lang = any(p_langs) and (c.source = 'quran' or c.grade = any(p_grades))
    order by c.embedding <=> p_embedding limit p_k * 4
  ), lexical as (
    select c.id, row_number() over (order by ts_rank(c.tsv, websearch_to_tsquery('simple', p_query)) desc) as r
    from corpus_passages c
    where c.lang = any(p_langs) and (c.source = 'quran' or c.grade = any(p_grades))
      and c.tsv @@ websearch_to_tsquery('simple', p_query)
    limit p_k * 4
  ), fused as (                      -- reciprocal rank fusion
    select id, sum(1.0 / (60 + r))::real as score
    from (select * from semantic union all select * from lexical) x
    group by id
  )
  select c.id, c.source, c.ref, c.collection, c.grade, c.lang, c.translator, c.body, f.score
  from fused f join corpus_passages c on c.id = f.id
  order by f.score desc limit p_k;
$$;

-- Count one question against today's limit; false when the limit is reached.
create or replace function take_chat_quota(uid uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_limit int := case when is_premium(uid) then 50 else 3 end; v_used int;
begin
  insert into chat_usage (user_id, utc_date, messages)
    values (uid, (now() at time zone 'UTC')::date, 1)
  on conflict (user_id, utc_date) do update set messages = chat_usage.messages + 1
    where chat_usage.messages < v_limit
  returning messages into v_used;
  return v_used is not null;
end $$;

-- Only ids that were actually retrieved for this answer survive.
create or replace function keep_valid_citations(p_cited uuid[], p_retrieved uuid[]) returns uuid[]
language sql immutable set search_path = public as $$
  select coalesce(array_agg(c order by o), '{}')
  from unnest(p_cited) with ordinality as t(c, o)
  where c = any(p_retrieved);
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table corpus_passages enable row level security;
alter table chat_threads    enable row level security;
alter table chat_messages   enable row level security;
alter table chat_usage      enable row level security;
alter table chat_reports    enable row level security;
create policy read_all on corpus_passages for select to anon, authenticated using (true);
create policy own on chat_threads for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_read on chat_messages for select to authenticated using (user_id = auth.uid());  -- written by the edge function
create policy own_read on chat_usage    for select to authenticated using (user_id = auth.uid());
create policy own on chat_reports for insert to authenticated
  with check (user_id = auth.uid()
              and exists (select 1 from chat_messages m where m.id = message_id and m.user_id = auth.uid()));
create policy own_read on chat_reports for select to authenticated using (user_id = auth.uid());
revoke execute on function take_chat_quota(uuid) from public, anon, authenticated;
revoke execute on function match_passages(vector, text, text[], int, text[]) from public, anon, authenticated;

alter table ayah_meta              enable row level security;
alter table profiles               enable row level security;
alter table preferences            enable row level security;
alter table challenges             enable row level security;
alter table challenge_participants enable row level security;
alter table reading_positions      enable row level security;
alter table reading_sessions       enable row level security;
alter table daily_progress         enable row level security;
alter table streaks                enable row level security;
alter table streak_pauses          enable row level security;
alter table bookmark_lists         enable row level security;
alter table bookmarks              enable row level security;
alter table favourites             enable row level security;
alter table notes                  enable row level security;
alter table verse_likes            enable row level security;
alter table verse_like_counts      enable row level security;
alter table friendships            enable row level security;
alter table invites                enable row level security;
alter table leaderboard_optins     enable row level security;
alter table leaderboard_daily      enable row level security;
alter table presence               enable row level security;
alter table reminders              enable row level security;
alter table push_tokens            enable row level security;
alter table entitlements           enable row level security;
alter table webhook_events         enable row level security;  -- no policies: service role only

-- Public reference data
create policy read_all on ayah_meta         for select to anon, authenticated using (true);
create policy read_all on challenges        for select to anon, authenticated using (is_active);
create policy read_all on verse_like_counts for select to anon, authenticated using (true);

-- Your own rows, full access
create policy own on preferences    for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own on streak_pauses  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own on bookmark_lists for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own on favourites     for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own on notes          for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own on verse_likes    for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own on reminders      for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own on push_tokens    for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own on leaderboard_optins for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own on bookmarks for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid()
              and exists (select 1 from bookmark_lists l where l.id = list_id and l.user_id = auth.uid()));

-- Your profile: read and edit, never insert or delete directly
create policy own_read   on profiles for select to authenticated using (id = auth.uid());
create policy own_update on profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Read-only to you; written by log_reading() and other functions
create policy own_read on reading_sessions       for select to authenticated using (user_id = auth.uid());
create policy own_read on daily_progress         for select to authenticated using (user_id = auth.uid());
create policy own_read on streaks                for select to authenticated using (user_id = auth.uid());
create policy own_read on reading_positions      for select to authenticated using (user_id = auth.uid());
create policy own_read on challenge_participants for select to authenticated using (user_id = auth.uid());
create policy own_read on leaderboard_daily      for select to authenticated using (user_id = auth.uid());
create policy own_read on entitlements           for select to authenticated using (user_id = auth.uid());
create policy own_read on friendships            for select to authenticated using (user_id = auth.uid());

-- Moving a position by hand (the pencil on the goal card, "start from verse")
create policy own_move on reading_positions for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_create on reading_positions for insert to authenticated
  with check (user_id = auth.uid() and kind in ('daily', 'free'));

-- Invites: you create and see your own; redeeming goes through accept_invite()
create policy own on invites for select to authenticated using (inviter_id = auth.uid());
create policy own_create on invites for insert to authenticated with check (inviter_id = auth.uid());

-- Functions callable by signed-in users only
revoke execute on function log_reading(uuid, text, uuid, int, int, timestamptz, timestamptz, text) from public, anon;
revoke execute on function recompute_streak(uuid) from public, anon, authenticated;
revoke execute on function is_premium(uuid) from public, anon;
grant  execute on function log_reading(uuid, text, uuid, int, int, timestamptz, timestamptz, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Landing page waitlist: anyone can add an email, nobody can read the list from a browser
-- ---------------------------------------------------------------------------
create table waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      text not null check (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$'),
  source     text not null default 'landing' check (char_length(source) <= 40),
  created_at timestamptz not null default now()
);
create unique index waitlist_email_key on waitlist (lower(email));
alter table waitlist enable row level security;
create policy anyone_can_join on waitlist for insert to anon, authenticated with check (true);

-- ---------------------------------------------------------------------------
-- Supabase grants every function to anon by default. Signed-in features only.
-- ---------------------------------------------------------------------------
revoke execute on function streak_status(date)              from public, anon;
revoke execute on function leaderboard(text, date, int)     from public, anon;
revoke execute on function heartbeat()                      from public, anon;
revoke execute on function accept_invite(text)              from public, anon;
revoke execute on function remove_friend(uuid)              from public, anon;
revoke execute on function join_challenge(uuid)             from public, anon;
revoke execute on function reset_stats()                    from public, anon;
revoke execute on function paused_days(uuid, date, date)    from public, anon, authenticated;
revoke execute on function keep_valid_citations(uuid[], uuid[]) from public, anon, authenticated;
grant execute on function streak_status(date), leaderboard(text, date, int), heartbeat(),
  accept_invite(text), remove_friend(uuid), join_challenge(uuid), reset_stats() to authenticated;

-- The Edge Functions use the service role; make its access explicit.
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function take_chat_quota(uuid), is_premium(uuid), keep_valid_citations(uuid[], uuid[]) to service_role;
    execute 'grant execute on function match_passages(extensions.vector, text, text[], int, text[]) to service_role';
  end if;
end $$;
