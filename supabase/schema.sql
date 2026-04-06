-- ============================================================
-- VYRALYX FITNESS APP — SUPABASE SCHEMA (Phase 1)
-- Run this in Supabase SQL Editor to initialize the database
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── USERS / PROFILES ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  username     TEXT UNIQUE,
  avatar_url   TEXT,
  -- Onboarding data
  gender             TEXT CHECK (gender IN ('male', 'female', 'other')),
  age                INTEGER CHECK (age BETWEEN 10 AND 100),
  weight_kg          NUMERIC(5, 2),
  height_cm          NUMERIC(5, 2),
  fitness_level      TEXT CHECK (fitness_level IN ('beginner', 'intermediate', 'advanced')),
  environment        TEXT CHECK (environment IN ('gym', 'home', 'no_equipment')),
  goal               TEXT CHECK (goal IN ('fat_loss', 'muscle_gain', 'maintenance', 'recomposition')),
  onboarding_complete BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to create profile on new auth user
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_username TEXT;
  candidate_username TEXT;
  suffix INT := 0;
BEGIN
  base_username := lower(
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  );
  base_username := regexp_replace(base_username, '[^a-z0-9_]', '', 'g');
  IF length(base_username) = 0 THEN
    base_username := 'user';
  END IF;

  candidate_username := base_username;
  WHILE EXISTS (SELECT 1 FROM profiles WHERE username = candidate_username) LOOP
    suffix := suffix + 1;
    candidate_username := base_username || '_' || suffix::TEXT;
  END LOOP;

  INSERT INTO profiles (id, email, username)
  VALUES (
    NEW.id,
    NEW.email,
    candidate_username
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── USER STATS (Gamification) ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_stats (
  user_id              UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  level                INTEGER DEFAULT 1,
  xp                   INTEGER DEFAULT 0,
  xp_to_next_level     INTEGER DEFAULT 500,
  streak_days          INTEGER DEFAULT 0,
  longest_streak       INTEGER DEFAULT 0,
  last_workout_date    DATE,
  total_workouts       INTEGER DEFAULT 0,
  total_duration_min   INTEGER DEFAULT 0,
  currency_balance     INTEGER DEFAULT 100, -- starter coins
  rank_global          INTEGER,
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create user_stats on profile creation
CREATE OR REPLACE FUNCTION handle_new_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_stats (user_id) VALUES (NEW.id);
  IF to_regclass('public.wallet') IS NOT NULL THEN
    INSERT INTO wallet (user_id, balance) VALUES (NEW.id, 100);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created ON profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_new_profile();

-- ─── WALLET ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS wallet (
  user_id   UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  balance   INTEGER DEFAULT 0 CHECK (balance >= 0),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TRANSACTIONS ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS transactions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('earn', 'spend')),
  amount      INTEGER NOT NULL CHECK (amount > 0),
  source      TEXT NOT NULL CHECK (source IN ('workout', 'streak', 'challenge', 'ad', 'purchase', 'store', 'battle_pass', 'starter')),
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── WORKOUT SESSIONS ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workout_sessions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workout_id       TEXT NOT NULL,            -- references local workout constant id
  workout_name     TEXT NOT NULL,
  started_at       TIMESTAMPTZ DEFAULT NOW(),
  completed_at     TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  total_score      INTEGER DEFAULT 0,
  xp_earned        INTEGER DEFAULT 0,
  currency_earned  INTEGER DEFAULT 0,
  status           TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned'))
);

-- ─── EXERCISE LOGS ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS exercise_logs (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id        UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exercise_id       TEXT NOT NULL,
  exercise_name     TEXT NOT NULL,
  sets_completed    INTEGER DEFAULT 0,
  reps_per_set      INTEGER[] DEFAULT '{}',
  weight_kg         NUMERIC(6, 2),
  form_score        INTEGER DEFAULT 0 CHECK (form_score BETWEEN 0 AND 100),
  duration_seconds  INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── SCORES / LEADERBOARD ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS scores (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id  UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  score       INTEGER NOT NULL,
  xp          INTEGER NOT NULL,
  week_number INTEGER,              -- ISO week number
  year        INTEGER,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Leaderboard view (weekly)
CREATE OR REPLACE VIEW leaderboard_weekly AS
SELECT
  p.id         AS user_id,
  p.username,
  p.avatar_url,
  us.level,
  SUM(s.score) AS weekly_score,
  SUM(s.xp)    AS weekly_xp,
  RANK() OVER (ORDER BY SUM(s.score) DESC) AS rank
FROM scores s
JOIN profiles p ON s.user_id = p.id
JOIN user_stats us ON s.user_id = us.user_id
WHERE
  s.week_number = EXTRACT(WEEK FROM NOW()) AND
  s.year        = EXTRACT(YEAR FROM NOW())
GROUP BY p.id, p.username, p.avatar_url, us.level;

-- Leaderboard view (all-time)
CREATE OR REPLACE VIEW leaderboard_alltime AS
SELECT
  p.id         AS user_id,
  p.username,
  p.avatar_url,
  us.level,
  us.xp        AS total_xp,
  us.total_workouts,
  RANK() OVER (ORDER BY us.xp DESC) AS rank
FROM profiles p
JOIN user_stats us ON p.id = us.user_id;

-- ─── ACHIEVEMENTS ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS achievements (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  description     TEXT NOT NULL,
  icon            TEXT NOT NULL,
  xp_reward       INTEGER DEFAULT 0,
  currency_reward INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_achievements (
  user_id        UUID REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id TEXT REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, achievement_id)
);

-- ─── CHALLENGES ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS challenges (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           TEXT NOT NULL,
  description    TEXT NOT NULL,
  type           TEXT CHECK (type IN ('daily', 'weekly', 'special')),
  target_value   INTEGER NOT NULL,
  xp_reward      INTEGER DEFAULT 0,
  currency_reward INTEGER DEFAULT 0,
  starts_at      TIMESTAMPTZ DEFAULT NOW(),
  expires_at     TIMESTAMPTZ NOT NULL,
  is_premium     BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS user_challenges (
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id  UUID REFERENCES challenges(id) ON DELETE CASCADE,
  current_value INTEGER DEFAULT 0,
  completed     BOOLEAN DEFAULT FALSE,
  completed_at  TIMESTAMPTZ,
  PRIMARY KEY (user_id, challenge_id)
);

-- ─── SUBSCRIPTIONS ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS subscriptions (
  user_id           UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  tier              TEXT DEFAULT 'free' CHECK (tier IN ('free', 'premium')),
  started_at        TIMESTAMPTZ DEFAULT NOW(),
  expires_at        TIMESTAMPTZ,
  battle_pass_active BOOLEAN DEFAULT FALSE,
  battle_pass_tier  INTEGER DEFAULT 0,
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create subscription (free tier) on profile creation
CREATE OR REPLACE FUNCTION handle_new_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO subscriptions (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_subscription ON profiles;
CREATE TRIGGER on_profile_subscription
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_new_subscription();

-- ─── BATTLE PASS PROGRESS ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS battle_pass_progress (
  user_id       UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  season        INTEGER DEFAULT 1,
  current_tier  INTEGER DEFAULT 0,
  total_xp      INTEGER DEFAULT 0,
  is_premium    BOOLEAN DEFAULT FALSE,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_pass_progress ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all, only update their own
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT USING (TRUE);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- User stats: own data only (except for leaderboard views)
CREATE POLICY "user_stats_own" ON user_stats USING (auth.uid() = user_id);
CREATE POLICY "wallet_own" ON wallet USING (auth.uid() = user_id);
CREATE POLICY "transactions_own" ON transactions USING (auth.uid() = user_id);
CREATE POLICY "sessions_own" ON workout_sessions USING (auth.uid() = user_id);
CREATE POLICY "exercise_logs_own" ON exercise_logs USING (auth.uid() = user_id);
CREATE POLICY "scores_own" ON scores USING (auth.uid() = user_id);
CREATE POLICY "achievements_own" ON user_achievements USING (auth.uid() = user_id);
CREATE POLICY "challenges_own" ON user_challenges USING (auth.uid() = user_id);
CREATE POLICY "subscriptions_own" ON subscriptions USING (auth.uid() = user_id);
CREATE POLICY "battle_pass_own" ON battle_pass_progress USING (auth.uid() = user_id);

-- Public read on achievements and challenges tables
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "achievements_read_all" ON achievements FOR SELECT USING (TRUE);
CREATE POLICY "challenges_read_all" ON challenges FOR SELECT USING (TRUE);

-- ─── SEED: Achievements ────────────────────────────────────────────────────────

INSERT INTO achievements (id, name, description, icon, xp_reward, currency_reward) VALUES
  ('first_workout',    'First Blood',       'Complete your very first workout',           '🔥', 100, 50),
  ('streak_3',         'On Fire',           'Maintain a 3-day workout streak',            '🔥', 150, 75),
  ('streak_7',         'Weekly Warrior',    'Maintain a 7-day workout streak',            '⚡', 300, 150),
  ('streak_30',        'Iron Discipline',   'Maintain a 30-day workout streak',           '💎', 1000, 500),
  ('workouts_10',      'Consistent',        'Complete 10 workouts',                       '🏋️', 200, 100),
  ('workouts_50',      'Dedicated',         'Complete 50 workouts',                       '🏅', 500, 250),
  ('workouts_100',     'Elite Athlete',     'Complete 100 workouts',                      '🏆', 1500, 750),
  ('perfect_form',     'Perfect Form',      'Score 100% form in a workout',               '✨', 200, 100),
  ('level_5',          'Rising Star',       'Reach Level 5',                              '⭐', 300, 150),
  ('level_10',         'Veteran',           'Reach Level 10',                             '🌟', 600, 300),
  ('level_25',         'Champion',          'Reach Level 25',                             '👑', 2000, 1000)
ON CONFLICT (id) DO NOTHING;

-- ─── SEED: Default Daily Challenges ──────────────────────────────────────────

INSERT INTO challenges (name, description, type, target_value, xp_reward, currency_reward, expires_at) VALUES
  ('Daily Grind',      'Complete 1 workout today',        'daily',   1, 50,  25,  NOW() + INTERVAL '1 day'),
  ('Rep Master',       'Complete 100 total reps today',   'daily',  100, 75,  30,  NOW() + INTERVAL '1 day'),
  ('Consistency King', 'Complete 5 workouts this week',   'weekly',  5, 300, 150, NOW() + INTERVAL '7 days')
ON CONFLICT DO NOTHING;
