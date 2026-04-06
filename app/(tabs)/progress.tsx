import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { XPBar } from '@/components/ui/XPBar';
import { Colors } from '@/constants/colors';
import type { UserStats, WorkoutSession } from '@/types';

export default function ProgressScreen() {
  const { profile } = useAuthStore();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (profile) fetchData();
  }, [profile]);

  const fetchData = async () => {
    if (!profile) return;
    const [statsRes, sessionsRes] = await Promise.all([
      supabase.from('user_stats').select('*').eq('user_id', profile.id).single(),
      supabase
        .from('workout_sessions')
        .select('*')
        .eq('user_id', profile.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(10),
    ]);
    if (statsRes.data) setStats(statsRes.data as UserStats);
    if (sessionsRes.data) setSessions(sessionsRes.data as WorkoutSession[]);
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Progress</Text>

        {/* XP / Level */}
        {stats && (
          <Card style={styles.xpCard}>
            <XPBar level={stats.level} xp={stats.xp} xpToNext={stats.xp_to_next_level} />
          </Card>
        )}

        {/* Stats grid */}
        <View style={styles.grid}>
          <StatCard icon="barbell-outline" label="Total Workouts" value={stats?.total_workouts ?? 0} color={Colors.primary} />
          <StatCard icon="flame-outline" label="Current Streak" value={`${stats?.streak_days ?? 0} days`} color={Colors.accent} />
          <StatCard icon="trophy-outline" label="Best Streak" value={`${stats?.longest_streak ?? 0} days`} color={Colors.gold} />
          <StatCard icon="time-outline" label="Total Minutes" value={stats?.total_duration_min ?? 0} color={Colors.secondary} />
          <StatCard icon="star-outline" label="XP Earned" value={(stats?.xp ?? 0).toLocaleString()} color={Colors.primary} />
          <StatCard icon="wallet-outline" label="Coins" value={stats?.currency_balance ?? 0} color={Colors.gold} />
        </View>

        {/* Streak visual */}
        {(stats?.streak_days ?? 0) > 0 && (
          <LinearGradient colors={[`${Colors.accent}25`, `${Colors.accent}05`]} style={styles.streakBanner}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <View>
              <Text style={styles.streakTitle}>{stats?.streak_days} Day Streak!</Text>
              <Text style={styles.streakSubtitle}>Keep it up — you're on fire!</Text>
            </View>
          </LinearGradient>
        )}

        {/* Recent sessions */}
        <Text style={styles.sectionTitle}>Recent Workouts</Text>
        {sessions.length === 0 ? (
          <Card style={styles.empty}>
            <Ionicons name="barbell-outline" size={32} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No workouts yet. Start your first session!</Text>
          </Card>
        ) : (
          <View style={styles.sessionList}>
            {sessions.map((session) => (
              <SessionRow key={session.id} session={session} />
            ))}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ icon, label, value, color }: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <Card style={[styles.statCard, { borderColor: `${color}30` }]}>
      <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

function SessionRow({ session }: { session: WorkoutSession }) {
  const date = new Date(session.completed_at ?? session.started_at);
  return (
    <Card style={styles.sessionCard}>
      <View style={styles.sessionLeft}>
        <Text style={styles.sessionName}>{session.workout_id}</Text>
        <Text style={styles.sessionDate}>{date.toLocaleDateString()}</Text>
      </View>
      <View style={styles.sessionRight}>
        <Text style={styles.sessionXP}>+{session.xp_earned} XP</Text>
        <Text style={styles.sessionScore}>Score: {session.total_score}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 20, gap: 14, paddingBottom: 40 },
  pageTitle: { color: Colors.textPrimary, fontSize: 26, fontWeight: '800' },
  xpCard: { borderColor: `${Colors.primary}40` },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    width: '47%',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 16,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: { color: Colors.textPrimary, fontSize: 20, fontWeight: '800' },
  statLabel: { color: Colors.textMuted, fontSize: 12, fontWeight: '600' },
  streakBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${Colors.accent}30`,
  },
  streakEmoji: { fontSize: 36 },
  streakTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: '800' },
  streakSubtitle: { color: Colors.textSecondary, fontSize: 13, marginTop: 2 },
  sectionTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: '700' },
  sessionList: { gap: 10 },
  sessionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionLeft: { gap: 2 },
  sessionName: { color: Colors.textPrimary, fontSize: 14, fontWeight: '700' },
  sessionDate: { color: Colors.textMuted, fontSize: 12 },
  sessionRight: { alignItems: 'flex-end', gap: 2 },
  sessionXP: { color: Colors.primary, fontSize: 13, fontWeight: '700' },
  sessionScore: { color: Colors.textMuted, fontSize: 12 },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 28 },
  emptyText: { color: Colors.textMuted, fontSize: 13, textAlign: 'center' },
});
