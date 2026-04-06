/**
 * settings.tsx  (app/settings.tsx)
 *
 * Full settings screen — accessible via the gear icon on the Dashboard.
 *
 * Sections:
 *   🔊 Voice Feedback  — toggle, volume steps, coach style picker
 *   🎵 Music           — toggle, volume steps, track selector
 *   📷 Camera          — facing preference
 *   👤 Account         — display name, email, sign out
 *   ℹ️  About           — version info
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAudioStore, type CoachStyle, type CameraFacing } from '@/stores/audioStore';
import { useAuthStore } from '@/stores/authStore';
import { MUSIC_TRACKS } from '@/constants/audio';
import { Colors } from '@/constants/colors';

const VOLUME_STEP = 0.15;

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const {
    voiceEnabled, voiceVolume, coachStyle,
    musicEnabled, musicVolume, selectedTrackIndex,
    cameraFacing,
    setVoiceEnabled, setVoiceVolume, setCoachStyle,
    setMusicEnabled, setMusicVolume, setSelectedTrack,
    setCameraFacing,
    loadPreferences,
  } = useAudioStore();

  const { profile, signOut } = useAuthStore();

  useEffect(() => {
    loadPreferences();
  }, []);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Header ────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Voice Feedback ──────────────────────────────────────────── */}
        <SectionHeader icon="mic" title="Voice Feedback" />

        <SettingCard>
          <SettingRow
            label="Voice Coach"
            right={
              <Switch
                value={voiceEnabled}
                onValueChange={setVoiceEnabled}
                trackColor={{ false: Colors.bgElevated, true: `${Colors.primary}80` }}
                thumbColor={voiceEnabled ? Colors.primary : Colors.textMuted}
              />
            }
          />

          <Separator />

          <SettingRow
            label="Volume"
            right={
              <VolumeControl
                value={voiceVolume}
                color={Colors.primary}
                disabled={!voiceEnabled}
                onChange={(v) => setVoiceVolume(Math.max(0, Math.min(1, voiceVolume + v)))}
              />
            }
          />

          <Separator />

          <View style={styles.coachStyleSection}>
            <Text style={styles.coachStyleLabel}>Coach Style</Text>
            <View style={styles.coachStyleRow}>
              {(['calm', 'intense'] as CoachStyle[]).map((style) => (
                <Pressable
                  key={style}
                  style={[
                    styles.styleChip,
                    coachStyle === style && styles.styleChipActive,
                    !voiceEnabled && styles.styleChipDisabled,
                  ]}
                  onPress={() => voiceEnabled && setCoachStyle(style)}
                >
                  <Text style={[
                    styles.styleChipText,
                    coachStyle === style && styles.styleChipTextActive,
                    !voiceEnabled && styles.styleChipTextDisabled,
                  ]}>
                    {style === 'calm' ? '😌 Calm' : '🔥 Intense'}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.styleDesc}>
              {coachStyle === 'calm'
                ? 'Factual rep counts and measured cues.'
                : 'High-energy hype and direct commands.'}
            </Text>
          </View>
        </SettingCard>

        {/* ── Background Music ────────────────────────────────────────── */}
        <SectionHeader icon="musical-notes" title="Background Music" />

        <SettingCard>
          <SettingRow
            label="Workout Music"
            right={
              <Switch
                value={musicEnabled}
                onValueChange={(v) => setMusicEnabled(v)}
                trackColor={{ false: Colors.bgElevated, true: `${Colors.secondary}80` }}
                thumbColor={musicEnabled ? Colors.secondary : Colors.textMuted}
              />
            }
          />

          <Separator />

          <SettingRow
            label="Volume"
            right={
              <VolumeControl
                value={musicVolume}
                color={Colors.secondary}
                disabled={!musicEnabled}
                onChange={(v) => setMusicVolume(Math.max(0, Math.min(1, musicVolume + v)))}
              />
            }
          />

          <Separator />

          <View style={styles.trackSection}>
            <Text style={styles.trackLabel}>Track</Text>
            {MUSIC_TRACKS.map((track, i) => (
              <Pressable
                key={track.id}
                style={[
                  styles.trackRow,
                  selectedTrackIndex === i && styles.trackRowActive,
                  !musicEnabled && styles.trackRowDisabled,
                ]}
                onPress={() => musicEnabled && setSelectedTrack(i)}
              >
                <View style={styles.trackInfo}>
                  <Text style={[
                    styles.trackName,
                    selectedTrackIndex === i && styles.trackNameActive,
                  ]}>
                    {track.title}
                  </Text>
                  <Text style={styles.trackMeta}>
                    {track.bpm} BPM · {'⚡'.repeat(track.energy)}
                    {track.uri === null && ' · No file'}
                  </Text>
                </View>
                {selectedTrackIndex === i && (
                  <Ionicons name="checkmark-circle" size={18} color={Colors.secondary} />
                )}
              </Pressable>
            ))}
            <Text style={styles.trackHint}>
              Add .mp3 files to assets/audio/ to enable tracks.
            </Text>
          </View>
        </SettingCard>

        {/* ── Camera ──────────────────────────────────────────────────── */}
        <SectionHeader icon="camera" title="Camera" />

        <SettingCard>
          <View style={styles.facingRow}>
            <Text style={styles.facingLabel}>Default Camera</Text>
            <View style={styles.facingBtns}>
              {(['front', 'back'] as CameraFacing[]).map((f) => (
                <Pressable
                  key={f}
                  style={[styles.facingBtn, cameraFacing === f && styles.facingBtnActive]}
                  onPress={() => setCameraFacing(f)}
                >
                  <Ionicons
                    name={f === 'front' ? 'camera-reverse' : 'camera'}
                    size={16}
                    color={cameraFacing === f ? Colors.primary : Colors.textMuted}
                  />
                  <Text style={[
                    styles.facingBtnText,
                    cameraFacing === f && styles.facingBtnTextActive,
                  ]}>
                    {f === 'front' ? 'Front' : 'Back'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <Text style={styles.facingHint}>
            Front camera is recommended for most exercises so you can see the skeleton overlay.
          </Text>
        </SettingCard>

        {/* ── Account ─────────────────────────────────────────────────── */}
        <SectionHeader icon="person-circle" title="Account" />

        <SettingCard>
          <View style={styles.accountInfo}>
            <View style={styles.accountAvatar}>
              <Text style={styles.accountAvatarText}>
                {(profile?.username ?? profile?.email ?? 'A')[0].toUpperCase()}
              </Text>
            </View>
            <View style={styles.accountDetails}>
              <Text style={styles.accountName}>{profile?.username ?? 'Athlete'}</Text>
              <Text style={styles.accountEmail}>{profile?.email ?? ''}</Text>
            </View>
          </View>

          <Separator />

          <Pressable style={styles.signOutBtn} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={18} color={Colors.danger} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
        </SettingCard>

        {/* ── About ───────────────────────────────────────────────────── */}
        <SectionHeader icon="information-circle" title="About" />

        <SettingCard>
          <AboutRow label="App" value="Vyralyx" />
          <Separator />
          <AboutRow label="Version" value="2.0.0 (Phase 3)" />
          <Separator />
          <AboutRow label="AI Engine" value="MoveNet Lightning" />
          <Separator />
          <AboutRow label="Backend" value="Supabase" />
        </SettingCard>

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ icon, title }: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={15} color={Colors.primary} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function SettingCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function SettingRow({ label, right }: { label: string; right: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {right}
    </View>
  );
}

function Separator() {
  return <View style={styles.sep} />;
}

function AboutRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.aboutValue}>{value}</Text>
    </View>
  );
}

function VolumeControl({
  value, color, disabled, onChange,
}: {
  value: number;
  color: string;
  disabled: boolean;
  onChange: (delta: number) => void;
}) {
  const bars = Math.round(value * 5);
  return (
    <View style={vcStyles.row}>
      <Pressable onPress={() => !disabled && onChange(-VOLUME_STEP)} style={vcStyles.btn}>
        <Ionicons name="remove" size={16} color={disabled ? Colors.textMuted : color} />
      </Pressable>
      <View style={vcStyles.bars}>
        {[1, 2, 3, 4, 5].map((i) => (
          <View
            key={i}
            style={[
              vcStyles.bar,
              { height: 6 + i * 3 },
              { backgroundColor: i <= bars && !disabled ? color : Colors.bgElevated },
            ]}
          />
        ))}
      </View>
      <Pressable onPress={() => !disabled && onChange(VOLUME_STEP)} style={vcStyles.btn}>
        <Ionicons name="add" size={16} color={disabled ? Colors.textMuted : color} />
      </Pressable>
    </View>
  );
}

const vcStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  bar: { width: 5, borderRadius: 2 },
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: Colors.textPrimary, fontSize: 17, fontWeight: '700' },

  content: { padding: 16, gap: 6, paddingBottom: 40 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLabel: { color: Colors.textPrimary, fontSize: 15 },
  sep: { height: 1, backgroundColor: Colors.border, marginHorizontal: 16 },

  // Coach style
  coachStyleSection: { padding: 16, gap: 10 },
  coachStyleLabel: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
  coachStyleRow: { flexDirection: 'row', gap: 10 },
  styleChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  styleChipActive: {
    backgroundColor: `${Colors.primary}20`,
    borderColor: Colors.primary,
  },
  styleChipDisabled: { opacity: 0.4 },
  styleChipText: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600' },
  styleChipTextActive: { color: Colors.primary },
  styleChipTextDisabled: { color: Colors.textMuted },
  styleDesc: { color: Colors.textMuted, fontSize: 12, lineHeight: 18 },

  // Music tracks
  trackSection: { padding: 16, gap: 8 },
  trackLabel: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 4 },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  trackRowActive: { borderColor: Colors.secondary, backgroundColor: `${Colors.secondary}15` },
  trackRowDisabled: { opacity: 0.4 },
  trackInfo: { gap: 2 },
  trackName: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600' },
  trackNameActive: { color: Colors.textPrimary },
  trackMeta: { color: Colors.textMuted, fontSize: 12 },
  trackHint: { color: Colors.textMuted, fontSize: 11, lineHeight: 16, marginTop: 4 },

  // Camera facing
  facingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  facingLabel: { color: Colors.textPrimary, fontSize: 15 },
  facingBtns: { flexDirection: 'row', gap: 8 },
  facingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  facingBtnActive: { borderColor: Colors.primary, backgroundColor: `${Colors.primary}18` },
  facingBtnText: { color: Colors.textMuted, fontSize: 13, fontWeight: '600' },
  facingBtnTextActive: { color: Colors.primary },
  facingHint: { color: Colors.textMuted, fontSize: 12, paddingHorizontal: 16, paddingBottom: 14, lineHeight: 18 },

  // Account
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
  },
  accountAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${Colors.primary}30`,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountAvatarText: { color: Colors.primary, fontSize: 20, fontWeight: '800' },
  accountDetails: { gap: 3 },
  accountName: { color: Colors.textPrimary, fontSize: 16, fontWeight: '700' },
  accountEmail: { color: Colors.textMuted, fontSize: 13 },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
  },
  signOutText: { color: Colors.danger, fontSize: 15, fontWeight: '600' },

  // About
  aboutValue: { color: Colors.textSecondary, fontSize: 14 },

  bottomPad: { height: 20 },
});
