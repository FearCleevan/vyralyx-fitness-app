/**
 * audio.ts
 *
 * Coach voice scripts and workout music track metadata.
 *
 * Coach styles:
 *   calm   — factual, measured, low-key encouragement
 *   intense — high-energy, hype, direct commands
 *
 * Music tracks:
 *   Place .mp3 files in assets/audio/ and reference them with require().
 *   Remote URLs (https://...) are also accepted by musicPlayer.load().
 */

import type { CoachStyle } from '@/stores/audioStore';

// ─── Coach Scripts ────────────────────────────────────────────────────────────

interface CoachScripts {
  /** Spoken once per rep — just the number */
  repCount: (rep: number, target: number) => string;
  /** Spoken at the last N reps to build anticipation */
  finalReps: (repsLeft: number) => string | null;
  /** Spoken when a set is completed */
  setComplete: (setNum: number, totalSets: number, restSeconds: number) => string;
  /** Spoken when the final set is done */
  allSetsComplete: (exerciseName: string) => string;
  /** Spoken when transitioning back to exercising after rest */
  resumeExercise: (exerciseName: string, setNum: number) => string;
  /** Spoken when a form issue is detected */
  formCue: (cue: string) => string;
  /** Random motivational phrases (picked at random intervals) */
  motivation: string[];
  /** Spoken at workout completion */
  workoutComplete: (exerciseCount: number) => string;
}

export const COACH_SCRIPTS: Record<CoachStyle, CoachScripts> = {
  calm: {
    repCount: (rep) => `${rep}`,
    finalReps: (left) => {
      if (left === 3) return 'Three more';
      if (left === 2) return 'Two more';
      if (left === 1) return 'Last one';
      return null;
    },
    setComplete: (set, total, rest) =>
      `Set ${set} of ${total} complete. Rest for ${rest} seconds.`,
    allSetsComplete: (name) => `${name} done. Moving on.`,
    resumeExercise: (name, set) => `Set ${set}. ${name}. Begin.`,
    formCue: (cue) => cue,
    motivation: [
      'Good work. Keep it steady.',
      'You are doing well.',
      'Stay focused.',
      'Nice pace.',
      'Keep breathing.',
      'Controlled movement.',
      'Almost there.',
    ],
    workoutComplete: (count) =>
      `Workout complete. ${count} exercises finished. Well done.`,
  },

  intense: {
    repCount: (rep) => `${rep}!`,
    finalReps: (left) => {
      if (left === 3) return 'Three more, push it!';
      if (left === 2) return 'Two more, dig deep!';
      if (left === 1) return 'LAST ONE!';
      return null;
    },
    setComplete: (set, total, rest) =>
      set < total
        ? `Set ${set} crushed! ${rest} seconds, then we GO again!`
        : `FINAL SET DOWN! Rest up, you earned it!`,
    allSetsComplete: (name) => `${name} DONE! Let's keep moving!`,
    resumeExercise: (name, set) => `LET'S GO! Set ${set}! ${name}! Push hard!`,
    formCue: (cue) => `${cue}! Fix it now!`,
    motivation: [
      "LET'S GO! Push harder!",
      'You got this! Keep moving!',
      "Don't you dare stop now!",
      'Feel the burn! That means it\'s working!',
      'BEAST MODE! Keep pushing!',
      'No excuses! Grind!',
      'This is where champions are made!',
      'Pain is temporary! Glory is forever!',
    ],
    workoutComplete: (count) =>
      `WORKOUT COMPLETE! ${count} exercises DESTROYED! You are a BEAST!`,
  },
};

// ─── Music Track Metadata ─────────────────────────────────────────────────────

export interface MusicTrack {
  id: string;
  title: string;
  /** Beats per minute — used for future sync features */
  bpm: number;
  /** Energy level 1–3: 1 = warm-up, 2 = moderate, 3 = high-intensity */
  energy: 1 | 2 | 3;
  /**
   * Asset URI. Options:
   *   require('../../assets/audio/track1.mp3')  ← bundled asset (recommended)
   *   'https://...'                              ← remote stream
   *   null                                       ← track unavailable (UI shows dimmed)
   */
  uri: ReturnType<typeof require> | string | null;
}

/**
 * Default track list.
 *
 * TO ADD REAL TRACKS:
 *   1. Drop .mp3 files into assets/audio/
 *   2. Replace `null` with require('../../assets/audio/your-track.mp3')
 *   3. Run `npx expo start` — Metro will bundle them automatically.
 *
 * Royalty-free sources: freemusicarchive.org, pixabay.com/music, incompetech.com
 */
export const MUSIC_TRACKS: MusicTrack[] = [
  {
    id: 'track_warmup',
    title: 'Warm-Up Groove',
    bpm: 120,
    energy: 1,
    uri: null, // replace with: require('../../assets/audio/warmup.mp3')
  },
  {
    id: 'track_steady',
    title: 'Steady State',
    bpm: 135,
    energy: 2,
    uri: null, // replace with: require('../../assets/audio/steady.mp3')
  },
  {
    id: 'track_hype',
    title: 'Beast Mode',
    bpm: 150,
    energy: 3,
    uri: require('../../assets/audio/hype.mp3'),
  },
];

/** Default track index selected when the session starts */
export const DEFAULT_TRACK_INDEX = 1; // Steady State

// ─── Audio session config ─────────────────────────────────────────────────────

/** Volume level music is ducked to when voice cue fires (0–1) */
export const DUCK_VOLUME = 0.15;

/** How long (ms) to wait before force-restoring volume if onDone never fires */
export const DUCK_TIMEOUT_MS = 6000;

/** Minimum interval (ms) between motivational cues to avoid spamming */
export const MOTIVATION_INTERVAL_MS = 45_000;
