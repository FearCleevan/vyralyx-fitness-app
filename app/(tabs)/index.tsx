import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '@/stores/authStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import { supabase } from '@/lib/supabase';
import { WorkoutCard } from '@/components/workout/WorkoutCard';
import { XPBar } from '@/components/ui/XPBar';
import { Card } from '@/components/ui/Card';
import { Colors } from '@/constants/colors';
import type { UserStats, Challenge } from '@/types';

export default function DashboardScreen() {
  const { profile } = useAuthStore();
  const { plan, loadPlan } = useWorkoutStore();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (profile?.fitness_level && profile.environment && profile.goal) {
      loadPlan(
        profile.fitness_level,
        profile.environment,
        profile.goal
      );
      fetchStats();
      fetchChallenges();
    }
  }, [profile]);

  const fetchStats = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', profile.id)
      .single();
    if (data) setStats(data as UserStats);
  };

  const fetchChallenges = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('challenges')
      .select('*')
      .gt('expires_at', new Date().toISOString())
      .limit(3);
    if (data) setChallenges(data as Challenge[]);
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchStats(), fetchChallenges()]);
    setIsRefreshing(false);
  };

  const todayWorkout = plan?.workouts[0];
  const greeting = getGreeting();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ─ Header ─ */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting} 👋</Text>
            <Text style={styles.username}>{profile?.username ?? 'Athlete'}</Text>
          </View>
          <View style={styles.headerRight}>
            {/* Currency */}
            <TouchableOpacity style={styles.currencyChip} onPress={() => router.push('/(tabs)/store')}>
              <Text style={styles.currencyIcon}>🪙</Text>
              <Text style={styles.currencyValue}>{stats?.currency_balance ?? 0}</Text>
            </TouchableOpacity>
            {/* Streak */}
            <View style={styles.streakChip}>
              <Text style={styles.streakIcon}>🔥</Text>
              <Text style={styles.streakValue}>{stats?.streak_days ?? 0}</Text>
            </View>
          </View>
        </View>

        {/* ─ XP Bar ─ */}
        {stats && (
          <Card style={styles.xpCard}>
            <XPBar
              level={stats.level}
              xp={stats.xp}
              xpToNext={stats.xp_to_next_level}
            />
          </Card>
        )}

        {/* ─ Quick Stats ─ */}
        <View style={styles.statsRow}>
          <StatBox icon="barbell-outline" label="Workouts" value={stats?.total_workouts ?? 0} color={Colors.primary} />
          <StatBox icon="flame-outline" label="Streak" value={`${stats?.streak_days ?? 0}d`} color={Colors.accent} />
          <StatBox icon="time-outline" label="Minutes" value={stats?.total_duration_min ?? 0} color={Colors.secondary} />
        </View>

        {/* ─ Today's Workout ─ */}
        <SectionHeader title="Today's Workout" action={{ label: 'See all', onPress: () => router.push('/(tabs)/workout') }} />
        {todayWorkout ? (
          <WorkoutCard
            workout={todayWorkout}
            isLocked={todayWorkout.is_premium && true /* will check subscription in Phase 4 */}
            onPress={() =>
              router.push({
                pathname: '/(tabs)/workout',
                params: { workoutId: todayWorkout.id },
              })
            }
          />
        ) : (
          <EmptyState icon="barbell-outline" message="Complete onboarding to get your plan" />
        )}

        {/* ─ Your Plan ─ */}
        {plan && (
          <>
            <SectionHeader title={plan.name} subtitle={`${plan.duration_weeks} weeks · ${plan.workouts_per_week}x/week`} />
            <LinearGradient colors={[`${Colors.primary}20`, `${Colors.primary}05`]} style={styles.planBanner}>
              <Text style={styles.planBannerText}>{plan.description}</Text>
              <View style={styles.planMeta}>
                <MetaTag label={plan.level} />
                <MetaTag label={plan.environment.replace('_', ' ')} />
                <MetaTag label={plan.goal.replace('_', ' ')} />
              </View>
            </LinearGradient>
          </>
        )}

        {/* ─ Active Challenges ─ */}
        {challenges.length > 0 && (
          <>
            <SectionHeader title="Active Challenges" action={{ label: 'All', onPress: () => router.push('/(tabs)/store') }} />
            <View style={styles.challengeList}>
              {challenges.map((c) => (
                <ChallengeRow key={c.id} challenge={c} />
              ))}
            </View>
          </>
        )}

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle, action }: {
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={styles.sectionHeader}>
      <View>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      </View>
      {action && (
        <TouchableOpacity onPress={action.onPress}>
          <Text style={styles.sectionAction}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function StatBox({ icon, label, value, color }: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <Card style={[styles.statBox, { borderColor: `${color}30` }]}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

function MetaTag({ label }: { label: string }) {
  return (
    <View style={styles.metaTag}>
      <Text style={styles.metaTagText}>{label}</Text>
    </View>
  );
}

function ChallengeRow({ challenge }: { challenge: Challenge }) {
  const progress = Math.min(challenge.current_value / challenge.target_value, 1);
  return (
    <Card style={styles.challengeCard}>
      <View style={styles.challengeHeader}>
        <View>
          <Text style={styles.challengeName}>{challenge.name}</Text>
          <Text style={styles.challengeDesc}>{challenge.description}</Text>
        </View>
        <View style={styles.challengeRewards}>
          <Text style={styles.rewardText}>+{challenge.xp_reward} XP</Text>
          <Text style={styles.rewardText}>🪙 {challenge.currency_reward}</Text>
        </View>
      </View>
      <View style={styles.challengeTrack}>
        <View style={[styles.challengeFill, { width: `${progress * 100}%` }]} />
      </View>
      <Text style={styles.challengeProgress}>
        {challenge.current_value} / {challenge.target_value}
      </Text>
    </Card>
  );
}

function EmptyState({ icon, message }: { icon: React.ComponentProps<typeof Ionicons>['name']; message: string }) {
  return (
    <Card style={styles.emptyState}>
      <Ionicons name={icon} size={32} color={Colors.textMuted} />
      <Text style={styles.emptyText}>{message}</Text>
    </Card>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  content: { padding: 20, gap: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  greeting: { color: Colors.textSecondary, fontSize: 14 },
  username: { color: Colors.textPrimary, fontSize: 22, fontWeight: '800', marginTop: 2 },
  headerRight: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  currencyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.bgCard,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  currencyIcon: { fontSize: 14 },
  currencyValue: { color: Colors.gold, fontWeight: '700', fontSize: 14 },
  streakChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${Colors.accent}20`,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  streakIcon: { fontSize: 14 },
  streakValue: { color: Colors.accent, fontWeight: '700', fontSize: 14 },
  xpCard: { borderColor: `${Colors.primary}40` },
  statsRow: { flexDirection: 'row', gap: 10 },
  statBox: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 14 },
  statValue: { color: Colors.textPrimary, fontWeight: '800', fontSize: 18 },
  statLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: '600' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: -4,
  },
  sectionTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: '700' },
  sectionSubtitle: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  sectionAction: { color: Colors.primary, fontSize: 13, fontWeight: '600' },
  planBanner: {
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: `${Colors.primary}25`,
  },
  planBannerText: { color: Colors.textSecondary, fontSize: 13, lineHeight: 20 },
  planMeta: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  metaTag: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  metaTagText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  challengeList: { gap: 10 },
  challengeCard: { gap: 10 },
  challengeHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  challengeName: { color: Colors.textPrimary, fontSize: 14, fontWeight: '700' },
  challengeDesc: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  challengeRewards: { alignItems: 'flex-end', gap: 2 },
  rewardText: { color: Colors.gold, fontSize: 12, fontWeight: '700' },
  challengeTrack: {
    height: 6,
    backgroundColor: Colors.bgElevated,
    borderRadius: 3,
    overflow: 'hidden',
  },
  challengeFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  challengeProgress: { color: Colors.textMuted, fontSize: 11, textAlign: 'right' },
  emptyState: { alignItems: 'center', gap: 10, paddingVertical: 28 },
  emptyText: { color: Colors.textMuted, fontSize: 13, textAlign: 'center' },
  bottomPad: { height: 20 },
});

