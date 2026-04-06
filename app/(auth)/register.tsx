import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (!username.trim() || !email.trim() || !password || !confirm) {
      Alert.alert('Missing fields', 'Please fill in all fields');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Password mismatch', 'Passwords do not match');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Weak password', 'Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { username: username.trim() } },
      });
      if (error) throw error;
      // New user → onboarding
      router.replace('/onboarding');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Registration failed';
      Alert.alert('Registration Failed', msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <LinearGradient colors={Colors.gradient.primary} style={styles.logoBlock}>
            <Text style={styles.logoEmoji}>⚡</Text>
          </LinearGradient>
          <Text style={styles.brand}>Join Vyralyx</Text>
          <Text style={styles.tagline}>Start your transformation today</Text>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="warrior123"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
                autoComplete="username"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={Colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Min. 8 characters"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry
                autoComplete="new-password"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                value={confirm}
                onChangeText={setConfirm}
                placeholder="••••••••"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry
              />
            </View>

            <Button
              title="Create Account"
              variant="primary"
              size="lg"
              gradient
              isLoading={isLoading}
              onPress={handleRegister}
              style={styles.submitBtn}
            />
          </View>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 8,
  },
  logoBlock: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  logoEmoji: { fontSize: 40 },
  brand: {
    color: Colors.textPrimary,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 1,
  },
  tagline: {
    color: Colors.textSecondary,
    fontSize: 15,
    marginBottom: 24,
  },
  form: { width: '100%', gap: 16 },
  inputGroup: { gap: 6 },
  label: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    height: 52,
    color: Colors.textPrimary,
    fontSize: 16,
  },
  submitBtn: { marginTop: 8 },
  loginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
  },
  loginText: { color: Colors.textSecondary, fontSize: 14 },
  loginLink: { color: Colors.primary, fontSize: 14, fontWeight: '700' },
});
