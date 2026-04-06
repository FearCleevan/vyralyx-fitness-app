// ─── User & Onboarding ────────────────────────────────────────────────────────

export type Gender = 'male' | 'female' | 'other';
export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';
export type WorkoutEnvironment = 'gym' | 'home' | 'no_equipment';
export type FitnessGoal =
  | 'fat_loss'
  | 'muscle_gain'
  | 'maintenance'
  | 'recomposition';

export interface UserProfile {
  id: string;
  email: string;
  username: string | null;
  avatar_url: string | null;
  gender: Gender | null;
  age: number | null;
  weight_kg: number | null;
  height_cm: number | null;
  fitness_level: FitnessLevel | null;
  environment: WorkoutEnvironment | null;
  goal: FitnessGoal | null;
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface OnboardingData {
  gender?: Gender;
  age?: number;
  weight_kg?: number;
  height_cm?: number;
  fitness_level?: FitnessLevel;
  environment?: WorkoutEnvironment;
  goal?: FitnessGoal;
}

// ─── Workouts ─────────────────────────────────────────────────────────────────

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'core'
  | 'glutes'
  | 'quads'
  | 'hamstrings'
  | 'calves'
  | 'full_body';

export type ExerciseCategory =
  | 'strength'
  | 'cardio'
  | 'flexibility'
  | 'hiit'
  | 'bodyweight';

export interface Exercise {
  id: string;
  name: string;
  description: string;
  muscle_groups: MuscleGroup[];
  category: ExerciseCategory;
  equipment_needed: boolean;
  difficulty: FitnessLevel;
  video_url?: string;
  image_url?: string;
  instructions: string[];
  tips: string[];
}

export interface WorkoutExercise {
  exercise: Exercise;
  sets: number;
  reps: number | string; // e.g. 12 or "45s"
  rest_seconds: number;
  weight_kg?: number;
}

export interface Workout {
  id: string;
  name: string;
  description: string;
  duration_minutes: number;
  difficulty: FitnessLevel;
  goal: FitnessGoal;
  environment: WorkoutEnvironment;
  exercises: WorkoutExercise[];
  xp_reward: number;
  is_premium: boolean;
  day_of_week?: number; // 0=Sun, 1=Mon, ...
}

export interface WorkoutPlan {
  id: string;
  name: string;
  description: string;
  goal: FitnessGoal;
  environment: WorkoutEnvironment;
  level: FitnessLevel;
  duration_weeks: number;
  workouts_per_week: number;
  workouts: Workout[];
}

// ─── Sessions & Logs ─────────────────────────────────────────────────────────

export interface ExerciseLog {
  exercise_id: string;
  sets_completed: number;
  reps_completed: number[];
  weight_kg?: number;
  form_score: number; // 0–100
  duration_seconds: number;
}

export interface WorkoutSession {
  id: string;
  user_id: string;
  workout_id: string;
  started_at: string;
  completed_at?: string;
  duration_seconds: number;
  exercise_logs: ExerciseLog[];
  total_score: number;
  xp_earned: number;
  currency_earned: number;
  status: 'in_progress' | 'completed' | 'abandoned';
}

// ─── Gamification ────────────────────────────────────────────────────────────

export interface UserStats {
  user_id: string;
  level: number;
  xp: number;
  xp_to_next_level: number;
  streak_days: number;
  longest_streak: number;
  last_workout_date: string | null;
  total_workouts: number;
  total_duration_min: number;
  currency_balance: number;
  rank_global: number | null;
  rank_weekly?: number;
  updated_at: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xp_reward: number;
  currency_reward: number;
  unlocked_at?: string;
}

export interface Challenge {
  id: string;
  name: string;
  description: string;
  type: 'daily' | 'weekly' | 'special';
  target_value: number;
  current_value: number;
  xp_reward: number;
  currency_reward: number;
  expires_at: string;
  completed: boolean;
  is_premium: boolean;
}

// ─── Monetization ────────────────────────────────────────────────────────────

export type SubscriptionTier = 'free' | 'premium';

export interface Subscription {
  user_id: string;
  tier: SubscriptionTier;
  started_at: string;
  expires_at?: string;
  battle_pass_active: boolean;
  battle_pass_tier: number;
}

export interface BattlePassTier {
  tier: number;
  xp_required: number;
  free_reward?: BattlePassReward;
  premium_reward?: BattlePassReward;
  unlocked: boolean;
}

export interface BattlePassReward {
  type: 'currency' | 'xp_boost' | 'badge' | 'workout' | 'cosmetic';
  name: string;
  value: number;
  icon: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: 'earn' | 'spend';
  amount: number;
  source:
    | 'workout'
    | 'streak'
    | 'challenge'
    | 'ad'
    | 'purchase'
    | 'store'
    | 'battle_pass'
    | 'starter';
  description: string | null;
  created_at: string;
}

// ─── Pose Detection ──────────────────────────────────────────────────────────

export type KeypointName =
  | 'nose'
  | 'left_eye' | 'right_eye'
  | 'left_ear' | 'right_ear'
  | 'left_shoulder' | 'right_shoulder'
  | 'left_elbow' | 'right_elbow'
  | 'left_wrist' | 'right_wrist'
  | 'left_hip' | 'right_hip'
  | 'left_knee' | 'right_knee'
  | 'left_ankle' | 'right_ankle';

export interface Keypoint {
  x: number;
  y: number;
  score: number;
  name: KeypointName;
}

export interface Pose {
  keypoints: Keypoint[];
  score: number;
}

export type RepPhase = 'up' | 'down' | 'idle';

export interface RepState {
  count: number;
  phase: RepPhase;
  lastAngle: number;
}

export type JointType = 'elbow' | 'knee' | 'hip' | 'shoulder' | 'time';

export interface ExerciseRepConfig {
  jointType: JointType;
  /** Which side's joint to track; 'average' uses mean of both sides */
  side: 'left' | 'right' | 'average';
  /** Angle (°) that defines the "down" position */
  downThreshold: number;
  /** Angle (°) that defines the "up" / lockout position */
  upThreshold: number;
  /** Ideal joint angle at the bottom of the movement (for form scoring) */
  idealDownAngle: number;
  /** Ideal joint angle at the top of the movement */
  idealUpAngle: number;
  /** Human-readable joint description for form feedback */
  jointLabel: string;
}

export interface FormFeedback {
  score: number; // 0–100
  issues: string[];
  hint: string | null;
}

// ─── Camera Session ───────────────────────────────────────────────────────────

export interface CameraSessionExercise {
  exerciseId: string;
  exerciseName: string;
  targetSets: number;
  targetReps: number | string; // number or "30s"
  restSeconds: number;
  config: ExerciseRepConfig;
}

export type CameraSessionPhase = 'exercising' | 'resting' | 'complete';

export interface CameraSessionState {
  exercises: CameraSessionExercise[];
  currentExerciseIndex: number;
  currentSet: number;
  currentReps: number;
  sessionPhase: CameraSessionPhase;
  restSecondsLeft: number;
  pose: Pose | null;
  formFeedback: FormFeedback;
  repState: RepState;
  isModelReady: boolean;
  isDetecting: boolean;
  /** Accumulated logs per exercise slot */
  formScores: number[];
  totalElapsed: number;
}

// ─── Navigation ───────────────────────────────────────────────────────────────

export type RootStackParamList = {
  '(auth)/login': undefined;
  '(auth)/register': undefined;
  'onboarding/index': undefined;
  '(tabs)/index': undefined;
  '(tabs)/workout': undefined;
  '(tabs)/progress': undefined;
  '(tabs)/leaderboard': undefined;
  '(tabs)/store': undefined;
};
