import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Colors } from '@/constants/colors';

interface LeaderboardEntry {
  user_id: string;
  username: string;
  avatar_url?: string;
  level: number;
  weekly_score?: number;
  total_xp?: number;
  rank: number;
}

type Tab = 'weekly' | 'alltime';

export default function LeaderboardScreen() {
  const { profile } = useAuthStore();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('weekly');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [activeTab]);

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    try {
      const view = activeTab === 'weekly' ? 'leaderboard_weekly' : 'leaderboard_alltime';
      const { data, error } = await supabase
        .from(view)
        .select('*')
        .limit(50);

      if (error) throw error;
      setEntries((data ?? []) as LeaderboardEntry[]);
    } catch (e) {
      console.error('Leaderboard fetch failed:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchLeaderboard();
    setIsRefreshing(false);
  };

  const myEntry = entries.find((e) => e.user_id === profile?.id);
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Leaderboard</Text>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(['weekly', 'alltime'] as Tab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'weekly' ? 'This Week' : 'All Time'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Podium (top 3) */}
        {top3.length >= 3 && (
          <View style={styles.podium}>
            <PodiumItem entry={top3[1]} position={2} />
            <PodiumItem entry={top3[0]} position={1} isTop />
            <PodiumItem entry={top3[2]} position={3} />
          </View>
        )}

        {/* My rank */}
        {myEntry && (
          <LinearGradient colors={[`${Colors.primary}30`, `${Colors.primary}10`]} style={styles.myRankBanner}>
            <Text style={styles.myRankLabel}>Your Rank</Text>
            <View style={styles.myRankRow}>
              <Text style={styles.myRank}>#{myEntry.rank}</Text>
              <Text style={styles.myScore}>
                {activeTab === 'weekly'
                  ? `${myEntry.weekly_score ?? 0} pts`
                  : `${myEntry.total_xp ?? 0} XP`}
              </Text>
            </View>
          </LinearGradient>
        )}

        {/* List */}
        <View style={styles.list}>
          {(top3.length > 0 ? rest : entries).map((entry) => (
            <LeaderboardRow
              key={entry.user_id}
              entry={entry}
              isMe={entry.user_id === profile?.id}
              tab={activeTab}
            />
          ))}
        </View>

        {isLoading && (
          <Text style={styles.loadingText}>Loading...</Text>
        )}

        {!isLoading && entries.length === 0 && (
          <Card style={styles.empty}>
            <Ionicons name="trophy-outline" size={32} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No rankings yet. Complete a workout to appear here!</Text>
          </Card>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function PodiumItem({ entry, position, isTop = false }: {
  entry: LeaderboardEntry;
  position: number;
  isTop?: boolean;
}) {
  const medalColor = position === 1 ? Colors.gold : position === 2 ? '#C0C0C0' : '#CD7F32';
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <View style={[styles.podiumItem, isTop && styles.podiumItemTop]}>
      <Text style={styles.podiumMedal}>{medals[position - 1]}</Text>
      <View style={[styles.podiumAvatar, { borderColor: medalColor }]}>
        <Text style={styles.podiumInitial}>
          {entry.username?.[0]?.toUpperCase() ?? '?'}
        </Text>
      </View>
      <Text style={styles.podiumName} numberOfLines={1}>{entry.username}</Text>
      <View style={[styles.podiumBadge, { backgroundColor: `${medalColor}20` }]}>
        <Text style={[styles.podiumLevel, { color: medalColor }]}>LV {entry.level}</Text>
      </View>
    </View>
  );
}

function LeaderboardRow({ entry, isMe, tab }: {
  entry: LeaderboardEntry;
  isMe: boolean;
  tab: Tab;
}) {
  return (
    <View style={[styles.row, isMe && styles.rowHighlight]}>
      <Text style={styles.rowRank}>#{entry.rank}</Text>
      <View style={styles.rowAvatar}>
        <Text style={styles.rowInitial}>{entry.username?.[0]?.toUpperCase() ?? '?'}</Text>
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowName}>{entry.username}{isMe ? ' (You)' : ''}</Text>
        <Text style={styles.rowLevel}>Level {entry.level}</Text>
      </View>
      <Text style={styles.rowScore}>
        {tab === 'weekly'
          ? `${entry.weekly_score ?? 0} pts`
          : `${entry.total_xp ?? 0} XP`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  pageTitle: { color: Colors.textPrimary, fontSize: 26, fontWeight: '800' },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 14 },
  tabTextActive: { color: '#FFF', fontWeight: '700' },
  podium: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 12,
    paddingVertical: 8,
  },
  podiumItem: { alignItems: 'center', gap: 6, width: 90 },
  podiumItemTop: { marginBottom: 16 },
  podiumMedal: { fontSize: 28 },
  podiumAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  podiumInitial: { color: Colors.textPrimary, fontSize: 22, fontWeight: '800' },
  podiumName: { color: Colors.textPrimary, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  podiumBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  podiumLevel: { fontSize: 11, fontWeight: '700' },
  myRankBanner: {
    padding: 16,
    borderRadius: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: `${Colors.primary}40`,
  },
  myRankLabel: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  myRankRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  myRank: { color: Colors.primary, fontSize: 28, fontWeight: '900' },
  myScore: { color: Colors.textPrimary, fontSize: 16, fontWeight: '700' },
  list: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rowHighlight: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}10`,
  },
  rowRank: { color: Colors.textMuted, fontSize: 14, fontWeight: '700', width: 30 },
  rowAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowInitial: { color: Colors.textPrimary, fontSize: 16, fontWeight: '800' },
  rowInfo: { flex: 1 },
  rowName: { color: Colors.textPrimary, fontSize: 14, fontWeight: '700' },
  rowLevel: { color: Colors.textMuted, fontSize: 12 },
  rowScore: { color: Colors.primary, fontSize: 13, fontWeight: '700' },
  loadingText: { color: Colors.textMuted, textAlign: 'center', fontSize: 14 },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 28 },
  emptyText: { color: Colors.textMuted, fontSize: 13, textAlign: 'center' },
});
