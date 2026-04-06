import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

interface StepIndicatorProps {
  total: number;
  current: number;
}

export function StepIndicator({ total, current }: StepIndicatorProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i === current && styles.dotActive,
            i < current && styles.dotDone,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.bgElevated,
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.primary,
  },
  dotDone: {
    backgroundColor: Colors.primaryDark,
  },
});
