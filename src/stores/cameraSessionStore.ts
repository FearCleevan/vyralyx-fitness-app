/**
 * cameraSessionStore.ts
 *
 * Zustand store for the camera-based active workout session.
 *
 * Responsibilities:
 *   - Track current exercise, set, and rep count
 *   - Receive pose updates from the camera screen and route them through
 *     repCounter and formAnalyzer
 *   - Manage the rest-between-sets countdown timer
 *   - Persist completed exercise logs to workoutStore on session finish
 */

import { create } from 'zustand';
import { updateRepState, createInitialRepState, getRepConfig } from '@/lib/repCounter';
import { analyzeForm, averageFormScore } from '@/lib/formAnalyzer';
import type {
  Pose,
  RepState,
  FormFeedback,
  CameraSessionExercise,
  CameraSessionPhase,
  Workout,
  ExerciseLog,
} from '@/types';

// ─── State shape ──────────────────────────────────────────────────────────────

interface CameraSessionStoreState {
  // Session setup
  exercises: CameraSessionExercise[];
  currentExerciseIndex: number;
  currentSet: number;

  // Rep tracking
  currentReps: number;
  repState: RepState;

  // Form tracking
  formFeedback: FormFeedback;
  /** Form scores collected during the current set for averaging */
  currentSetFormScores: number[];

  // Timing
  sessionPhase: CameraSessionPhase;
  restSecondsLeft: number;
  totalElapsed: number;

  // Pose / ML
  pose: Pose | null;
  isModelReady: boolean;
  isDetecting: boolean;

  // Completed logs (for submission to workoutStore on finish)
  completedLogs: ExerciseLog[];

  // ── Actions ────────────────────────────────────────────────────────────────
  /** Load exercise list from a Workout and prepare the session */
  initSession: (workout: Workout) => void;
  /** Feed a new pose frame from the camera; updates reps + form */
  processPose: (pose: Pose) => void;
  /** Mark model as loaded */
  setModelReady: (ready: boolean) => void;
  setDetecting: (detecting: boolean) => void;
  /** Called every second by the session screen's interval */
  tickRestTimer: () => void;
  tickElapsed: () => void;
  /** Manually complete current set / advance */
  completeSet: () => void;
  /** Skip rest and go straight to next set / exercise */
  skipRest: () => void;
  /** Get all accumulated ExerciseLogs for submission */
  getCompletedLogs: () => ExerciseLog[];
  /** Reset the store for a new session */
  reset: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMPTY_FORM: FormFeedback = { score: 100, issues: [], hint: null };

function buildExercises(workout: Workout): CameraSessionExercise[] {
  return workout.exercises.map((we) => ({
    exerciseId: we.exercise.id,
    exerciseName: we.exercise.name,
    targetSets: we.sets,
    targetReps: we.reps,
    restSeconds: we.rest_seconds,
    config: getRepConfig(we.exercise.id),
  }));
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useCameraSessionStore = create<CameraSessionStoreState>((set, get) => ({
  exercises: [],
  currentExerciseIndex: 0,
  currentSet: 1,
  currentReps: 0,
  repState: createInitialRepState(),
  formFeedback: EMPTY_FORM,
  currentSetFormScores: [],
  sessionPhase: 'exercising',
  restSecondsLeft: 0,
  totalElapsed: 0,
  pose: null,
  isModelReady: false,
  isDetecting: false,
  completedLogs: [],

  // ── initSession ─────────────────────────────────────────────────────────────
  initSession: (workout) => {
    set({
      exercises: buildExercises(workout),
      currentExerciseIndex: 0,
      currentSet: 1,
      currentReps: 0,
      repState: createInitialRepState(),
      formFeedback: EMPTY_FORM,
      currentSetFormScores: [],
      sessionPhase: 'exercising',
      restSecondsLeft: 0,
      totalElapsed: 0,
      pose: null,
      completedLogs: [],
    });
  },

  // ── processPose ─────────────────────────────────────────────────────────────
  processPose: (pose) => {
    const state = get();
    const { exercises, currentExerciseIndex, currentSet, sessionPhase, repState } = state;

    if (sessionPhase !== 'exercising') return;

    const exercise = exercises[currentExerciseIndex];
    if (!exercise) return;

    const { config, targetReps } = exercise;
    const targetRepCount = typeof targetReps === 'number' ? targetReps : 0;

    // Update rep state
    const nextRepState = updateRepState(pose, config, repState);
    const newReps = nextRepState.count;

    // Analyse form on the 'down' phase (peak effort)
    let nextFormFeedback = state.formFeedback;
    const newFormScores = [...state.currentSetFormScores];
    if (nextRepState.phase === 'down') {
      nextFormFeedback = analyzeForm(pose, exercise.exerciseId, config);
      newFormScores.push(nextFormFeedback.score);
    }

    // Check if target reps reached
    if (targetRepCount > 0 && newReps >= targetRepCount) {
      // Auto-complete the set
      const avgForm = averageFormScore(newFormScores);
      const log: ExerciseLog = {
        exercise_id: exercise.exerciseId,
        sets_completed: currentSet,
        reps_completed: Array(currentSet).fill(newReps),
        form_score: avgForm,
        duration_seconds: state.totalElapsed,
      };

      const isLastSet = currentSet >= exercise.targetSets;
      const isLastExercise = currentExerciseIndex >= exercises.length - 1;

      set((s) => ({
        pose,
        repState: createInitialRepState(),
        currentReps: 0,
        formFeedback: nextFormFeedback,
        currentSetFormScores: [],
        completedLogs: [...s.completedLogs, log],
        sessionPhase: isLastSet && isLastExercise ? 'complete' : 'resting',
        restSecondsLeft: exercise.restSeconds,
        currentSet: isLastSet ? s.currentSet : currentSet + 1,
        currentExerciseIndex: isLastSet && !isLastExercise
          ? currentExerciseIndex + 1
          : s.currentExerciseIndex,
      }));

      return;
    }

    set({
      pose,
      repState: nextRepState,
      currentReps: newReps,
      formFeedback: nextFormFeedback,
      currentSetFormScores: newFormScores,
    });
  },

  // ── Model readiness ─────────────────────────────────────────────────────────
  setModelReady: (ready) => set({ isModelReady: ready }),
  setDetecting: (detecting) => set({ isDetecting: detecting }),

  // ── Timers ──────────────────────────────────────────────────────────────────
  tickRestTimer: () => {
    const { restSecondsLeft, sessionPhase } = get();
    if (sessionPhase !== 'resting') return;

    if (restSecondsLeft <= 1) {
      set({ restSecondsLeft: 0, sessionPhase: 'exercising' });
    } else {
      set({ restSecondsLeft: restSecondsLeft - 1 });
    }
  },

  tickElapsed: () => {
    set((s) => ({ totalElapsed: s.totalElapsed + 1 }));
  },

  // ── Manual set completion ───────────────────────────────────────────────────
  completeSet: () => {
    const {
      exercises, currentExerciseIndex, currentSet,
      currentReps, currentSetFormScores, totalElapsed,
    } = get();

    const exercise = exercises[currentExerciseIndex];
    if (!exercise) return;

    const avgForm = averageFormScore(currentSetFormScores);
    const log: ExerciseLog = {
      exercise_id: exercise.exerciseId,
      sets_completed: currentSet,
      reps_completed: Array(currentSet).fill(currentReps),
      form_score: avgForm,
      duration_seconds: totalElapsed,
    };

    const isLastSet = currentSet >= exercise.targetSets;
    const isLastExercise = currentExerciseIndex >= exercises.length - 1;

    set((s) => ({
      completedLogs: [...s.completedLogs, log],
      repState: createInitialRepState(),
      currentReps: 0,
      currentSetFormScores: [],
      sessionPhase: isLastSet && isLastExercise ? 'complete' : 'resting',
      restSecondsLeft: exercise.restSeconds,
      currentSet: isLastSet ? 1 : currentSet + 1,
      currentExerciseIndex: isLastSet && !isLastExercise
        ? currentExerciseIndex + 1
        : s.currentExerciseIndex,
    }));
  },

  // ── Skip rest ───────────────────────────────────────────────────────────────
  skipRest: () => {
    set({ restSecondsLeft: 0, sessionPhase: 'exercising' });
  },

  // ── getCompletedLogs ────────────────────────────────────────────────────────
  getCompletedLogs: () => get().completedLogs,

  // ── reset ───────────────────────────────────────────────────────────────────
  reset: () => {
    set({
      exercises: [],
      currentExerciseIndex: 0,
      currentSet: 1,
      currentReps: 0,
      repState: createInitialRepState(),
      formFeedback: EMPTY_FORM,
      currentSetFormScores: [],
      sessionPhase: 'exercising',
      restSecondsLeft: 0,
      totalElapsed: 0,
      pose: null,
      isModelReady: false,
      isDetecting: false,
      completedLogs: [],
    });
  },
}));
