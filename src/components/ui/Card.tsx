import React from 'react';
import { View, type ViewProps, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

interface CardProps extends ViewProps {
  elevated?: boolean;
  padded?: boolean;
}

export function Card({ children, elevated = false, padded = true, style, ...rest }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        elevated && styles.elevated,
        padded && styles.padded,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  elevated: {
    backgroundColor: Colors.bgElevated,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  padded: {
    padding: 16,
  },
});
