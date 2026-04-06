/**
 * RestTimer.tsx
 *
 * Full-screen rest overlay displayed between sets.
 * Shows a circular countdown, the upcoming exercise/set info, and a
 * "Skip Rest" button.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RestTimerProps {
  secondsLeft: number;
  totalSeconds: number;
  nextExerciseName: string;
  nextSet: number;
  totalSets: number;
  onSkip: () => void;
}

// ─── Circular progress constants ─────────────────────────────────────────────

const RADIUS = 60;
const STROKE = 6;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// ─── Component ────────────────────────────────────────────────────────────────

export function RestTimer({
  secondsLeft,
  totalSeconds,
  nextExerciseName,
  nextSet,
  totalSets,
  onSkip,
}: RestTimerProps) {
  const progress = totalSeconds > 0 ? secondsLeft / totalSeconds : 0;
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  // Pulse animation when 3 seconds left
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (secondsLeft <= 3 && secondsLeft > 0) {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 200,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 200,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [secondsLeft]);

  return (
    <View style={styles.overlay}>
      <LinearGradient
        colors={['rgba(10,10,15,0.97)', 'rgba(19,19,26,0.97)']}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <Text style={styles.restLabel}>REST</Text>

      {/* Circular countdown */}
      <Animated.View style={[styles.circleWrapper, { transform: [{ scale: pulseAnim }] }]}>
        <Svg
          width={(RADIUS + STROKE) * 2}
          height={(RADIUS + STROKE) * 2}
          style={StyleSheet.absoluteFill}
        >
          {/* Track ring */}
          <Circle
            cx={RADIUS + STROKE}
            cy={RADIUS + STROKE}
            r={RADIUS}
            stroke={Colors.bgElevated}
            strokeWidth={STROKE}
            fill="none"
          />
          {/* Progress ring */}
          <Circle
            cx={RADIUS + STROKE}
            cy={RADIUS + STROKE}
            r={RADIUS}
            stroke={secondsLeft <= 3 ? Colors.warning : Colors.primary}
            strokeWidth={STROKE}
            fill="none"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${RADIUS + STROKE}, ${RADIUS + STROKE}`}
          />
        </Svg>
        <Text style={[styles.countdownNum, secondsLeft <= 3 && styles.countdownNumWarn]}>
          {secondsLeft}
        </Text>
        <Text style={styles.countdownSec}>sec</Text>
      </Animated.View>

      {/* Next exercise info */}
      <View style={styles.nextBlock}>
        <Text style={styles.nextLabel}>NEXT UP</Text>
        <Text style={styles.nextName}>{nextExerciseName}</Text>
        <Text style={styles.nextSet}>
          Set {nextSet} of {totalSets}
        </Text>
      </View>

      {/* Tips */}
      <View style={styles.tipRow}>
        <Ionicons name="water-outline" size={16} color={Colors.info} />
        <Text style={styles.tipText}>Breathe, hydrate, prepare for the next set</Text>
      </View>

      {/* Skip button */}
      <Pressable style={styles.skipBtn} onPress={onSkip}>
        <Text style={styles.skipText}>Skip Rest</Text>
        <Ionicons name="play-forward" size={16} color={Colors.primary} />
      </Pressable>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    zIndex: 10,
  },
  restLabel: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },

  // Circle
  circleWrapper: {
    width: (RADIUS + STROKE) * 2,
    height: (RADIUS + STROKE) * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownNum: {
    color: Colors.textPrimary,
    fontSize: 52,
    fontWeight: '900',
    lineHeight: 60,
  },
  countdownNumWarn: { color: Colors.warning },
  countdownSec: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
    marginTop: -4,
  },

  // Next exercise
  nextBlock: { alignItems: 'center', gap: 4 },
  nextLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  nextName: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  nextSet: { color: Colors.primaryLight, fontSize: 14, fontWeight: '600' },

  // Tip
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(116,185,255,0.1)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  tipText: { color: Colors.info, fontSize: 13 },

  // Skip
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  skipText: { color: Colors.primary, fontSize: 14, fontWeight: '700' },
});
