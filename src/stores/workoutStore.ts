import { create } from 'zustand';
import type { Workout, WorkoutPlan, ExerciseLog } from '@/types';
import { getWorkoutPlan } from '@/constants/workouts';
import { supabase } from '@/lib/supabase';

interface ActiveSession {
  sessionId: string;
  workout: Workout;
  currentExerciseIndex: number;
  currentSet: number;
  completedLogs: ExerciseLog[];
  startedAt: Date;
  elapsedSeconds: number;
}

interface WorkoutState {
  plan: WorkoutPlan | null;
  activeSession: ActiveSession | null;
  isLoading: boolean;

  loadPlan: (level: string, environment: string, goal: string) => void;
  startWorkout: (workout: Workout, userId: string) => Promise<string | null>;
  completeExercise: (log: ExerciseLog) => void;
  finishWorkout: (userId: string) => Promise<void>;
  abandonWorkout: () => void;
  tickTimer: () => void;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  plan: null,
  activeSession: null,
  isLoading: false,

  loadPlan: (level, environment, goal) => {
    const plan = getWorkoutPlan(level, environment, goal);
    set({ plan });
  },

  startWorkout: async (workout, userId) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('workout_sessions')
        .insert({
          user_id: userId,
          workout_id: workout.id,
          workout_name: workout.name,
          status: 'in_progress',
        })
        .select('id')
        .single();

      if (error) throw error;

      set({
        activeSession: {
          sessionId: data.id,
          workout,
          currentExerciseIndex: 0,
          currentSet: 1,
          completedLogs: [],
          startedAt: new Date(),
          elapsedSeconds: 0,
        },
      });

      return data.id;
    } catch (e) {
      console.error('Failed to start workout:', e);
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  completeExercise: (log) => {
    set((state) => {
      if (!state.activeSession) return state;
      return {
        activeSession: {
          ...state.activeSession,
          completedLogs: [...state.activeSession.completedLogs, log],
          currentExerciseIndex: state.activeSession.currentExerciseIndex + 1,
          currentSet: 1,
        },
      };
    });
  },

  finishWorkout: async (userId) => {
    const { activeSession } = get();
    if (!activeSession) return;

    const score = calculateScore(activeSession.completedLogs);
    const xpEarned = activeSession.workout.xp_reward;
    const currencyEarned = Math.floor(xpEarned * 0.1);

    try {
      // Update session
      await supabase
        .from('workout_sessions')
        .update({
          completed_at: new Date().toISOString(),
          duration_seconds: activeSession.elapsedSeconds,
          total_score: score,
          xp_earned: xpEarned,
          currency_earned: currencyEarned,
          status: 'completed',
        })
        .eq('id', activeSession.sessionId);

      // Insert exercise logs
      if (activeSession.completedLogs.length > 0) {
        await supabase.from('exercise_logs').insert(
          activeSession.completedLogs.map((log) => ({
            session_id: activeSession.sessionId,
            user_id: userId,
            exercise_id: log.exercise_id,
            exercise_name: log.exercise_id,
            sets_completed: log.sets_completed,
            reps_per_set: log.reps_completed,
            weight_kg: log.weight_kg,
            form_score: log.form_score,
            duration_seconds: log.duration_seconds,
          }))
        );
      }

      // Update user stats
      const isoWeek = getISOWeek(new Date());
      const year = new Date().getFullYear();

      await supabase.from('scores').insert({
        user_id: userId,
        session_id: activeSession.sessionId,
        score,
        xp: xpEarned,
        week_number: isoWeek,
        year,
      });

      // Increment stats
      await supabase.rpc('increment_user_stats', {
        p_user_id: userId,
        p_xp: xpEarned,
        p_currency: currencyEarned,
      });

    } catch (e) {
      console.error('Failed to finish workout:', e);
    } finally {
      set({ activeSession: null });
    }
  },

  abandonWorkout: () => {
    const { activeSession } = get();
    if (!activeSession) return;

    supabase
      .from('workout_sessions')
      .update({ status: 'abandoned' })
      .eq('id', activeSession.sessionId)
      .then(() => set({ activeSession: null }));
  },

  tickTimer: () => {
    set((state) => {
      if (!state.activeSession) return state;
      return {
        activeSession: {
          ...state.activeSession,
          elapsedSeconds: state.activeSession.elapsedSeconds + 1,
        },
      };
    });
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calculateScore(logs: ExerciseLog[]): number {
  if (logs.length === 0) return 0;
  const avgForm = logs.reduce((sum, l) => sum + l.form_score, 0) / logs.length;
  const completionRate = Math.min(logs.length / Math.max(logs.length, 1), 1);
  return Math.round(avgForm * completionRate);
}

function getISOWeek(date: Date): number {
  const tmp = new Date(date);
  tmp.setHours(0, 0, 0, 0);
  tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7));
  const week1 = new Date(tmp.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((tmp.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
    )
  );
}
