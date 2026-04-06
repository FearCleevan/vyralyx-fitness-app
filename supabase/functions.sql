-- ============================================================
-- SUPABASE HELPER FUNCTIONS (Phase 1)
-- Run in Supabase SQL Editor after schema.sql
-- ============================================================

-- ─── Increment user stats after workout completion ────────────────────────────

CREATE OR REPLACE FUNCTION increment_user_stats(
  p_user_id   UUID,
  p_xp        INTEGER,
  p_currency  INTEGER
)
RETURNS VOID AS $$
DECLARE
  v_current_xp        INTEGER;
  v_current_level     INTEGER;
  v_xp_to_next        INTEGER;
  v_new_xp            INTEGER;
  v_new_level         INTEGER;
  v_new_xp_to_next    INTEGER;
  v_last_workout_date DATE;
  v_today             DATE := CURRENT_DATE;
  v_streak            INTEGER;
BEGIN
  -- Fetch current stats
  SELECT xp, level, xp_to_next_level, streak_days, last_workout_date
  INTO v_current_xp, v_current_level, v_xp_to_next, v_streak, v_last_workout_date
  FROM user_stats
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Calculate new XP and level
  v_new_xp := v_current_xp + p_xp;
  v_new_level := v_current_level;
  v_new_xp_to_next := v_xp_to_next;

  -- Level up loop (multiple levels possible)
  WHILE v_new_xp >= v_new_xp_to_next LOOP
    v_new_xp := v_new_xp - v_new_xp_to_next;
    v_new_level := v_new_level + 1;
    -- Scale XP required: each level needs 20% more
    v_new_xp_to_next := FLOOR(v_new_xp_to_next * 1.2);
  END LOOP;

  -- Calculate streak
  IF v_last_workout_date IS NULL THEN
    v_streak := 1;
  ELSIF v_last_workout_date = v_today - INTERVAL '1 day' THEN
    v_streak := v_streak + 1;
  ELSIF v_last_workout_date = v_today THEN
    v_streak := v_streak; -- same day, don't increment
  ELSE
    v_streak := 1; -- streak broken
  END IF;

  -- Update stats
  UPDATE user_stats SET
    xp                 = v_new_xp,
    level              = v_new_level,
    xp_to_next_level   = v_new_xp_to_next,
    streak_days        = v_streak,
    longest_streak     = GREATEST(longest_streak, v_streak),
    last_workout_date  = v_today,
    total_workouts     = total_workouts + 1,
    currency_balance   = currency_balance + p_currency,
    updated_at         = NOW()
  WHERE user_id = p_user_id;

  -- Update wallet
  UPDATE wallet SET
    balance    = balance + p_currency,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Record transaction
  INSERT INTO transactions (user_id, type, amount, source, description)
  VALUES (p_user_id, 'earn', p_currency, 'workout', 'Workout completion reward');

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Check and award achievements ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION check_achievements(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_stats RECORD;
BEGIN
  SELECT * INTO v_stats FROM user_stats WHERE user_id = p_user_id;

  -- First workout
  IF v_stats.total_workouts >= 1 THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    VALUES (p_user_id, 'first_workout')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Streak achievements
  IF v_stats.streak_days >= 3 THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    VALUES (p_user_id, 'streak_3')
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_stats.streak_days >= 7 THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    VALUES (p_user_id, 'streak_7')
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_stats.streak_days >= 30 THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    VALUES (p_user_id, 'streak_30')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Workout count achievements
  IF v_stats.total_workouts >= 10 THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    VALUES (p_user_id, 'workouts_10')
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_stats.total_workouts >= 50 THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    VALUES (p_user_id, 'workouts_50')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Level achievements
  IF v_stats.level >= 5 THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    VALUES (p_user_id, 'level_5')
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_stats.level >= 10 THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    VALUES (p_user_id, 'level_10')
    ON CONFLICT DO NOTHING;
  END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Call check_achievements after every stat increment
CREATE OR REPLACE FUNCTION trigger_check_achievements()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM check_achievements(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS after_stats_update ON user_stats;
CREATE TRIGGER after_stats_update
  AFTER UPDATE ON user_stats
  FOR EACH ROW
  WHEN (OLD.total_workouts IS DISTINCT FROM NEW.total_workouts)
  EXECUTE FUNCTION trigger_check_achievements();
