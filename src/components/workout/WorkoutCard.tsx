import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import type { Workout } from '@/types';

interface WorkoutCardProps {
  workout: Workout;
  onPress: () => void;
  isLocked?: boolean;
}

const difficultyColor: Record<string, string> = {
  beginner: Colors.success,
  intermediate: Colors.warning,
  advanced: Colors.danger,
};

const goalIcon: Record<string, string> = {
  fat_loss: '🔥',
  muscle_gain: '💪',
  maintenance: '⚖️',
  recomposition: '🔄',
};

export function WorkoutCard({ workout, onPress, isLocked = false }: WorkoutCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      disabled={isLocked}
      style={[styles.container, isLocked && styles.locked]}
    >
      {/* Gradient top strip */}
      <LinearGradient
        colors={isLocked ? ['#2A2A3A', '#1A1A24'] : Colors.gradient.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.topStrip}
      />

      <View style={styles.body}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.goalIcon}>{goalIcon[workout.goal] ?? '🏋️'}</Text>
            <View style={styles.titleBlock}>
              <Text style={styles.name} numberOfLines={1}>{workout.name}</Text>
              <Text style={styles.description} numberOfLines={1}>{workout.description}</Text>
            </View>
          </View>
          {isLocked ? (
            <Ionicons name="lock-closed" size={18} color={Colors.textMuted} />
          ) : (
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          )}
        </View>

        {/* Stats row */}
        <View style={styles.stats}>
          <StatChip icon="time-outline" label={`${workout.duration_minutes} min`} />
          <StatChip icon="fitness-outline" label={`${workout.exercises.length} exercises`} />
          <View style={[styles.diffBadge, { backgroundColor: `${difficultyColor[workout.difficulty]}20` }]}>
            <Text style={[styles.diffText, { color: difficultyColor[workout.difficulty] }]}>
              {workout.difficulty}
            </Text>
          </View>
        </View>

        {/* XP Reward */}
        <View style={styles.xpRow}>
          <LinearGradient colors={Colors.gradient.primary} style={styles.xpBadge}>
            <Text style={styles.xpText}>+{workout.xp_reward} XP</Text>
          </LinearGradient>
          {workout.is_premium && (
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumText}>⭐ Premium</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function StatChip({ icon, label }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string }) {
  return (
    <View style={styles.chip}>
      <Ionicons name={icon} size={13} color={Colors.textSecondary} />
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  locked: { opacity: 0.6 },
  topStrip: { height: 4 },
  body: { padding: 16, gap: 12 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  goalIcon: { fontSize: 24 },
  titleBlock: { flex: 1 },
  name: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  description: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  stats: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.bgSurface,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  diffBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  diffText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  xpBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  xpText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 12,
  },
  premiumBadge: {
    backgroundColor: `${Colors.gold}20`,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  premiumText: {
    color: Colors.gold,
    fontSize: 11,
    fontWeight: '700',
  },
});
