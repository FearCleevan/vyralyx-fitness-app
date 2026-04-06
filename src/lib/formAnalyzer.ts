/**
 * formAnalyzer.ts
 *
 * Real-time form quality analysis using MoveNet keypoints.
 *
 * Each exercise has a set of checks that evaluate specific joint angles or
 * body alignment against ideal reference ranges. The output is:
 *   - score  : 0–100 (100 = perfect form)
 *   - issues : list of actionable cue strings shown on the HUD
 *   - hint   : single most important cue to show prominently
 */

import { angleBetween, getKeypoint } from './poseDetection';
import type { Pose, FormFeedback, ExerciseRepConfig, KeypointName } from '@/types';

// ─── Deviation tolerance ──────────────────────────────────────────────────────

/** Deduction per degree of deviation from ideal angle */
const DEDUCTION_PER_DEGREE = 0.8;
/** Max deduction per single check (prevents one bad joint wiping the whole score) */
const MAX_DEDUCTION_PER_CHECK = 25;

// ─── Per-exercise form checks ─────────────────────────────────────────────────

interface FormCheck {
  label: string;
  /** Returns number of degrees off ideal (0 = perfect) */
  evaluate: (pose: Pose) => number | null;
  /** Human-readable correction cue */
  cue: string;
}

const FORM_CHECKS: Record<string, FormCheck[]> = {
  pushup: [
    {
      label: 'elbow flare',
      evaluate: (pose) => {
        // Check that elbows aren't flared too wide (shoulder–elbow–wrist angle = elbow angle)
        const leftAngle = measureElbow(pose, 'left');
        const rightAngle = measureElbow(pose, 'right');
        if (leftAngle === null || rightAngle === null) return null;
        // Ideal: 70–110° at the bottom. Check deviation from 90°
        const avg = (leftAngle + rightAngle) / 2;
        return Math.max(0, avg - 110); // penalty only if elbows flare > 110°
      },
      cue: 'Keep elbows at 45° — don\'t flare wide',
    },
    {
      label: 'hip sag',
      evaluate: (pose) => {
        // Body should be a straight line: shoulder–hip–ankle should be ~180°
        return measureBodyAlignment(pose, 'left');
      },
      cue: 'Engage core — don\'t let hips sag',
    },
    {
      label: 'depth',
      evaluate: (pose) => {
        const leftAngle = measureElbow(pose, 'left');
        if (leftAngle === null) return null;
        // Ideal bottom position: ~90°. Penalty if not reaching depth
        return Math.max(0, leftAngle - 100);
      },
      cue: 'Go deeper — chest closer to the floor',
    },
  ],

  squat: [
    {
      label: 'knee cave',
      evaluate: (pose) => {
        // Left and right knees should track outward over toes
        const lHip = getKeypoint(pose, 'left_hip');
        const lKnee = getKeypoint(pose, 'left_knee');
        const lAnkle = getKeypoint(pose, 'left_ankle');
        if (!lHip || !lKnee || !lAnkle) return null;
        // If knee x is between hip x and ankle x — good tracking. Otherwise penalty.
        const trackOk = lKnee.x >= Math.min(lHip.x, lAnkle.x) - 0.02;
        return trackOk ? 0 : 20; // fixed penalty for cave
      },
      cue: 'Push knees out — track over toes',
    },
    {
      label: 'depth',
      evaluate: (pose) => {
        const angle = measureKnee(pose, 'average');
        if (angle === null) return null;
        return Math.max(0, angle - 100); // penalty if not reaching parallel (~90°)
      },
      cue: 'Squat deeper — thighs parallel to floor',
    },
    {
      label: 'forward lean',
      evaluate: (pose) => {
        const shoulder = getKeypoint(pose, 'left_shoulder');
        const hip = getKeypoint(pose, 'left_hip');
        if (!shoulder || !hip) return null;
        // Excessive forward lean: shoulder x far ahead of hip x
        const lean = shoulder.x - hip.x; // positive = shoulder ahead
        return lean > 0.08 ? Math.round(lean * 200) : 0;
      },
      cue: 'Keep chest up — reduce forward lean',
    },
  ],

  deadlift: [
    {
      label: 'rounded back',
      evaluate: (pose) => {
        // Spine alignment: shoulder, hip, and knee should curve, not round
        const shoulder = getKeypoint(pose, 'left_shoulder');
        const hip = getKeypoint(pose, 'left_hip');
        const knee = getKeypoint(pose, 'left_knee');
        if (!shoulder || !hip || !knee) return null;
        const angle = angleBetween(shoulder, hip, knee);
        // At the hinge bottom, ideal angle is ~75–90°. Significant deviation = rounded back
        return Math.max(0, Math.abs(angle - 82) - 15);
      },
      cue: 'Neutral spine — don\'t round your back',
    },
    {
      label: 'bar path',
      evaluate: (pose) => {
        // Bar should stay close to body: wrist should be close to shin (hip x ≈ wrist x)
        const hip = getKeypoint(pose, 'left_hip');
        const wrist = getKeypoint(pose, 'left_wrist');
        if (!hip || !wrist) return null;
        const deviation = Math.abs(hip.x - wrist.x);
        return deviation > 0.1 ? Math.round(deviation * 200) : 0;
      },
      cue: 'Keep the bar close — drag it up your shins',
    },
  ],

  lunge: [
    {
      label: 'front knee',
      evaluate: (pose) => {
        const angle = measureKnee(pose, 'left');
        if (angle === null) return null;
        return Math.max(0, angle - 100); // past 90° = leaning forward
      },
      cue: 'Front shin vertical — knee over ankle',
    },
    {
      label: 'torso upright',
      evaluate: (pose) => {
        const shoulder = getKeypoint(pose, 'left_shoulder');
        const hip = getKeypoint(pose, 'left_hip');
        if (!shoulder || !hip) return null;
        const lean = Math.abs(shoulder.x - hip.x);
        return lean > 0.06 ? Math.round(lean * 200) : 0;
      },
      cue: 'Stay tall — keep torso upright',
    },
  ],

  plank: [
    {
      label: 'hip sag',
      evaluate: (pose) => measureBodyAlignment(pose, 'left'),
      cue: 'Brace your core — lift your hips',
    },
    {
      label: 'hip pike',
      evaluate: (pose) => {
        const align = measureBodyAlignment(pose, 'left');
        if (align === null) return null;
        // Piking = hips too high (negative deviation from straight line)
        return align < -10 ? Math.abs(align + 10) : 0;
      },
      cue: 'Lower your hips — body should be flat',
    },
  ],

  overhead_press: [
    {
      label: 'lockout',
      evaluate: (pose) => {
        const angle = measureElbow(pose, 'average');
        if (angle === null) return null;
        return Math.max(0, 170 - angle); // penalty if not locking out
      },
      cue: 'Full lockout at the top — fully extend arms',
    },
    {
      label: 'lower back arch',
      evaluate: (pose) => measureBodyAlignment(pose, 'left'),
      cue: 'Squeeze glutes — don\'t arch lower back',
    },
  ],
};

// Exercises that don't have specific checks fall back to a generic alignment check
const GENERIC_CHECKS: FormCheck[] = [
  {
    label: 'body alignment',
    evaluate: (pose) => measureBodyAlignment(pose, 'left'),
    cue: 'Maintain good posture throughout the movement',
  },
];

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Analyse form for the given exercise using the current pose.
 * Should be called on every frame where rep phase is 'down' (peak effort).
 */
export function analyzeForm(
  pose: Pose,
  exerciseId: string,
  _config: ExerciseRepConfig // kept for future use (ideal angles)
): FormFeedback {
  const checks = FORM_CHECKS[exerciseId] ?? GENERIC_CHECKS;

  let totalDeduction = 0;
  const issues: string[] = [];

  for (const check of checks) {
    const deviation = check.evaluate(pose);
    if (deviation === null) continue;

    if (deviation > 8) {
      // Threshold of 8° / units before flagging as an issue
      const deduction = Math.min(deviation * DEDUCTION_PER_DEGREE, MAX_DEDUCTION_PER_CHECK);
      totalDeduction += deduction;
      issues.push(check.cue);
    }
  }

  const score = Math.max(0, Math.round(100 - totalDeduction));
  const hint = issues.length > 0 ? issues[0] : null;

  return { score, issues, hint };
}

/**
 * Compute an average form score from an array of per-frame scores.
 * Outlier frames (score < 30) are excluded to avoid penalising transition frames.
 */
export function averageFormScore(scores: number[]): number {
  const valid = scores.filter((s) => s >= 30);
  if (valid.length === 0) return 70; // default if no valid data
  return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function measureElbow(pose: Pose, side: 'left' | 'right' | 'average'): number | null {
  if (side === 'average') {
    const l = measureElbowSide(pose, 'left');
    const r = measureElbowSide(pose, 'right');
    if (l === null && r === null) return null;
    if (l === null) return r;
    if (r === null) return l;
    return (l + r) / 2;
  }
  return measureElbowSide(pose, side);
}

function measureElbowSide(pose: Pose, side: 'left' | 'right'): number | null {
  const shoulder = getKeypoint(pose, `${side}_shoulder` as KeypointName);
  const elbow    = getKeypoint(pose, `${side}_elbow`    as KeypointName);
  const wrist    = getKeypoint(pose, `${side}_wrist`    as KeypointName);
  if (!shoulder || !elbow || !wrist) return null;
  return angleBetween(shoulder, elbow, wrist);
}

function measureKnee(pose: Pose, side: 'left' | 'right' | 'average'): number | null {
  if (side === 'average') {
    const l = measureKneeSide(pose, 'left');
    const r = measureKneeSide(pose, 'right');
    if (l === null && r === null) return null;
    if (l === null) return r;
    if (r === null) return l;
    return (l + r) / 2;
  }
  return measureKneeSide(pose, side);
}

function measureKneeSide(pose: Pose, side: 'left' | 'right'): number | null {
  const hip   = getKeypoint(pose, `${side}_hip`   as KeypointName);
  const knee  = getKeypoint(pose, `${side}_knee`  as KeypointName);
  const ankle = getKeypoint(pose, `${side}_ankle` as KeypointName);
  if (!hip || !knee || !ankle) return null;
  return angleBetween(hip, knee, ankle);
}

/**
 * Measures how much the body deviates from a straight line (shoulder–hip–ankle).
 * Returns positive value for sag (hips below line), negative for pike.
 * Returns null if keypoints aren't visible.
 */
function measureBodyAlignment(pose: Pose, side: 'left' | 'right'): number | null {
  const shoulder = getKeypoint(pose, `${side}_shoulder` as KeypointName);
  const hip      = getKeypoint(pose, `${side}_hip`      as KeypointName);
  const ankle    = getKeypoint(pose, `${side}_ankle`    as KeypointName);
  if (!shoulder || !hip || !ankle) return null;

  const angle = angleBetween(shoulder, hip, ankle);
  // A straight body = ~180°. Deviation from 175° is the sag/pike amount.
  return Math.max(0, 175 - angle);
}
