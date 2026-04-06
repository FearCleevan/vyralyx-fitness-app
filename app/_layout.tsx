import 'react-native-url-polyfill/auto';
import React, { useEffect } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

import { useAuthStore } from '@/stores/authStore';
import { Colors } from '@/constants/colors';

function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, profile, isInitialized, isLoading } = useAuthStore();
  const segments = useSegments();

  useEffect(() => {
    if (!isInitialized || isLoading) return;

    const inAuth = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';

    if (!session) {
      // Not logged in → go to login
      if (!inAuth) router.replace('/(auth)/login');
    } else if (!profile?.onboarding_complete) {
      // Logged in but not onboarded → go to onboarding
      if (!inOnboarding) router.replace('/onboarding');
    } else {
      // Fully onboarded → go to app
      if (inAuth || inOnboarding) router.replace('/(tabs)');
    }
  }, [session, profile, isInitialized, isLoading, segments]);

  if (!isInitialized || isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor={Colors.bg} />
        <AuthGate>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: Colors.bg },
              animation: 'fade',
            }}
          >
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </AuthGate>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bg,
  },
});
