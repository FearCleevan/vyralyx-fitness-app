import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  type TouchableOpacityProps,
  StyleSheet,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/colors';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  gradient?: boolean;
}

const sizeStyles: Record<Size, { height: number; fontSize: number; paddingH: number }> = {
  sm: { height: 40, fontSize: 14, paddingH: 16 },
  md: { height: 52, fontSize: 16, paddingH: 24 },
  lg: { height: 60, fontSize: 18, paddingH: 32 },
};

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  gradient = false,
  style,
  disabled,
  ...rest
}: ButtonProps) {
  const sz = sizeStyles[size];
  const isDisabled = disabled || isLoading;

  const containerStyle = [
    styles.base,
    { height: sz.height, paddingHorizontal: sz.paddingH, borderRadius: sz.height / 2 },
    variant === 'outline' && styles.outline,
    variant === 'ghost' && styles.ghost,
    variant === 'secondary' && styles.secondary,
    variant === 'danger' && styles.danger,
    isDisabled && styles.disabled,
    style,
  ];

  const textStyle = [
    styles.text,
    { fontSize: sz.fontSize },
    variant === 'outline' && styles.textOutline,
    variant === 'ghost' && styles.textGhost,
    variant === 'danger' && styles.textDanger,
    isDisabled && styles.textDisabled,
  ];

  const inner = (
    <View style={styles.inner}>
      {isLoading ? (
        <ActivityIndicator color={variant === 'outline' ? Colors.primary : '#FFF'} size="small" />
      ) : (
        <>
          {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
          <Text style={textStyle}>{title}</Text>
          {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
        </>
      )}
    </View>
  );

  if (gradient && (variant === 'primary' || variant === 'secondary') && !isDisabled) {
    return (
      <TouchableOpacity disabled={isDisabled} {...rest} activeOpacity={0.8}>
        <LinearGradient
          colors={Colors.gradient.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={containerStyle}
        >
          {inner}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[containerStyle, variant === 'primary' && styles.primary]}
      disabled={isDisabled}
      activeOpacity={0.8}
      {...rest}
    >
      {inner}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: Colors.primary,
  },
  secondary: {
    backgroundColor: Colors.bgSurface,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: Colors.danger,
  },
  disabled: {
    opacity: 0.45,
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  textOutline: {
    color: Colors.primary,
  },
  textGhost: {
    color: Colors.textSecondary,
  },
  textDanger: {
    color: '#FFFFFF',
  },
  textDisabled: {
    color: Colors.textMuted,
  },
  iconLeft: { marginRight: 8 },
  iconRight: { marginLeft: 8 },
});
