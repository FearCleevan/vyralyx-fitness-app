import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { useOnboardingStore } from '@/stores/onboardingStore';
import { useAuthStore } from '@/stores/authStore';
import { StepIndicator } from '@/components/onboarding/StepIndicator';
import { SelectionCard } from '@/components/onboarding/SelectionCard';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import type {
  Gender,
  FitnessLevel,
  WorkoutEnvironment,
  FitnessGoal,
} from '@/types';

// ─── Step Content ──────────────────────────────────────────────────────────────

function StepGender() {
  const { data, setField } = useOnboardingStore();
  const options: { value: Gender; label: string; icon: string; description: string }[] = [
    { value: 'male',   label: 'Male',   icon: '♂️', description: 'Optimized for male physiology' },
    { value: 'female', label: 'Female', icon: '♀️', description: 'Optimized for female physiology' },
    { value: 'other',  label: 'Other',  icon: '⚧',  description: 'Personalized for you' },
  ];
  return (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>What's your gender?</Text>
      <Text style={styles.stepSubtitle}>We use this to tailor your workout program</Text>
      <View style={styles.optionsList}>
        {options.map((opt) => (
          <SelectionCard
            key={opt.value}
            label={opt.label}
            description={opt.description}
            icon={opt.icon}
            isSelected={data.gender === opt.value}
            onPress={() => setField('gender', opt.value)}
          />
        ))}
      </View>
    </View>
  );
}

function StepBodyMetrics() {
  const { data, setField } = useOnboardingStore();
  return (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Body metrics</Text>
      <Text style={styles.stepSubtitle}>Used to calculate your ideal workout intensity</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Age</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={data.age?.toString() ?? ''}
            onChangeText={(v) => setField('age', parseInt(v) || undefined)}
            keyboardType="numeric"
            placeholder="25"
            placeholderTextColor={Colors.textMuted}
            maxLength={3}
          />
          <Text style={styles.inputUnit}>years</Text>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Weight</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={data.weight_kg?.toString() ?? ''}
            onChangeText={(v) => setField('weight_kg', parseFloat(v) || undefined)}
            keyboardType="decimal-pad"
            placeholder="70"
            placeholderTextColor={Colors.textMuted}
            maxLength={5}
          />
          <Text style={styles.inputUnit}>kg</Text>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Height</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={data.height_cm?.toString() ?? ''}
            onChangeText={(v) => setField('height_cm', parseFloat(v) || undefined)}
            keyboardType="decimal-pad"
            placeholder="175"
            placeholderTextColor={Colors.textMuted}
            maxLength={5}
          />
          <Text style={styles.inputUnit}>cm</Text>
        </View>
      </View>
    </View>
  );
}

function StepFitnessLevel() {
  const { data, setField } = useOnboardingStore();
  const options: { value: FitnessLevel; label: string; icon: string; description: string }[] = [
    { value: 'beginner',     label: 'Beginner',     icon: '🌱', description: 'New to working out, or returning after a long break' },
    { value: 'intermediate', label: 'Intermediate', icon: '💪', description: 'Training consistently for 6+ months' },
    { value: 'advanced',     label: 'Advanced',     icon: '🔥', description: 'Training for 2+ years with a structured program' },
  ];
  return (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Fitness level</Text>
      <Text style={styles.stepSubtitle}>Be honest — this shapes your entire plan</Text>
      <View style={styles.optionsList}>
        {options.map((opt) => (
          <SelectionCard
            key={opt.value}
            label={opt.label}
            description={opt.description}
            icon={opt.icon}
            isSelected={data.fitness_level === opt.value}
            onPress={() => setField('fitness_level', opt.value)}
          />
        ))}
      </View>
    </View>
  );
}

function StepEnvironment() {
  const { data, setField } = useOnboardingStore();
  const options: { value: WorkoutEnvironment; label: string; icon: string; description: string }[] = [
    { value: 'gym',          label: 'Gym',           icon: '🏋️', description: 'Full equipment available — barbells, machines, cables' },
    { value: 'home',         label: 'Home',          icon: '🏠', description: 'Minimal equipment — bands, dumbbells, or a pull-up bar' },
    { value: 'no_equipment', label: 'No Equipment',  icon: '🤸', description: 'Pure bodyweight — anywhere, anytime' },
  ];
  return (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Where do you train?</Text>
      <Text style={styles.stepSubtitle}>We'll generate workouts that fit your setup</Text>
      <View style={styles.optionsList}>
        {options.map((opt) => (
          <SelectionCard
            key={opt.value}
            label={opt.label}
            description={opt.description}
            icon={opt.icon}
            isSelected={data.environment === opt.value}
            onPress={() => setField('environment', opt.value)}
          />
        ))}
      </View>
    </View>
  );
}

function StepGoal() {
  const { data, setField } = useOnboardingStore();
  const options: { value: FitnessGoal; label: string; icon: string; description: string }[] = [
    { value: 'fat_loss',      label: 'Fat Loss',         icon: '🔥', description: 'Burn fat while preserving muscle' },
    { value: 'muscle_gain',   label: 'Muscle Gain',      icon: '💪', description: 'Build size and strength progressively' },
    { value: 'maintenance',   label: 'Lean & Maintain',  icon: '⚖️', description: 'Stay fit and keep what you have' },
    { value: 'recomposition', label: 'Recomposition',    icon: '🔄', description: 'Lose fat and gain muscle simultaneously' },
  ];
  return (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}> your main goal?</Text>
      <Text style={styles.stepSubtitle}>Your entire program will be optimized for this</Text>
      <View style={styles.optionsList}>
        {options.map((opt) => (
          <SelectionCard
            key={opt.value}
            label={opt.label}
            description={opt.description}
            icon={opt.icon}
            isSelected={data.goal === opt.value}
            onPress={() => setField('goal', opt.value)}
          />
        ))}
      </View>
    </View>
  );
}

function StepSummary() {
  const { data } = useOnboardingStore();
  const goalLabels: Record<string, string> = {
    fat_loss: 'Fat Loss',
    muscle_gain: 'Muscle Gain',
    maintenance: 'Lean & Maintain',
    recomposition: 'Recomposition',
  };
  const envLabels: Record<string, string> = {
    gym: 'Gym',
    home: 'Home',
    no_equipment: 'No Equipment',
  };

  const rows = [
    { label: 'Gender',       value: data.gender ?? '—' },
    { label: 'Age',          value: data.age ? `${data.age} years` : '—' },
    { label: 'Weight',       value: data.weight_kg ? `${data.weight_kg} kg` : '—' },
    { label: 'Height',       value: data.height_cm ? `${data.height_cm} cm` : '—' },
    { label: 'Level',        value: data.fitness_level ?? '—' },
    { label: 'Environment',  value: data.environment ? envLabels[data.environment] : '—' },
    { label: 'Goal',         value: data.goal ? goalLabels[data.goal] : '—' },
  ];

  return (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Your profile</Text>
      <Text style={styles.stepSubtitle}>Everything looks good? Let's build your plan!</Text>
      <View style={styles.summaryCard}>
        {rows.map((row, i) => (
          <View key={row.label} style={[styles.summaryRow, i > 0 && styles.summaryRowBorder]}>
            <Text style={styles.summaryLabel}>{row.label}</Text>
            <Text style={styles.summaryValue}>{row.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Validation ────────────────────────────────────────────────────────────────

function validateStep(step: number, data: ReturnType<typeof useOnboardingStore.getState>['data']): string | null {
  switch (step) {
    case 0: return data.gender ? null : 'Please select your gender';
    case 1:
      if (!data.age || data.age < 10 || data.age > 100) return 'Enter a valid age (10–100)';
      if (!data.weight_kg || data.weight_kg < 20) return 'Enter a valid weight';
      if (!data.height_cm || data.height_cm < 100) return 'Enter a valid height';
      return null;
    case 2: return data.fitness_level ? null : 'Please select your fitness level';
    case 3: return data.environment ? null : 'Please select your training environment';
    case 4: return data.goal ? null : 'Please select your fitness goal';
    default: return null;
  }
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

const STEPS = [StepGender, StepBodyMetrics, StepFitnessLevel, StepEnvironment, StepGoal, StepSummary];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { currentStep, totalSteps, nextStep, prevStep, submit, isSubmitting, data } =
    useOnboardingStore();
  const { user, fetchProfile } = useAuthStore();

  const StepComponent = STEPS[currentStep];
  const isLastStep = currentStep === totalSteps - 1;

  const handleNext = useCallback(async () => {
    if (!isLastStep) {
      const error = validateStep(currentStep, data);
      if (error) {
        Alert.alert('Incomplete', error);
        return;
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      nextStep();
    } else {
      // Submit
      if (!user) return;
      const success = await submit(user.id);
      if (success) {
        await fetchProfile();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/(tabs)');
      } else {
        Alert.alert('Error', 'Failed to save your profile. Please try again.');
      }
    }
  }, [currentStep, isLastStep, data, user, submit, fetchProfile, nextStep]);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header gradient */}
      <LinearGradient
        colors={['#0A0A0F', 'transparent']}
        style={styles.topGradient}
        pointerEvents="none"
      />

      {/* Progress */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${((currentStep + 1) / totalSteps) * 100}%` }]} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <View style={styles.contentWrap}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Brand mark */}
            <View style={styles.brandRow}>
              <Text style={styles.brand}>VYRALYX</Text>
              <StepIndicator total={totalSteps} current={currentStep} />
            </View>

            {/* Step content */}
            <StepComponent />
          </ScrollView>
        </View>

        {/* Navigation buttons */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {currentStep > 0 ? (
            <Button
              title="Back"
              variant="ghost"
              size="md"
              style={styles.backBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                prevStep();
              }}
            />
          ) : (
            <View style={styles.backBtnSlot} />
          )}
          <Button
            title={isLastStep ? 'Build My Plan 🚀' : 'Continue'}
            variant="primary"
            size="lg"
            gradient
            isLoading={isSubmitting}
            onPress={handleNext}
            style={styles.nextBtn}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  flex: { flex: 1 },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    zIndex: 1,
  },
  progressBar: {
    height: 3,
    backgroundColor: Colors.bgElevated,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  contentWrap: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 16,
    paddingBottom: 140,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  brand: {
    color: Colors.primary,
    fontWeight: '900',
    fontSize: 18,
    letterSpacing: 3,
  },
  stepContent: {
    flex: 1,
    gap: 20,
  },
  stepTitle: {
    color: Colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
  },
  stepSubtitle: {
    color: Colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginTop: -12,
  },
  optionsList: {
    gap: 12,
  },
  // Body metrics inputs
  inputGroup: { gap: 8 },
  inputLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    height: 56,
    gap: 8,
  },
  input: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  inputUnit: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  // Summary
  summaryCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  summaryRowBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  summaryLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  summaryValue: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  // Footer
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 12,
    padding: 24,
    paddingTop: 12,
    backgroundColor: Colors.bg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  backBtn: {
    width: 80,
  },
  backBtnSlot: {
    width: 80,
  },
  nextBtn: {
    flex: 1,
  },
});
