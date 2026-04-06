/**
 * WorkoutHUD.tsx
 *
 * Heads-Up Display overlay for the camera workout session.
 *
 * Layout (all absolutely positioned, non-interactive):
 *   ┌─ Top bar ──────────────────────────────────────────────────────────────┐
 *   │  Exercise name          Set x/y   [✕ Abandon]                         │
 *   └────────────────────────────────────────────────────────────────────────┘
 *
 *   ┌─ Bottom panel ─────────────────────────────────────────────────────────┐
 *   │  REP COUNT (giant)   FORM score badge                                  │
 *   │  Target reps   Current joint angle hint                                │
 *   │  Form issue cue (when present)                                         │
 *   │  [Complete Set]  button                                                │
 *   └────────────────────────────────────────────────────────────────────────┘
 */

import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkoutHUDProps {
  exerciseName: string;
  currentSet: number;
  totalSets: number;
  currentReps: number;
  targetReps: number | string;
  formScore: number;
  formHint: string | null;
  isModelReady: boolean;
  isDetecting: boolean;
  onCompleteSet: () => void;
  onAbandon: () => void;
  style?: ViewStyle;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formColor(score: number): string {
  if (score >= 80) return Colors.success;
  if (score >= 55) return Colors.warning;
  return Colors.danger;
}

function formLabel(score: number): string {
  if (score >= 80) return 'Good Form';
  if (score >= 55) return 'Fair Form';
  return 'Fix Form';
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WorkoutHUD({
  exerciseName,
  currentSet,
  totalSets,
  currentReps,
  targetReps,
  formScore,
  formHint,
  isModelReady,
  isDetecting,
  onCompleteSet,
  onAbandon,
}: WorkoutHUDProps) {
  const targetNum = typeof targetReps === 'number' ? targetReps : null;
  const isTimeBased = typeof targetReps === 'string' && targetReps.endsWith('s');
  const progress = targetNum ? Math.min(currentReps / targetNum, 1) : 0;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">

      {/* ── Top Bar ─────────────────────────────────────────────────────── */}
      <LinearGradient
        colors={['rgba(10,10,15,0.85)', 'transparent']}
        style={styles.topBar}
        pointerEvents="box-none"
      >
        {/* Exercise + set info */}
        <View style={styles.topLeft}>
          <Text style={styles.exerciseName} numberOfLines={1}>
            {exerciseName}
          </Text>
          <View style={styles.setRow}>
            <Text style={styles.setLabel}>SET</Text>
            <Text style={styles.setCount}>{currentSet}/{totalSets}</Text>
            {!isModelReady && (
              <View style={styles.loadingBadge}>
                <Text style={styles.loadingText}>Loading AI...</Text>
              </View>
            )}
            {isModelReady && isDetecting && (
              <View style={styles.detectingBadge}>
                <View style={styles.detectingDot} />
                <Text style={styles.detectingText}>Tracking</Text>
              </View>
            )}
          </View>
        </View>

        {/* Abandon button */}
        <Pressable style={styles.abandonBtn} onPress={onAbandon}>
          <Ionicons name="close" size={20} color={Colors.textSecondary} />
        </Pressable>
      </LinearGradient>

      {/* ── Bottom Panel ────────────────────────────────────────────────── */}
      <LinearGradient
        colors={['transparent', 'rgba(10,10,15,0.92)']}
        style={styles.bottomPanel}
        pointerEvents="box-none"
      >
        {/* Form feedback hint */}
        {formHint && (
          <View style={styles.formHintBanner}>
            <Ionicons name="alert-circle" size={14} color={Colors.warning} />
            <Text style={styles.formHintText} numberOfLines={2}>
              {formHint}
            </Text>
          </View>
        )}

        {/* Rep counter row */}
        <View style={styles.repRow}>
          <View style={styles.repCountBlock}>
            <Text style={styles.repCount}>{currentReps}</Text>
            <Text style={styles.repTarget}>
              {isTimeBased ? targetReps : `/ ${targetReps} reps`}
            </Text>
          </View>

          {/* Form score badge */}
          <View style={[styles.formBadge, { borderColor: formColor(formScore) }]}>
            <Text style={[styles.formScore, { color: formColor(formScore) }]}>
              {formScore}
            </Text>
            <Text style={[styles.formLabel, { color: formColor(formScore) }]}>
              {formLabel(formScore)}
            </Text>
          </View>
        </View>

        {/* Progress bar (rep-based exercises only) */}
        {targetNum !== null && (
          <View style={styles.repProgressTrack}>
            <View style={[styles.repProgressFill, { width: `${progress * 100}%` }]} />
          </View>
        )}

        {/* Complete Set button */}
        <Pressable style={styles.completeBtn} onPress={onCompleteSet}>
          <LinearGradient
            colors={Colors.gradient.primary}
            style={styles.completeBtnGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="checkmark-circle" size={18} color="#fff" />
            <Text style={styles.completeBtnText}>Complete Set</Text>
          </LinearGradient>
        </Pressable>
      </LinearGradient>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56, // safe-area-ish
    paddingBottom: 32,
  },
  topLeft: { flex: 1, gap: 4 },
  exerciseName: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  setLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  setCount: { color: Colors.primaryLight, fontSize: 14, fontWeight: '700' },
  loadingBadge: {
    backgroundColor: 'rgba(108,92,231,0.3)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  loadingText: { color: Colors.primaryLight, fontSize: 11, fontWeight: '600' },
  detectingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,184,148,0.2)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  detectingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  detectingText: { color: Colors.success, fontSize: 11, fontWeight: '600' },
  abandonBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },

  // Bottom panel
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 44,
    gap: 12,
  },
  formHintBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(253,203,110,0.15)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(253,203,110,0.3)',
  },
  formHintText: {
    color: Colors.warning,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    lineHeight: 18,
  },

  // Rep counter
  repRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  repCountBlock: { gap: 0 },
  repCount: {
    color: Colors.textPrimary,
    fontSize: 80,
    fontWeight: '900',
    lineHeight: 88,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  repTarget: { color: Colors.textSecondary, fontSize: 16, fontWeight: '600' },

  // Form badge
  formBadge: {
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 6,
  },
  formScore: { fontSize: 28, fontWeight: '900' },
  formLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

  // Progress bar
  repProgressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  repProgressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },

  // Complete button
  completeBtn: { borderRadius: 14, overflow: 'hidden' },
  completeBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  completeBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
