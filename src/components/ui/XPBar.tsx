import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/colors';

interface XPBarProps {
  level: number;
  xp: number;
  xpToNext: number;
}

export function XPBar({ level, xp, xpToNext }: XPBarProps) {
  const progress = Math.min(xp / xpToNext, 1);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>LV {level}</Text>
        </View>
        <Text style={styles.xpText}>
          {xp.toLocaleString()} / {xpToNext.toLocaleString()} XP
        </Text>
      </View>
      <View style={styles.track}>
        <LinearGradient
          colors={Colors.gradient.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fill, { width: `${progress * 100}%` }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  levelBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  levelText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1,
  },
  xpText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  track: {
    height: 8,
    backgroundColor: Colors.bgElevated,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});
