/**
 * AudioControls.tsx
 *
 * Compact in-session audio overlay — sits in the top-right of the camera view.
 *
 * Shows:
 *   🎵 Music toggle (tap to mute/unmute) + volume step controls
 *   🎤 Voice toggle (tap to mute/unmute) + volume step controls
 *
 * Designed to be non-intrusive: collapsed by default, expands on tap,
 * auto-collapses after 4 seconds of inactivity.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioStore } from '@/stores/audioStore';
import { Colors } from '@/constants/colors';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const AUTO_COLLAPSE_MS = 4000;
const VOLUME_STEP = 0.15;

// ─── Component ────────────────────────────────────────────────────────────────

export function AudioControls() {
  const {
    voiceEnabled, voiceVolume, musicEnabled, musicVolume,
    setVoiceEnabled, setVoiceVolume, setMusicEnabled, setMusicVolume,
  } = useAudioStore();

  const [expanded, setExpanded] = useState(false);
  const expandAnim = useRef(new Animated.Value(0)).current;
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Collapse timer ───────────────────────────────────────────────────────

  const resetCollapseTimer = useCallback(() => {
    if (collapseTimer.current) clearTimeout(collapseTimer.current);
    collapseTimer.current = setTimeout(() => {
      Animated.timing(expandAnim, { toValue: 0, duration: 200, useNativeDriver: false })
        .start(() => setExpanded(false));
    }, AUTO_COLLAPSE_MS);
  }, [expandAnim]);

  const handleToggle = useCallback(() => {
    if (expanded) {
      if (collapseTimer.current) clearTimeout(collapseTimer.current);
      Animated.timing(expandAnim, { toValue: 0, duration: 200, useNativeDriver: false })
        .start(() => setExpanded(false));
    } else {
      setExpanded(true);
      Animated.spring(expandAnim, { toValue: 1, useNativeDriver: false, tension: 80, friction: 10 })
        .start();
      resetCollapseTimer();
    }
  }, [expanded, expandAnim, resetCollapseTimer]);

  useEffect(() => () => {
    if (collapseTimer.current) clearTimeout(collapseTimer.current);
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const bump = useCallback((
    fn: (v: number) => void,
    current: number,
    delta: number
  ) => {
    fn(Math.max(0, Math.min(1, current + delta)));
    resetCollapseTimer();
  }, [resetCollapseTimer]);

  // ── Icons ────────────────────────────────────────────────────────────────

  const musicIcon: IoniconName = musicEnabled ? 'musical-notes' : 'musical-notes-outline';
  const voiceIcon: IoniconName = voiceEnabled ? 'mic' : 'mic-off';

  const panelWidth = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [44, 256],
  });

  return (
    <Animated.View style={[styles.container, { width: panelWidth }]}>

      {/* ── Expand/collapse toggle ─────────────────────────────────────── */}
      <Pressable style={styles.toggleBtn} onPress={handleToggle}>
        <Ionicons
          name={expanded ? 'chevron-forward' : 'volume-medium'}
          size={18}
          color={Colors.textPrimary}
        />
      </Pressable>

      {/* ── Expanded panel ────────────────────────────────────────────── */}
      {expanded && (
        <View style={styles.controls}>
          {/* Music row */}
          <Pressable
            style={styles.iconBtn}
            onPress={() => { setMusicEnabled(!musicEnabled); resetCollapseTimer(); }}
          >
            <Ionicons name={musicIcon} size={17} color={musicEnabled ? Colors.secondary : Colors.textMuted} />
          </Pressable>
          <VolumeSteps
            value={musicVolume}
            color={Colors.secondary}
            disabled={!musicEnabled}
            onDown={() => bump(setMusicVolume, musicVolume, -VOLUME_STEP)}
            onUp={() => bump(setMusicVolume, musicVolume, VOLUME_STEP)}
          />

          {/* Divider */}
          <View style={styles.divider} />

          {/* Voice row */}
          <Pressable
            style={styles.iconBtn}
            onPress={() => { setVoiceEnabled(!voiceEnabled); resetCollapseTimer(); }}
          >
            <Ionicons name={voiceIcon} size={17} color={voiceEnabled ? Colors.primary : Colors.textMuted} />
          </Pressable>
          <VolumeSteps
            value={voiceVolume}
            color={Colors.primary}
            disabled={!voiceEnabled}
            onDown={() => bump(setVoiceVolume, voiceVolume, -VOLUME_STEP)}
            onUp={() => bump(setVoiceVolume, voiceVolume, VOLUME_STEP)}
          />
        </View>
      )}
    </Animated.View>
  );
}

// ─── VolumeSteps ─────────────────────────────────────────────────────────────

function VolumeSteps({
  value, color, disabled, onDown, onUp,
}: {
  value: number;
  color: string;
  disabled: boolean;
  onDown: () => void;
  onUp: () => void;
}) {
  const bars = Math.round(value * 5); // 0–5 filled bars
  return (
    <View style={vstyles.row}>
      <Pressable style={vstyles.btn} onPress={onDown} disabled={disabled}>
        <Ionicons name="remove" size={13} color={disabled ? Colors.textMuted : color} />
      </Pressable>
      {/* Mini bar visualiser */}
      <View style={vstyles.bars}>
        {[1, 2, 3, 4, 5].map((i) => (
          <View
            key={i}
            style={[
              vstyles.bar,
              { backgroundColor: i <= bars && !disabled ? color : Colors.bgElevated },
            ]}
          />
        ))}
      </View>
      <Pressable style={vstyles.btn} onPress={onUp} disabled={disabled}>
        <Ionicons name="add" size={13} color={disabled ? Colors.textMuted : color} />
      </Pressable>
    </View>
  );
}

const vstyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  btn: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  bars: { flexDirection: 'row', gap: 2, alignItems: 'flex-end' },
  bar: { width: 4, height: 10, borderRadius: 2 },
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10,10,15,0.80)',
    borderRadius: 22,
    overflow: 'hidden',
    height: 44,
    paddingHorizontal: 4,
  },
  toggleBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  controls: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 10,
  },
  iconBtn: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.border,
    marginHorizontal: 2,
  },
});
