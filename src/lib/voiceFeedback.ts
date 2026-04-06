/**
 * voiceFeedback.ts
 *
 * expo-speech wrapper that delivers rep counts, set completions, form cues,
 * and motivational callouts during workout sessions.
 *
 * All public functions check the audioStore before speaking — if voice is
 * disabled the call is a silent no-op. Music ducking is coordinated
 * automatically through musicPlayer.
 *
 * Design decisions:
 *   - speak() is fire-and-forget (async, errors are swallowed)
 *   - Queued speech is cancelled before each new utterance so fast reps
 *     don't build up a backlog of "1, 2, 3..." that plays out of sync
 *   - Form cues are throttled: the same cue won't fire again for FORM_CUE_COOLDOWN_MS
 *   - Motivation cues are throttled to MOTIVATION_INTERVAL_MS
 */

import * as Speech from 'expo-speech';
import { musicPlayer } from './musicPlayer';
import { COACH_SCRIPTS, MOTIVATION_INTERVAL_MS } from '@/constants/audio';
import type { CoachStyle } from '@/stores/audioStore';

// ─── Cooldowns ────────────────────────────────────────────────────────────────

const FORM_CUE_COOLDOWN_MS = 8_000;
const REP_SPEAK_DEBOUNCE_MS = 200; // ignore reps that happen < 200 ms apart

let lastFormCueAt = 0;
let lastMotivationAt = 0;
let lastRepSpokeAt = 0;
let lastFormCueText = '';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Core speak function. Cancels any in-flight utterance, ducks music,
 * then speaks. Music is restored via onDone / onStopped callbacks.
 */
async function speak(
  text: string,
  voiceEnabled: boolean,
  voiceVolume: number,
  pitch = 1.0,
  rate = 0.92
): Promise<void> {
  if (!voiceEnabled || !text.trim()) return;

  try {
    // Cancel any current speech to prevent backlog
    await Speech.stop();
  } catch {
    // ignore
  }

  // Duck music before speaking (non-blocking)
  musicPlayer.duck().catch(() => {});

  Speech.speak(text, {
    language: 'en-US',
    pitch,
    rate,
    volume: voiceVolume,
    onDone: () => { musicPlayer.unduck().catch(() => {}); },
    onStopped: () => { musicPlayer.unduck().catch(() => {}); },
    onError: () => { musicPlayer.unduck().catch(() => {}); },
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Announce the current rep number.
 * - Speaks the count for every rep
 * - Switches to anticipation phrases for the final 3 reps
 */
export function speakRep(
  rep: number,
  target: number,
  coachStyle: CoachStyle,
  voiceEnabled: boolean,
  voiceVolume: number
): void {
  const now = Date.now();
  if (now - lastRepSpokeAt < REP_SPEAK_DEBOUNCE_MS) return;
  lastRepSpokeAt = now;

  const scripts = COACH_SCRIPTS[coachStyle];
  const repsLeft = target - rep;

  // Check if we should say a "final reps" phrase instead of the count
  const finalPhrase = target > 0 ? scripts.finalReps(repsLeft) : null;
  const text = finalPhrase ?? scripts.repCount(rep, target);

  const isIntense = coachStyle === 'intense';
  speak(text, voiceEnabled, voiceVolume, isIntense ? 1.1 : 1.0, isIntense ? 1.0 : 0.9)
    .catch(() => {});
}

/**
 * Announce set completion and upcoming rest.
 */
export function speakSetComplete(
  setNum: number,
  totalSets: number,
  restSeconds: number,
  exerciseName: string,
  coachStyle: CoachStyle,
  voiceEnabled: boolean,
  voiceVolume: number
): void {
  const scripts = COACH_SCRIPTS[coachStyle];
  const isLastSet = setNum >= totalSets;

  const text = isLastSet
    ? scripts.allSetsComplete(exerciseName)
    : scripts.setComplete(setNum, totalSets, restSeconds);

  const isIntense = coachStyle === 'intense';
  speak(text, voiceEnabled, voiceVolume, isIntense ? 1.15 : 1.0, isIntense ? 0.95 : 0.88)
    .catch(() => {});
}

/**
 * Announce the next exercise when rest ends.
 */
export function speakResumeExercise(
  exerciseName: string,
  setNum: number,
  coachStyle: CoachStyle,
  voiceEnabled: boolean,
  voiceVolume: number
): void {
  const scripts = COACH_SCRIPTS[coachStyle];
  const text = scripts.resumeExercise(exerciseName, setNum);
  const isIntense = coachStyle === 'intense';
  speak(text, voiceEnabled, voiceVolume, isIntense ? 1.1 : 1.0, isIntense ? 1.0 : 0.9)
    .catch(() => {});
}

/**
 * Speak a form correction cue.
 * Throttled: same cue won't fire again within FORM_CUE_COOLDOWN_MS.
 */
export function speakFormCue(
  hint: string,
  coachStyle: CoachStyle,
  voiceEnabled: boolean,
  voiceVolume: number
): void {
  const now = Date.now();
  if (
    now - lastFormCueAt < FORM_CUE_COOLDOWN_MS &&
    hint === lastFormCueText
  ) return;

  lastFormCueAt = now;
  lastFormCueText = hint;

  const scripts = COACH_SCRIPTS[coachStyle];
  const text = scripts.formCue(hint);
  speak(text, voiceEnabled, voiceVolume, 1.05, 0.9).catch(() => {});
}

/**
 * Fire a random motivational cue.
 * Throttled to MOTIVATION_INTERVAL_MS to avoid spamming.
 */
export function speakMotivation(
  coachStyle: CoachStyle,
  voiceEnabled: boolean,
  voiceVolume: number
): void {
  const now = Date.now();
  if (now - lastMotivationAt < MOTIVATION_INTERVAL_MS) return;
  lastMotivationAt = now;

  const text = randomPick(COACH_SCRIPTS[coachStyle].motivation);
  const isIntense = coachStyle === 'intense';
  speak(text, voiceEnabled, voiceVolume, isIntense ? 1.15 : 1.0, isIntense ? 0.95 : 0.88)
    .catch(() => {});
}

/**
 * Announce workout completion.
 */
export function speakWorkoutComplete(
  exerciseCount: number,
  coachStyle: CoachStyle,
  voiceEnabled: boolean,
  voiceVolume: number
): void {
  const text = COACH_SCRIPTS[coachStyle].workoutComplete(exerciseCount);
  const isIntense = coachStyle === 'intense';
  speak(text, voiceEnabled, voiceVolume, isIntense ? 1.2 : 1.0, isIntense ? 0.9 : 0.85)
    .catch(() => {});
}

/**
 * Immediately stop any in-progress speech and restore music volume.
 */
export async function stopVoice(): Promise<void> {
  try {
    await Speech.stop();
  } catch {
    // ignore
  }
  musicPlayer.unduck().catch(() => {});
  // Reset cooldowns so next session starts fresh
  lastFormCueAt = 0;
  lastMotivationAt = 0;
  lastRepSpokeAt = 0;
  lastFormCueText = '';
}
