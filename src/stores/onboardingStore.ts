import { create } from 'zustand';
import type { OnboardingData } from '@/types';
import { supabase } from '@/lib/supabase';

interface OnboardingState {
  data: OnboardingData;
  currentStep: number;
  totalSteps: number;
  isSubmitting: boolean;
  error: string | null;

  setField: <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => void;
  nextStep: () => void;
  prevStep: () => void;
  reset: () => void;
  submit: (userId: string) => Promise<boolean>;
}

const INITIAL_DATA: OnboardingData = {
  gender: undefined,
  age: undefined,
  weight_kg: undefined,
  height_cm: undefined,
  fitness_level: undefined,
  environment: undefined,
  goal: undefined,
};

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  data: INITIAL_DATA,
  currentStep: 0,
  totalSteps: 6, // gender, age+body, level, environment, goal, summary
  isSubmitting: false,
  error: null,

  setField: (key, value) => {
    set((state) => ({ data: { ...state.data, [key]: value } }));
  },

  nextStep: () => {
    set((state) => ({
      currentStep: Math.min(state.currentStep + 1, state.totalSteps - 1),
    }));
  },

  prevStep: () => {
    set((state) => ({
      currentStep: Math.max(state.currentStep - 1, 0),
    }));
  },

  reset: () => {
    set({ data: INITIAL_DATA, currentStep: 0, error: null });
  },

  submit: async (userId: string) => {
    const { data } = get();
    set({ isSubmitting: true, error: null });

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          gender: data.gender,
          age: data.age,
          weight_kg: data.weight_kg,
          height_cm: data.height_cm,
          fitness_level: data.fitness_level,
          environment: data.environment,
          goal: data.goal,
          onboarding_complete: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;
      return true;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to save profile';
      set({ error: message });
      return false;
    } finally {
      set({ isSubmitting: false });
    }
  },
}));
