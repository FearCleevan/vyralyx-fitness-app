# Vyralyx — AI-Powered Fitness App

A production-ready mobile fitness app built with **React Native (Expo)** and **Supabase**, combining real-time AI workout tracking, gamification, and a game-like monetization system.

---

## Features

### Onboarding
- 6-step personalization wizard
- Collects gender, age, weight, height, fitness level, environment, and goal
- Generates a tailored workout plan on completion

### AI Camera Tracking (Phase 2)
- Live camera preview using **Expo Camera**
- Real-time pose detection powered by **MoveNet Lightning** (TensorFlow.js)
- SVG skeleton overlay drawn on top of the camera feed
- Tracks 17 body keypoints (shoulders, elbows, wrists, hips, knees, ankles)
- Supports 14 exercises: Push-Up, Squat, Lunge, Deadlift, Pull-Up, Bench Press, Overhead Press, Romanian Deadlift, Glute Bridge, Tricep Dip, Burpee, Mountain Climber, Barbell Squat, Plank

### Rep Counting
- Joint-angle state machine (down → up = 1 rep)
- Hysteresis thresholds prevent false counts from movement jitter
- Anticipation phrases at the final 3 reps ("Two more!", "Last one!")
- Auto-advances to rest when target reps are reached

### Form Analysis
- Per-exercise form checks (elbow flare, hip sag, knee cave, depth, back rounding)
- Form score (0–100) updated every frame during the down phase
- Actionable cue shown on the HUD ("Push knees out", "Keep your back straight")
- Average form score saved to Supabase after each set

### Voice Feedback (Phase 3)
- **Expo Speech** announces every rep count
- Set completion announcements with rest duration
- Real-time form correction cues (throttled — same cue won't repeat for 8 seconds)
- Motivational callouts every 30 seconds
- Workout completion fanfare
- Two coach styles: **Calm** (factual, measured) and **Intense** (high-energy, hype)
- Voice toggle + volume control, persisted across sessions

### Background Music (Phase 3)
- **Expo AV** plays looping workout music during active sets
- Music pauses automatically during rest periods
- **Audio ducking**: volume drops to 15% when voice cues fire, restores after speech ends
- Safety timeout restores volume if the speech callback doesn't fire
- Three track slots (Warm-Up, Steady State, Beast Mode) — drop `.mp3` files into `assets/audio/`
- Music toggle + volume control, persisted across sessions

### Workout System
- Exercise library with 15 exercises (bodyweight, gym, HIIT)
- 4 pre-built workout plans (Beginner / Intermediate / Advanced × No Equipment / Home / Gym)
- Progressive overload structure (sets, reps, rest, weight)
- Active session tracker with elapsed timer and per-exercise progress bar
- Manual "Complete Set" button as fallback if AI isn't running

### Gamification
- XP + Level system
- Daily streaks
- Achievements (database layer)
- Weekly + all-time leaderboard
- Daily / weekly challenges

### Monetization
- Virtual currency wallet (earned via workouts, streaks, challenges)
- Free vs Premium tiers
- Battle Pass progression system (UI)
- In-app store (currency packs, premium, boosters)

### Settings
- Voice coach toggle, volume, and style selector
- Music toggle, volume, and track selector
- Camera facing preference (front / back)
- Account info + sign out

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native (Expo SDK 54) |
| Navigation | Expo Router (file-based) |
| State | Zustand |
| Backend | Supabase (Auth, Postgres, RLS, RPC) |
| AI / ML | TensorFlow.js + MoveNet Lightning |
| Camera | Expo Camera v17 |
| Voice | Expo Speech |
| Audio | Expo AV |
| Styling | NativeWind + StyleSheet |
| Icons | @expo/vector-icons (Ionicons) |

---

## Project Structure

```
vyralyx-fitness-app/
├── app/
│   ├── _layout.tsx              ← Root layout + Auth gate
│   ├── settings.tsx             ← Settings screen
│   ├── workout-session.tsx      ← Full-screen AI camera session
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── onboarding/
│   │   └── index.tsx            ← 6-step onboarding wizard
│   └── (tabs)/
│       ├── index.tsx            ← Dashboard
│       ├── workout.tsx          ← Workout list + session tracker
│       ├── progress.tsx         ← Stats + session history
│       ├── leaderboard.tsx      ← Weekly + all-time rankings
│       └── store.tsx            ← Currency, Premium, Battle Pass
├── assets/
│   └── audio/                   ← Drop .mp3 workout tracks here
├── src/
│   ├── constants/
│   │   ├── audio.ts             ← Coach scripts + track metadata
│   │   ├── colors.ts            ← Design tokens
│   │   └── workouts.ts          ← Exercise library + workout plans
│   ├── lib/
│   │   ├── formAnalyzer.ts      ← Per-exercise form checks
│   │   ├── musicPlayer.ts       ← expo-av singleton with ducking
│   │   ├── poseDetection.ts     ← MoveNet inference + geometry helpers
│   │   ├── repCounter.ts        ← Joint-angle rep counting state machine
│   │   ├── supabase.ts          ← Supabase client
│   │   └── voiceFeedback.ts     ← expo-speech with coach styles
│   ├── stores/
│   │   ├── audioStore.ts        ← Audio preferences (persisted)
│   │   ├── authStore.ts         ← Session + profile
│   │   ├── cameraSessionStore.ts← Active camera session state
│   │   ├── onboardingStore.ts   ← Onboarding form state
│   │   └── workoutStore.ts      ← Workout plan + active session
│   ├── components/
│   │   ├── camera/
│   │   │   ├── AudioControls.tsx ← In-session music/voice overlay
│   │   │   ├── PoseSkeleton.tsx  ← SVG skeleton overlay
│   │   │   ├── RestTimer.tsx     ← Between-set countdown
│   │   │   └── WorkoutHUD.tsx    ← Rep counter + form score HUD
│   │   ├── onboarding/
│   │   └── ui/
│   ├── stubs/                   ← Metro resolver stubs (browser-only deps)
│   └── types/index.ts           ← All TypeScript types
├── supabase/
│   ├── schema.sql               ← 12 tables + RLS + seed data
│   └── functions.sql            ← increment_user_stats RPC + achievement triggers
└── metro.config.js              ← Custom Metro config (TF.js stubs)
```

---

## Installation

### Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- A [Supabase](https://supabase.com) project

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/vyralyx-fitness-app.git
cd vyralyx-fitness-app
```

### 2. Install dependencies

```bash
npm install --legacy-peer-deps
```

> `--legacy-peer-deps` is required because `@tensorflow/tfjs-react-native` has a peer dependency on an older version of `@react-native-async-storage/async-storage`.

### 3. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your Supabase credentials:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Set up the database

In your Supabase project, open the **SQL Editor** and run the following files in order:

1. `supabase/schema.sql` — creates all tables, indexes, and RLS policies
2. `supabase/functions.sql` — creates the `increment_user_stats` RPC and achievement triggers

### 5. Add workout music (optional)

Place `.mp3` files in `assets/audio/` and update the `uri` fields in [src/constants/audio.ts](src/constants/audio.ts):

```ts
// Before
uri: null,

// After
uri: require('../../assets/audio/your-track.mp3'),
```

Three track slots are available: `warmup.mp3`, `steady.mp3`, `hype.mp3`.

### 6. Start the app

```bash
npx expo start
```

Scan the QR code with **Expo Go** on your device, or press `a` for Android emulator / `i` for iOS simulator.

---

## AI Model Notes

The app uses **MoveNet Lightning** loaded from TensorFlow Hub the first time the camera session opens (~2–4 seconds). No model file needs to be manually downloaded.

If you prefer offline support, you can:
1. Download the model and bundle it as an asset
2. Update `initPoseDetector()` in [src/lib/poseDetection.ts](src/lib/poseDetection.ts) to use `bundleResourceIO`

---

## Metro Configuration

The app includes a custom [metro.config.js](metro.config.js) that stubs three browser-only packages pulled in as transitive dependencies of the TensorFlow stack:

| Stub | Reason |
|---|---|
| `@mediapipe/pose` | BlazePose MediaPipe detector (browser/web only) |
| `react-native-fs` | `bundleResourceIO` (not called — MoveNet loads from CDN) |
| `@tensorflow/tfjs-backend-webgpu` | WebGPU backend (desktop/Chrome only) |

These stubs are empty modules — they satisfy the import resolver without affecting runtime behaviour.

---

## Development Phases

| Phase | Status | Description |
|---|---|---|
| Phase 1 | ✅ Complete | Onboarding, static workouts, Supabase backend |
| Phase 2 | ✅ Complete | Camera + MoveNet pose detection + rep counting |
| Phase 3 | ✅ Complete | Voice feedback + background music + Settings screen |
| Phase 4 | 🔜 Planned | Full gamification + monetization (Battle Pass, IAP, ads) |

---

## License

MIT
