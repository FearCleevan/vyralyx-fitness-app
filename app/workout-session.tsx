/**
 * workout-session.tsx
 *
 * Full-screen camera workout session screen with:
 *   - Live MoveNet pose detection + skeleton overlay
 *   - Real-time rep counting
 *   - Form analysis with visual + voice cues
 *   - Voice feedback (rep counts, set completions, motivation)
 *   - Background music with auto-ducking during speech
 *   - Rest timer between sets
 *   - AudioControls overlay for quick in-session adjustments
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Pressable,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { CameraType } from 'expo-camera/build/Camera.types';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { initPoseDetector, detectPose, disposePoseDetector } from '@/lib/poseDetection';
import {
  speakRep, speakSetComplete, speakResumeExercise,
  speakFormCue, speakMotivation, speakWorkoutComplete, stopVoice,
} from '@/lib/voiceFeedback';
import { useCameraSessionStore } from '@/stores/cameraSessionStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import { useAuthStore } from '@/stores/authStore';
import { useAudioStore } from '@/stores/audioStore';
import { PoseSkeleton } from '@/components/camera/PoseSkeleton';
import { WorkoutHUD } from '@/components/camera/WorkoutHUD';
import { RestTimer } from '@/components/camera/RestTimer';
import { AudioControls } from '@/components/camera/AudioControls';
import { Colors } from '@/constants/colors';
import type { Workout } from '@/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const INFERENCE_INTERVAL_MS = 150;
const MOTIVATION_CHECK_INTERVAL_MS = 30_000;

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function WorkoutSessionScreen() {
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();

  // ── Stores ────────────────────────────────────────────────────────────────
  const { plan, startWorkout, finishWorkout } = useWorkoutStore();
  const { profile } = useAuthStore();
  const {
    voiceEnabled, voiceVolume, coachStyle, cameraFacing,
    startMusic, pauseMusic, resumeMusic, stopMusic, loadPreferences,
  } = useAudioStore();

  const {
    exercises, currentExerciseIndex, currentSet,
    currentReps, formFeedback, sessionPhase,
    restSecondsLeft, pose, isModelReady, isDetecting,
    initSession, setModelReady, setDetecting,
    tickRestTimer, tickElapsed, completeSet, skipRest,
    getCompletedLogs, reset,
  } = useCameraSessionStore();

  // ── Camera ────────────────────────────────────────────────────────────────
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const facing: CameraType = cameraFacing;

  // ── Local state ───────────────────────────────────────────────────────────
  const [workout, setWorkout] = useState<Workout | null>(null);

  // ── Inference control ─────────────────────────────────────────────────────
  const inferenceRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isInferringRef = useRef(false);

  // ── Prev-value refs for change detection ─────────────────────────────────
  const prevRepsRef = useRef(0);
  const prevPhaseRef = useRef(sessionPhase);
  const prevFormHintRef = useRef<string | null>(null);
  const motivationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadPreferences();
  }, []);

  useEffect(() => {
    if (!plan || !workoutId) return;
    const found = plan.workouts.find((w) => w.id === workoutId);
    if (!found) {
      Alert.alert('Error', 'Workout not found.', [{ text: 'OK', onPress: () => router.back() }]);
      return;
    }
    setWorkout(found);
  }, [plan, workoutId]);

  useEffect(() => {
    if (!workout || !profile) return;

    (async () => {
      await startWorkout(workout, profile.id);
      initSession(workout);
      await startMusic();
      loadModel();
      startMotivationTimer();
    })();

    return () => {
      stopInference();
      disposePoseDetector();
      stopVoice();
      stopMusic();
      reset();
      if (motivationTimerRef.current) clearInterval(motivationTimerRef.current);
    };
  }, [workout, profile]);

  // ── Model loading ─────────────────────────────────────────────────────────
  const loadModel = useCallback(async () => {
    try {
      await initPoseDetector();
      setModelReady(true);
      startInference();
    } catch {
      setModelReady(false);
    }
  }, []);

  // ── Inference loop ────────────────────────────────────────────────────────
  const startInference = useCallback(() => {
    if (inferenceRef.current) return;
    inferenceRef.current = setInterval(runInference, INFERENCE_INTERVAL_MS);
  }, []);

  const stopInference = useCallback(() => {
    if (inferenceRef.current) {
      clearInterval(inferenceRef.current);
      inferenceRef.current = null;
    }
  }, []);

  const runInference = useCallback(async () => {
    if (isInferringRef.current) return;
    if (!cameraRef.current) return;
    if (useCameraSessionStore.getState().sessionPhase !== 'exercising') return;

    isInferringRef.current = true;
    setDetecting(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.2,
        base64: true,
        skipProcessing: true,
        shutterSound: false,
      });
      if (!photo?.base64) return;
      const detectedPose = await detectPose(photo.base64, photo.width, photo.height);
      if (detectedPose) useCameraSessionStore.getState().processPose(detectedPose);
    } catch {
      // swallow frame errors
    } finally {
      isInferringRef.current = false;
      setDetecting(false);
    }
  }, []);

  // ── Timers ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      tickElapsed();
      if (useCameraSessionStore.getState().sessionPhase === 'resting') tickRestTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const startMotivationTimer = useCallback(() => {
    motivationTimerRef.current = setInterval(() => {
      const state = useCameraSessionStore.getState();
      if (state.sessionPhase === 'exercising') {
        speakMotivation(coachStyle, voiceEnabled, voiceVolume);
      }
    }, MOTIVATION_CHECK_INTERVAL_MS);
  }, [coachStyle, voiceEnabled, voiceVolume]);

  // ── React to rep count changes ────────────────────────────────────────────
  useEffect(() => {
    if (currentReps !== prevRepsRef.current && currentReps > 0) {
      const exercise = exercises[currentExerciseIndex];
      const target = typeof exercise?.targetReps === 'number' ? exercise.targetReps : 0;
      speakRep(currentReps, target, coachStyle, voiceEnabled, voiceVolume);
      prevRepsRef.current = currentReps;
    }
  }, [currentReps]);

  // ── React to form hint changes ────────────────────────────────────────────
  useEffect(() => {
    const hint = formFeedback.hint;
    if (hint && hint !== prevFormHintRef.current) {
      speakFormCue(hint, coachStyle, voiceEnabled, voiceVolume);
      prevFormHintRef.current = hint;
    }
  }, [formFeedback.hint]);

  // ── React to session phase changes ────────────────────────────────────────
  useEffect(() => {
    if (sessionPhase === prevPhaseRef.current) return;
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = sessionPhase;
    prevRepsRef.current = 0; // reset rep tracking for new set

    if (sessionPhase === 'resting') {
      stopInference();
      pauseMusic();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const exercise = exercises[currentExerciseIndex];
      if (exercise) {
        speakSetComplete(
          currentSet, exercise.targetSets, exercise.restSeconds,
          exercise.exerciseName, coachStyle, voiceEnabled, voiceVolume
        );
      }
    } else if (sessionPhase === 'exercising') {
      if (prev === 'resting') {
        resumeMusic();
        if (isModelReady) startInference();
        const exercise = exercises[currentExerciseIndex];
        if (exercise) {
          speakResumeExercise(exercise.exerciseName, currentSet, coachStyle, voiceEnabled, voiceVolume);
        }
      }
    } else if (sessionPhase === 'complete') {
      stopInference();
      stopMusic();
      speakWorkoutComplete(exercises.length, coachStyle, voiceEnabled, voiceVolume);
      handleFinish();
    }
  }, [sessionPhase]);

  // ── Finish ────────────────────────────────────────────────────────────────
  const handleFinish = useCallback(async () => {
    if (!profile) return;
    const logs = getCompletedLogs();
    const workoutStoreState = useWorkoutStore.getState();
    if (workoutStoreState.activeSession) {
      for (const log of logs) workoutStoreState.completeExercise(log);
    }
    await finishWorkout(profile.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      'Workout Complete! 🏆',
      `Great work! You earned ${workout?.xp_reward ?? 0} XP.`,
      [{ text: 'View Progress', onPress: () => router.replace('/(tabs)/progress') }]
    );
  }, [profile, workout, finishWorkout, getCompletedLogs]);

  const handleAbandon = useCallback(() => {
    Alert.alert('Abandon Workout?', 'Progress will not be saved.', [
      { text: 'Keep Going', style: 'cancel' },
      {
        text: 'Abandon',
        style: 'destructive',
        onPress: () => {
          stopInference();
          stopVoice();
          stopMusic();
          useWorkoutStore.getState().abandonWorkout();
          router.back();
        },
      },
    ]);
  }, [stopInference, stopMusic]);

  // ── Permission gate ───────────────────────────────────────────────────────
  if (!permission) return <LoadingScreen message="Checking camera permission…" />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionScreen}>
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionDesc}>
          Allow camera access to enable AI rep counting and form analysis.
        </Text>
        <Pressable style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Allow Camera</Text>
        </Pressable>
        <Pressable style={styles.permissionSkip} onPress={() => router.back()}>
          <Text style={styles.permissionSkipText}>Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (!workout) return <LoadingScreen message="Loading workout…" />;

  // ── Derived ───────────────────────────────────────────────────────────────
  const currentExercise = exercises[currentExerciseIndex];
  const nextExercise = exercises[currentExerciseIndex + 1];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Camera preview */}
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} flash="off" />

      {/* Pose skeleton */}
      <PoseSkeleton pose={pose} viewWidth={SCREEN_W} viewHeight={SCREEN_H} />

      {/* Workout HUD */}
      {sessionPhase === 'exercising' && currentExercise && (
        <WorkoutHUD
          exerciseName={currentExercise.exerciseName}
          currentSet={currentSet}
          totalSets={currentExercise.targetSets}
          currentReps={currentReps}
          targetReps={currentExercise.targetReps}
          formScore={formFeedback.score}
          formHint={formFeedback.hint}
          isModelReady={isModelReady}
          isDetecting={isDetecting}
          onCompleteSet={completeSet}
          onAbandon={handleAbandon}
        />
      )}

      {/* Audio controls — top-right corner */}
      <View style={styles.audioControlsAnchor} pointerEvents="box-none">
        <AudioControls />
      </View>

      {/* Rest timer */}
      {sessionPhase === 'resting' && (
        <RestTimer
          secondsLeft={restSecondsLeft}
          totalSeconds={currentExercise?.restSeconds ?? 60}
          nextExerciseName={
            currentSet < (currentExercise?.targetSets ?? 1)
              ? (currentExercise?.exerciseName ?? '')
              : (nextExercise?.exerciseName ?? 'Final set done!')
          }
          nextSet={currentSet}
          totalSets={currentExercise?.targetSets ?? 1}
          onSkip={skipRest}
        />
      )}

      {/* Completion overlay */}
      {sessionPhase === 'complete' && (
        <View style={styles.completeOverlay}>
          <Text style={styles.completeTrophy}>🏆</Text>
          <Text style={styles.completeTitle}>All Done!</Text>
          <Text style={styles.completeDesc}>Saving your results…</Text>
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 16 }} />
        </View>
      )}

      {/* Model loading badge */}
      {!isModelReady && sessionPhase === 'exercising' && (
        <View style={styles.modelLoadingBadge}>
          <ActivityIndicator size="small" color={Colors.primaryLight} />
          <Text style={styles.modelLoadingText}>Loading AI model…</Text>
        </View>
      )}
    </View>
  );
}

// ─── Loading screen ───────────────────────────────────────────────────────────

function LoadingScreen({ message }: { message: string }) {
  return (
    <View style={styles.loadingScreen}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={styles.loadingMsg}>{message}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  // Audio controls anchor — top-right, below safe area
  audioControlsAnchor: {
    position: 'absolute',
    top: 60,
    right: 16,
  },

  // Permission
  permissionScreen: {
    flex: 1, backgroundColor: Colors.bg, alignItems: 'center',
    justifyContent: 'center', padding: 32, gap: 16,
  },
  permissionTitle: { color: Colors.textPrimary, fontSize: 22, fontWeight: '800', textAlign: 'center' },
  permissionDesc: { color: Colors.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  permissionBtn: {
    backgroundColor: Colors.primary, borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 32, marginTop: 8,
  },
  permissionBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  permissionSkip: { marginTop: 4 },
  permissionSkipText: { color: Colors.textMuted, fontSize: 14 },

  // Loading
  loadingScreen: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingMsg: { color: Colors.textSecondary, fontSize: 15 },

  // Complete overlay
  completeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,10,15,0.95)',
    alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  completeTrophy: { fontSize: 72 },
  completeTitle: { color: Colors.textPrimary, fontSize: 32, fontWeight: '900' },
  completeDesc: { color: Colors.textSecondary, fontSize: 15 },

  // Model badge
  modelLoadingBadge: {
    position: 'absolute',
    bottom: 120,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(10,10,15,0.75)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  modelLoadingText: { color: Colors.primaryLight, fontSize: 13, fontWeight: '600' },
});
