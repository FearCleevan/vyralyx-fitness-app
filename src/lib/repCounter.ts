/**
 * repCounter.ts
 *
 * Joint-angle–based rep counting for all exercises in the library.
 *
 * Algorithm (hysteresis state machine):
 *   - idle   → down  when angle drops below downThreshold
 *   - down   → up    when angle rises above upThreshold   (= 1 rep)
 *   - up     → down  on next descent (ready for next rep)
 *
 * Hysteresis prevents false counts from jitter at threshold boundaries.
 */

import { angleBetween, getKeypoint } from './poseDetection';
import type {
  Pose,
  RepState,
  ExerciseRepConfig,
  KeypointName,
} from '@/types';

// ─── Per-exercise configuration ───────────────────────────────────────────────

export const EXERCISE_REP_CONFIGS: Record<string, ExerciseRepConfig> = {
  pushup: {
    jointType: 'elbow',
    side: 'average',
    downThreshold: 95,   // elbows bent ~90°
    upThreshold: 155,    // arms near-extended
    idealDownAngle: 90,
    idealUpAngle: 160,
    jointLabel: 'elbow angle',
  },
  squat: {
    jointType: 'knee',
    side: 'average',
    downThreshold: 95,
    upThreshold: 155,
    idealDownAngle: 90,
    idealUpAngle: 165,
    jointLabel: 'knee angle',
  },
  lunge: {
    jointType: 'knee',
    side: 'left',        // track the front (left) knee
    downThreshold: 100,
    upThreshold: 155,
    idealDownAngle: 95,
    idealUpAngle: 165,
    jointLabel: 'front knee angle',
  },
  glute_bridge: {
    jointType: 'hip',
    side: 'average',
    downThreshold: 145,  // hip near-flat (large angle = extended)
    upThreshold: 170,    // glutes squeezed at top
    idealDownAngle: 140,
    idealUpAngle: 175,
    jointLabel: 'hip extension angle',
  },
  tricep_dip: {
    jointType: 'elbow',
    side: 'average',
    downThreshold: 95,
    upThreshold: 155,
    idealDownAngle: 90,
    idealUpAngle: 160,
    jointLabel: 'elbow angle',
  },
  burpee: {
    // Track hip angle (torso-hip-knee) as a proxy for the squat-down phase
    jointType: 'hip',
    side: 'average',
    downThreshold: 100,
    upThreshold: 155,
    idealDownAngle: 90,
    idealUpAngle: 170,
    jointLabel: 'hip angle',
  },
  mountain_climber: {
    // Track one knee driving toward chest → hip angle changes
    jointType: 'knee',
    side: 'left',
    downThreshold: 80,   // knee driven in
    upThreshold: 150,    // leg extended back
    idealDownAngle: 70,
    idealUpAngle: 160,
    jointLabel: 'knee drive angle',
  },
  pullup: {
    jointType: 'elbow',
    side: 'average',
    downThreshold: 155,  // arms extended at hang
    upThreshold: 80,     // elbows bent at top — inverted thresholds
    idealDownAngle: 160,
    idealUpAngle: 75,
    jointLabel: 'elbow angle',
  },
  barbell_bench_press: {
    jointType: 'elbow',
    side: 'average',
    downThreshold: 95,
    upThreshold: 155,
    idealDownAngle: 90,
    idealUpAngle: 160,
    jointLabel: 'elbow angle',
  },
  barbell_squat: {
    jointType: 'knee',
    side: 'average',
    downThreshold: 95,
    upThreshold: 155,
    idealDownAngle: 90,
    idealUpAngle: 165,
    jointLabel: 'knee angle',
  },
  deadlift: {
    jointType: 'hip',
    side: 'average',
    downThreshold: 80,   // hips hinge forward (small angle)
    upThreshold: 165,    // hips locked out
    idealDownAngle: 75,
    idealUpAngle: 170,
    jointLabel: 'hip hinge angle',
  },
  romanian_deadlift: {
    jointType: 'hip',
    side: 'average',
    downThreshold: 90,
    upThreshold: 165,
    idealDownAngle: 85,
    idealUpAngle: 170,
    jointLabel: 'hip hinge angle',
  },
  overhead_press: {
    jointType: 'elbow',
    side: 'average',
    downThreshold: 95,
    upThreshold: 155,
    idealDownAngle: 90,
    idealUpAngle: 160,
    jointLabel: 'elbow angle',
  },
  plank: {
    // Isometric hold — not rep-based; use time tracking instead
    jointType: 'time',
    side: 'average',
    downThreshold: 0,
    upThreshold: 0,
    idealDownAngle: 180, // perfectly flat body
    idealUpAngle: 180,
    jointLabel: 'body alignment',
  },
};

// ─── Initial state ────────────────────────────────────────────────────────────

export function createInitialRepState(): RepState {
  return { count: 0, phase: 'idle', lastAngle: 0 };
}

// ─── Core update function ─────────────────────────────────────────────────────

/**
 * Given the current pose and the exercise config, compute the next RepState.
 * Returns the previous state unchanged if keypoints have low confidence.
 *
 * @param pose      Most recent MoveNet pose
 * @param config    Per-exercise thresholds
 * @param prev      Previous RepState (mutated into new state)
 * @returns         Updated RepState
 */
export function updateRepState(
  pose: Pose,
  config: ExerciseRepConfig,
  prev: RepState
): RepState {
  if (config.jointType === 'time') return prev; // isometric exercises handled separately

  const angle = measureJointAngle(pose, config);
  if (angle === null) return prev; // insufficient keypoint confidence

  let { count, phase } = prev;
  const isPullUpStyle = config.jointType === 'elbow' && config.downThreshold > config.upThreshold;

  if (isPullUpStyle) {
    // Inverted logic for pull-ups (arms extended = "up" position, elbows bent = "down")
    if (phase === 'idle' || phase === 'up') {
      if (angle >= config.downThreshold) phase = 'down'; // at hang
    } else if (phase === 'down') {
      if (angle <= config.upThreshold) {
        phase = 'up';
        count += 1; // rep complete: hang → chin over bar
      }
    }
  } else {
    // Standard logic: angle small = down, angle large = up
    if (phase === 'idle' || phase === 'up') {
      if (angle <= config.downThreshold) phase = 'down';
    } else if (phase === 'down') {
      if (angle >= config.upThreshold) {
        phase = 'up';
        count += 1; // rep complete: bottom → top
      }
    }
  }

  return { count, phase, lastAngle: angle };
}

// ─── Joint angle measurement ──────────────────────────────────────────────────

/**
 * Compute the relevant joint angle for the exercise type.
 * Returns null if required keypoints are below confidence threshold.
 */
function measureJointAngle(
  pose: Pose,
  config: ExerciseRepConfig
): number | null {
  const { jointType, side } = config;

  const sides: Array<'left' | 'right'> =
    side === 'average' ? ['left', 'right'] : [side];

  const angles: number[] = [];

  for (const s of sides) {
    let angle: number | null = null;

    if (jointType === 'elbow') {
      angle = computeElbowAngle(pose, s);
    } else if (jointType === 'knee') {
      angle = computeKneeAngle(pose, s);
    } else if (jointType === 'hip') {
      angle = computeHipAngle(pose, s);
    } else if (jointType === 'shoulder') {
      angle = computeShoulderAngle(pose, s);
    }

    if (angle !== null) angles.push(angle);
  }

  if (angles.length === 0) return null;
  return angles.reduce((a, b) => a + b, 0) / angles.length;
}

// ─── Per-joint angle functions ────────────────────────────────────────────────

function computeElbowAngle(pose: Pose, side: 'left' | 'right'): number | null {
  const shoulder = getKeypoint(pose, `${side}_shoulder` as KeypointName);
  const elbow    = getKeypoint(pose, `${side}_elbow`    as KeypointName);
  const wrist    = getKeypoint(pose, `${side}_wrist`    as KeypointName);
  if (!shoulder || !elbow || !wrist) return null;
  return angleBetween(shoulder, elbow, wrist);
}

function computeKneeAngle(pose: Pose, side: 'left' | 'right'): number | null {
  const hip   = getKeypoint(pose, `${side}_hip`   as KeypointName);
  const knee  = getKeypoint(pose, `${side}_knee`  as KeypointName);
  const ankle = getKeypoint(pose, `${side}_ankle` as KeypointName);
  if (!hip || !knee || !ankle) return null;
  return angleBetween(hip, knee, ankle);
}

function computeHipAngle(pose: Pose, side: 'left' | 'right'): number | null {
  const shoulder = getKeypoint(pose, `${side}_shoulder` as KeypointName);
  const hip      = getKeypoint(pose, `${side}_hip`      as KeypointName);
  const knee     = getKeypoint(pose, `${side}_knee`     as KeypointName);
  if (!shoulder || !hip || !knee) return null;
  return angleBetween(shoulder, hip, knee);
}

function computeShoulderAngle(pose: Pose, side: 'left' | 'right'): number | null {
  const elbow  = getKeypoint(pose, `${side}_elbow`    as KeypointName);
  const shoulder = getKeypoint(pose, `${side}_shoulder` as KeypointName);
  const hip    = getKeypoint(pose, `${side}_hip`      as KeypointName);
  if (!elbow || !shoulder || !hip) return null;
  return angleBetween(elbow, shoulder, hip);
}

// ─── Default fallback config ──────────────────────────────────────────────────

/**
 * Return the rep config for a given exercise ID, falling back to a generic
 * push-up style if the exercise isn't specifically configured.
 */
export function getRepConfig(exerciseId: string): ExerciseRepConfig {
  return (
    EXERCISE_REP_CONFIGS[exerciseId] ?? EXERCISE_REP_CONFIGS.pushup
  );
}
