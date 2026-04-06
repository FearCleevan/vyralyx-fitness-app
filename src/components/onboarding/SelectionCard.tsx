import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

interface SelectionCardProps {
  label: string;
  description?: string;
  icon?: string;
  isSelected: boolean;
  onPress: () => void;
}

export function SelectionCard({
  label,
  description,
  icon,
  isSelected,
  onPress,
}: SelectionCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.card, isSelected && styles.cardSelected]}
    >
      {icon && <Text style={styles.icon}>{icon}</Text>}
      <View style={styles.textBlock}>
        <Text style={[styles.label, isSelected && styles.labelSelected]}>{label}</Text>
        {description && (
          <Text style={styles.description}>{description}</Text>
        )}
      </View>
      <View style={[styles.check, isSelected && styles.checkActive]}>
        {isSelected && <Text style={styles.checkmark}>✓</Text>}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 16,
    gap: 14,
  },
  cardSelected: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}15`,
  },
  icon: {
    fontSize: 28,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  label: {
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: 16,
  },
  labelSelected: {
    color: Colors.primaryLight,
  },
  description: {
    color: Colors.textMuted,
    fontSize: 13,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkmark: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
