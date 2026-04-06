/**
 * musicPlayer.ts
 *
 * Singleton wrapper around expo-av Audio.Sound for workout background music.
 *
 * Features:
 *   - Load any local asset or remote URL
 *   - Loop playback
 *   - Volume control
 *   - Audio ducking (lower to DUCK_VOLUME while speech fires, then restore)
 *   - Plays through iOS silent switch (via audio session configuration)
 *   - Stays active in background
 *   - Automatic unload on stop
 *
 * Usage:
 *   import { musicPlayer } from '@/lib/musicPlayer';
 *   await musicPlayer.load(trackUri);
 *   await musicPlayer.play();
 *   await musicPlayer.duck();   // called by voiceFeedback
 *   await musicPlayer.unduck(); // called by voiceFeedback.onDone
 *   await musicPlayer.stop();
 */

import { Audio } from 'expo-av';
import { DUCK_VOLUME } from '@/constants/audio';

class MusicPlayer {
  private sound: Audio.Sound | null = null;
  private targetVolume = 0.7;
  private isDucked = false;
  private duckTimer: ReturnType<typeof setTimeout> | null = null;

  // ── Audio session ──────────────────────────────────────────────────────────

  /**
   * Configure the audio session once at app start (or before first play).
   * Must be called before any sound is loaded.
   */
  async configureSession(): Promise<void> {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,       // play even with silent switch on
        staysActiveInBackground: true,    // continue when app is backgrounded
        shouldDuckAndroid: true,          // Android handles ducking natively
        playThroughEarpieceAndroid: false,// use speaker / headphones
      });
    } catch (err) {
      console.warn('[MusicPlayer] Failed to configure audio session:', err);
    }
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  /**
   * Load a track from a local asset reference or remote URL.
   * Calling load() while a track is playing will stop and unload the current one first.
   */
  async load(
    uri: ReturnType<typeof require> | string,
    initialVolume = 0.7
  ): Promise<void> {
    await this.stop(); // unload any existing track

    try {
      await this.configureSession();

      this.targetVolume = initialVolume;
      const source = typeof uri === 'string' ? { uri } : uri;

      const { sound } = await Audio.Sound.createAsync(
        source,
        {
          isLooping: true,
          volume: initialVolume,
          shouldPlay: false,
        }
      );

      this.sound = sound;
    } catch (err) {
      console.warn('[MusicPlayer] Failed to load track:', err);
      this.sound = null;
    }
  }

  /** Start or resume playback. No-op if no track is loaded. */
  async play(): Promise<void> {
    if (!this.sound) return;
    try {
      await this.sound.playAsync();
    } catch (err) {
      console.warn('[MusicPlayer] play() error:', err);
    }
  }

  /** Pause playback without unloading the track. */
  async pause(): Promise<void> {
    if (!this.sound) return;
    try {
      await this.sound.pauseAsync();
    } catch (err) {
      console.warn('[MusicPlayer] pause() error:', err);
    }
  }

  /** Stop and unload the track, freeing memory. */
  async stop(): Promise<void> {
    if (this.duckTimer) {
      clearTimeout(this.duckTimer);
      this.duckTimer = null;
    }
    if (!this.sound) return;
    try {
      await this.sound.stopAsync();
      await this.sound.unloadAsync();
    } catch {
      // Ignore errors on stop — sound may already be unloaded
    } finally {
      this.sound = null;
      this.isDucked = false;
    }
  }

  // ── Volume ─────────────────────────────────────────────────────────────────

  /**
   * Set the master playback volume (0–1).
   * Persists as the target volume for unduck restores.
   */
  async setVolume(volume: number): Promise<void> {
    this.targetVolume = Math.max(0, Math.min(1, volume));
    if (!this.sound || this.isDucked) return;
    try {
      await this.sound.setVolumeAsync(this.targetVolume);
    } catch (err) {
      console.warn('[MusicPlayer] setVolume() error:', err);
    }
  }

  // ── Ducking ────────────────────────────────────────────────────────────────

  /**
   * Lower music to DUCK_VOLUME so voice cues are clearly audible.
   * Automatically restores after DUCK_TIMEOUT_MS as a safety fallback.
   */
  async duck(timeoutMs = 6000): Promise<void> {
    if (!this.sound || this.isDucked) return;
    this.isDucked = true;

    try {
      await this.sound.setVolumeAsync(DUCK_VOLUME);
    } catch {
      this.isDucked = false;
      return;
    }

    // Safety timeout — restore if onDone never fires
    if (this.duckTimer) clearTimeout(this.duckTimer);
    this.duckTimer = setTimeout(() => this.unduck(), timeoutMs);
  }

  /**
   * Restore music to the pre-duck target volume.
   * Called by voiceFeedback's onDone / onStopped callbacks.
   */
  async unduck(): Promise<void> {
    if (this.duckTimer) {
      clearTimeout(this.duckTimer);
      this.duckTimer = null;
    }
    if (!this.sound) {
      this.isDucked = false;
      return;
    }
    this.isDucked = false;
    try {
      await this.sound.setVolumeAsync(this.targetVolume);
    } catch (err) {
      console.warn('[MusicPlayer] unduck() error:', err);
    }
  }

  // ── State queries ──────────────────────────────────────────────────────────

  isLoaded(): boolean {
    return this.sound !== null;
  }

  getTargetVolume(): number {
    return this.targetVolume;
  }
}

/** Singleton instance — import this everywhere instead of creating new instances. */
export const musicPlayer = new MusicPlayer();
