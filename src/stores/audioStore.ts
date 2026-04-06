/**
 * audioStore.ts
 *
 * Zustand store for all audio preferences.
 * Preferences are persisted to AsyncStorage so they survive app restarts.
 *
 * Includes:
 *   - Voice feedback toggle + volume
 *   - Coach style ('calm' | 'intense')
 *   - Background music toggle + volume
 *   - Selected music track index
 *   - Camera facing preference (front / back) — stored here for convenience
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { musicPlayer } from '@/lib/musicPlayer';
import { MUSIC_TRACKS, DEFAULT_TRACK_INDEX } from '@/constants/audio';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CoachStyle = 'calm' | 'intense';
export type CameraFacing = 'front' | 'back';

interface AudioPreferences {
  voiceEnabled: boolean;
  voiceVolume: number;       // 0–1
  coachStyle: CoachStyle;
  musicEnabled: boolean;
  musicVolume: number;       // 0–1
  selectedTrackIndex: number;
  cameraFacing: CameraFacing;
}

interface AudioStoreState extends AudioPreferences {
  isLoaded: boolean;

  // ── Actions ────────────────────────────────────────────────────────────────
  loadPreferences: () => Promise<void>;
  savePreferences: () => Promise<void>;

  setVoiceEnabled: (enabled: boolean) => void;
  setVoiceVolume: (volume: number) => void;
  setCoachStyle: (style: CoachStyle) => void;

  setMusicEnabled: (enabled: boolean) => Promise<void>;
  setMusicVolume: (volume: number) => Promise<void>;
  setSelectedTrack: (index: number) => Promise<void>;

  setCameraFacing: (facing: CameraFacing) => void;

  /** Load and begin playing the selected track (call on session start). */
  startMusic: () => Promise<void>;
  /** Pause music (call during rest or on session end). */
  pauseMusic: () => Promise<void>;
  /** Resume music (call when rest ends). */
  resumeMusic: () => Promise<void>;
  /** Stop and unload music completely (call on session unmount). */
  stopMusic: () => Promise<void>;
}

// ─── AsyncStorage key ─────────────────────────────────────────────────────────

const STORAGE_KEY = '@vyralyx:audio_preferences';

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULTS: AudioPreferences = {
  voiceEnabled: true,
  voiceVolume: 0.9,
  coachStyle: 'calm',
  musicEnabled: true,
  musicVolume: 0.65,
  selectedTrackIndex: DEFAULT_TRACK_INDEX,
  cameraFacing: 'front',
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAudioStore = create<AudioStoreState>((set, get) => ({
  ...DEFAULTS,
  isLoaded: false,

  // ── Persistence ─────────────────────────────────────────────────────────────

  loadPreferences: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved: Partial<AudioPreferences> = JSON.parse(raw);
        set({ ...DEFAULTS, ...saved, isLoaded: true });
      } else {
        set({ isLoaded: true });
      }
    } catch {
      set({ isLoaded: true });
    }
  },

  savePreferences: async () => {
    const state = get();
    const prefs: AudioPreferences = {
      voiceEnabled: state.voiceEnabled,
      voiceVolume: state.voiceVolume,
      coachStyle: state.coachStyle,
      musicEnabled: state.musicEnabled,
      musicVolume: state.musicVolume,
      selectedTrackIndex: state.selectedTrackIndex,
      cameraFacing: state.cameraFacing,
    };
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // Non-fatal — preferences just won't persist this session
    }
  },

  // ── Voice ─────────────────────────────────────────────────────────────────

  setVoiceEnabled: (enabled) => {
    set({ voiceEnabled: enabled });
    get().savePreferences();
  },

  setVoiceVolume: (volume) => {
    set({ voiceVolume: Math.max(0, Math.min(1, volume)) });
    get().savePreferences();
  },

  setCoachStyle: (style) => {
    set({ coachStyle: style });
    get().savePreferences();
  },

  // ── Music ─────────────────────────────────────────────────────────────────

  setMusicEnabled: async (enabled) => {
    set({ musicEnabled: enabled });
    get().savePreferences();
    if (!enabled) {
      await musicPlayer.pause();
    } else if (musicPlayer.isLoaded()) {
      await musicPlayer.play();
    }
  },

  setMusicVolume: async (volume) => {
    const clamped = Math.max(0, Math.min(1, volume));
    set({ musicVolume: clamped });
    get().savePreferences();
    await musicPlayer.setVolume(clamped);
  },

  setSelectedTrack: async (index) => {
    set({ selectedTrackIndex: index });
    get().savePreferences();
    // If music is currently playing, reload with new track
    if (musicPlayer.isLoaded() && get().musicEnabled) {
      const track = MUSIC_TRACKS[index];
      if (track?.uri) {
        await musicPlayer.load(track.uri, get().musicVolume);
        await musicPlayer.play();
      }
    }
  },

  // ── Camera ────────────────────────────────────────────────────────────────

  setCameraFacing: (facing) => {
    set({ cameraFacing: facing });
    get().savePreferences();
  },

  // ── Session music lifecycle ────────────────────────────────────────────────

  startMusic: async () => {
    const { musicEnabled, musicVolume, selectedTrackIndex } = get();
    if (!musicEnabled) return;

    const track = MUSIC_TRACKS[selectedTrackIndex];
    if (!track?.uri) return; // no track file provided yet

    await musicPlayer.load(track.uri, musicVolume);
    await musicPlayer.play();
  },

  pauseMusic: async () => {
    await musicPlayer.pause();
  },

  resumeMusic: async () => {
    if (!get().musicEnabled) return;
    await musicPlayer.play();
  },

  stopMusic: async () => {
    await musicPlayer.stop();
  },
}));
