import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { useWorkoutStore } from '@/stores/workoutStore';
import { useAuthStore } from '@/stores/authStore';
import { WorkoutCard } from '@/components/workout/WorkoutCard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Colors } from '@/constants/colors';
import type { Workout, WorkoutExercise } from '@/types';

export default function WorkoutScreen() {
  const { plan, activeSession, startWorkout, finishWorkout, abandonWorkout, tickTimer } =
    useWorkoutStore();
  const { profile } = useAuthStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);

  // Timer tick every second when session is active
  useEffect(() => {
    if (!activeSession) return;
    const interval = setInterval(tickTimer, 1000);
    return () => clearInterval(interval);
  }, [activeSession, tickTimer]);

  const handleSelectWorkout = (workout: Workout) => {
    setSelectedWorkout(workout);
    setModalVisible(true);
  };

  const handleStart = async () => {
    if (!selectedWorkout || !profile) return;
    setModalVisible(false);
    await startWorkout(selectedWorkout, profile.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleFinish = async () => {
    if (!profile) return;
    Alert.alert('Complete Workout?', 'Mark this session as done?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Complete',
        onPress: async () => {
          await finishWorkout(profile.id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  const handleAbandon = () => {
    Alert.alert('Abandon Workout?', 'Progress will not be saved.', [
      { text: 'Keep Going', style: 'cancel' },
      { text: 'Abandon', style: 'destructive', onPress: abandonWorkout },
    ]);
  };

  // ─ Active Session View ─
  if (activeSession) {
    const { workout, currentExerciseIndex, elapsedSeconds } = activeSession;
    const currentEx: WorkoutExercise | undefined = workout.exercises[currentExerciseIndex];
    const progress = currentExerciseIndex / workout.exercises.length;

    return (
      <SafeAreaView style={styles.safe}>
        <LinearGradient colors={[Colors.bgCard, Colors.bg]} style={styles.sessionHeader}>
          <Text style={styles.sessionTitle}>{workout.name}</Text>
          <Text style={styles.sessionTimer}>{formatTime(elapsedSeconds)}</Text>

          {/* Progress bar */}
          <View style={styles.sessionProgress}>
            <View style={[styles.sessionProgressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.sessionStep}>
            Exercise {currentExerciseIndex + 1} of {workout.exercises.length}
          </Text>
        </LinearGradient>

        <ScrollView contentContainerStyle={styles.sessionContent}>
          {/* Current exercise */}
          {currentEx ? (
            <Card elevated style={styles.currentExCard}>
              <Text style={styles.currentExLabel}>NOW</Text>
              <Text style={styles.currentExName}>{currentEx.exercise.name}</Text>
              <Text style={styles.currentExDetail}>
                {currentEx.sets} sets × {currentEx.reps} reps · Rest: {currentEx.rest_seconds}s
              </Text>
              <View style={styles.currentExTips}>
                {currentEx.exercise.tips.map((tip, i) => (
                  <Text key={i} style={styles.tipText}>• {tip}</Text>
                ))}
              </View>
            </Card>
          ) : (
            <Card style={styles.doneCard}>
              <Text style={styles.doneEmoji}>🏁</Text>
              <Text style={styles.doneTitle}>All exercises done!</Text>
              <Text style={styles.doneSubtitle}>Finish to save your results</Text>
            </Card>
          )}

          {/* Upcoming exercises */}
          <Text style={styles.upcomingLabel}>Upcoming</Text>
          {workout.exercises.slice(currentExerciseIndex + 1).map((ex, i) => (
            <Card key={ex.exercise.id + i} style={styles.upcomingCard}>
              <Text style={styles.upcomingName}>{ex.exercise.name}</Text>
              <Text style={styles.upcomingDetail}>
                {ex.sets}×{ex.reps}
              </Text>
            </Card>
          ))}
        </ScrollView>

        {/* Controls */}
        <View style={styles.sessionFooter}>
          <Button title="Abandon" variant="outline" size="md" onPress={handleAbandon} style={styles.abandonBtn} />
          <Button
            title={currentExerciseIndex >= workout.exercises.length ? 'Finish Workout' : 'Next Exercise'}
            variant="primary"
            size="md"
            gradient
            onPress={handleFinish}
            style={styles.nextExBtn}
          />
        </View>
      </SafeAreaView>
    );
  }

  // ─ Workout List View ─
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Workouts</Text>
        {plan ? (
          <>
            <Text style={styles.planName}>{plan.name}</Text>
            <Text style={styles.planDesc}>{plan.description}</Text>
            <View style={styles.workoutList}>
              {plan.workouts.map((workout) => (
                <WorkoutCard
                  key={workout.id}
                  workout={workout}
                  isLocked={false}
                  onPress={() => handleSelectWorkout(workout)}
                />
              ))}
            </View>
          </>
        ) : (
          <View style={styles.empty}>
            <Ionicons name="barbell-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>Complete onboarding to unlock your workout plan</Text>
          </View>
        )}
      </ScrollView>

      {/* Workout detail modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {selectedWorkout && (
              <>
                <Text style={styles.modalTitle}>{selectedWorkout.name}</Text>
                <Text style={styles.modalDesc}>{selectedWorkout.description}</Text>

                <Text style={styles.modalSectionLabel}>Exercises</Text>
                {selectedWorkout.exercises.map((ex, i) => (
                  <View key={ex.exercise.id + i} style={styles.modalExRow}>
                    <Text style={styles.modalExNum}>{i + 1}</Text>
                    <View style={styles.modalExInfo}>
                      <Text style={styles.modalExName}>{ex.exercise.name}</Text>
                      <Text style={styles.modalExDetail}>
                        {ex.sets} sets × {ex.reps} reps · {ex.rest_seconds}s rest
                      </Text>
                    </View>
                  </View>
                ))}

                <View style={styles.modalActions}>
                  <Button title="Cancel" variant="ghost" size="md" onPress={() => setModalVisible(false)} />
                  <Button title="Start Workout 🚀" variant="primary" size="md" gradient onPress={handleStart} style={styles.startBtn} />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 20, gap: 14, paddingBottom: 40 },
  pageTitle: { color: Colors.textPrimary, fontSize: 26, fontWeight: '800' },
  planName: { color: Colors.primary, fontSize: 16, fontWeight: '700', marginTop: -6 },
  planDesc: { color: Colors.textSecondary, fontSize: 13 },
  workoutList: { gap: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingTop: 80 },
  emptyText: { color: Colors.textMuted, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  // Session
  sessionHeader: {
    padding: 20,
    paddingTop: 24,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sessionTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: '800' },
  sessionTimer: { color: Colors.primary, fontSize: 36, fontWeight: '900', letterSpacing: 2 },
  sessionProgress: {
    height: 4,
    backgroundColor: Colors.bgElevated,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
  },
  sessionProgressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 2 },
  sessionStep: { color: Colors.textMuted, fontSize: 12 },
  sessionContent: { padding: 20, gap: 12, paddingBottom: 40 },
  currentExCard: { gap: 8, borderColor: `${Colors.primary}40` },
  currentExLabel: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  currentExName: { color: Colors.textPrimary, fontSize: 22, fontWeight: '800' },
  currentExDetail: { color: Colors.textSecondary, fontSize: 14 },
  currentExTips: { gap: 4, marginTop: 4 },
  tipText: { color: Colors.textMuted, fontSize: 13 },
  doneCard: { alignItems: 'center', gap: 8, paddingVertical: 28 },
  doneEmoji: { fontSize: 48 },
  doneTitle: { color: Colors.textPrimary, fontSize: 20, fontWeight: '800' },
  doneSubtitle: { color: Colors.textSecondary, fontSize: 14 },
  upcomingLabel: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  upcomingCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  upcomingName: { color: Colors.textSecondary, fontSize: 14 },
  upcomingDetail: { color: Colors.textMuted, fontSize: 13 },
  sessionFooter: {
    flexDirection: 'row',
    gap: 10,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  abandonBtn: { width: 110 },
  nextExBtn: { flex: 1 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: '#000A', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 12,
    maxHeight: '85%',
  },
  modalTitle: { color: Colors.textPrimary, fontSize: 22, fontWeight: '800' },
  modalDesc: { color: Colors.textSecondary, fontSize: 14 },
  modalSectionLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 4,
  },
  modalExRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalExNum: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
    width: 20,
    marginTop: 1,
  },
  modalExInfo: { flex: 1 },
  modalExName: { color: Colors.textPrimary, fontSize: 15, fontWeight: '700' },
  modalExDetail: { color: Colors.textMuted, fontSize: 13 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  startBtn: { flex: 1 },
});
