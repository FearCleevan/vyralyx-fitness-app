import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';

interface StoreItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  price: number;
  type: 'boost' | 'cosmetic' | 'premium' | 'currency';
  isPremium?: boolean;
}

const STORE_ITEMS: StoreItem[] = [
  { id: 'xp_boost_2x',    name: 'XP Boost 2×',    description: 'Double XP for 24 hours',           icon: '⚡', price: 200,  type: 'boost' },
  { id: 'xp_boost_3x',    name: 'XP Boost 3×',    description: 'Triple XP for 2 hours',            icon: '🔥', price: 350,  type: 'boost' },
  { id: 'streak_shield',   name: 'Streak Shield',  description: 'Protect your streak for 1 day',    icon: '🛡️', price: 150,  type: 'boost' },
  { id: 'avatar_gold',     name: 'Gold Frame',     description: 'Legendary gold avatar border',     icon: '👑', price: 500,  type: 'cosmetic' },
  { id: 'avatar_fire',     name: 'Fire Aura',      description: 'Animated fire avatar effect',      icon: '🔥', price: 750,  type: 'cosmetic', isPremium: true },
  { id: 'badge_warrior',   name: 'Warrior Badge',  description: 'Show off your dedication',         icon: '⚔️', price: 300,  type: 'cosmetic' },
];

const CURRENCY_PACKS = [
  { id: 'pack_sm',  coins: 500,   bonus: 0,    price: '$1.99',  popular: false },
  { id: 'pack_md',  coins: 1200,  bonus: 200,  price: '$4.99',  popular: true  },
  { id: 'pack_lg',  coins: 3000,  bonus: 750,  price: '$9.99',  popular: false },
  { id: 'pack_xl',  coins: 7500,  bonus: 2500, price: '$19.99', popular: false },
];

type StoreTab = 'items' | 'premium' | 'currency';

export default function StoreScreen() {
  const { profile } = useAuthStore();
  const [balance, setBalance] = useState(0);
  const [activeTab, setActiveTab] = useState<StoreTab>('items');
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    if (profile) fetchWallet();
  }, [profile]);

  const fetchWallet = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('wallet')
      .select('balance')
      .eq('user_id', profile.id)
      .single();
    if (data) setBalance(data.balance);

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('tier')
      .eq('user_id', profile.id)
      .single();
    if (sub) setIsPremium(sub.tier === 'premium');
  };

  const handleBuyItem = (item: StoreItem) => {
    if (item.isPremium && !isPremium) {
      Alert.alert('Premium Required', 'Upgrade to Premium to unlock this item!', [
        { text: 'Maybe Later', style: 'cancel' },
        { text: 'Upgrade', onPress: () => setActiveTab('premium') },
      ]);
      return;
    }
    if (balance < item.price) {
      Alert.alert('Insufficient Coins', `You need ${item.price - balance} more coins!`, [
        { text: 'OK', style: 'cancel' },
        { text: 'Get Coins', onPress: () => setActiveTab('currency') },
      ]);
      return;
    }
    Alert.alert(`Buy ${item.name}?`, `Cost: 🪙 ${item.price}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Buy',
        onPress: async () => {
          const { error } = await supabase.from('transactions').insert({
            user_id: profile?.id,
            type: 'spend',
            amount: item.price,
            source: 'store',
            description: `Purchased: ${item.name}`,
          });
          if (!error) {
            setBalance((b) => b - item.price);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Purchased!', `${item.icon} ${item.name} is now yours!`);
          }
        },
      },
    ]);
  };

  const handleUpgradePremium = () => {
    Alert.alert(
      'Upgrade to Premium',
      'Unlock unlimited workouts, full AI coaching, and no ads for $9.99/month',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Upgrade — $9.99/mo',
          onPress: () => {
            // TODO: integrate with Expo IAP in Phase 4
            Alert.alert('Coming Soon', 'In-app purchases will be available in the next update!');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <LinearGradient colors={[Colors.bgCard, Colors.bg]} style={styles.header}>
        <Text style={styles.pageTitle}>Store</Text>
        <View style={styles.balanceChip}>
          <Text style={styles.balanceIcon}>🪙</Text>
          <Text style={styles.balanceText}>{balance.toLocaleString()}</Text>
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['items', 'premium', 'currency'] as StoreTab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'items' ? 'Items' : tab === 'premium' ? '⭐ Premium' : '🪙 Coins'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ─ Items Tab ─ */}
        {activeTab === 'items' && (
          <View style={styles.itemGrid}>
            {STORE_ITEMS.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.storeItem}
                onPress={() => handleBuyItem(item)}
                activeOpacity={0.8}
              >
                <Text style={styles.itemIcon}>{item.icon}</Text>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemDesc}>{item.description}</Text>
                {item.isPremium && (
                  <View style={styles.premiumTag}>
                    <Text style={styles.premiumTagText}>⭐ Premium</Text>
                  </View>
                )}
                <View style={styles.itemPrice}>
                  <Text style={styles.itemPriceText}>🪙 {item.price}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ─ Premium Tab ─ */}
        {activeTab === 'premium' && (
          <View style={styles.premiumSection}>
            {isPremium ? (
              <Card style={styles.premiumActiveCard}>
                <Text style={styles.premiumActiveIcon}>⭐</Text>
                <Text style={styles.premiumActiveTitle}>You're Premium!</Text>
                <Text style={styles.premiumActiveSub}>All features unlocked</Text>
              </Card>
            ) : (
              <>
                <LinearGradient colors={Colors.gradient.primary} style={styles.premiumHero}>
                  <Text style={styles.premiumHeroIcon}>👑</Text>
                  <Text style={styles.premiumHeroTitle}>Go Premium</Text>
                  <Text style={styles.premiumHeroPrice}>$9.99 / month</Text>
                </LinearGradient>

                <View style={styles.featureList}>
                  {[
                    ['✅', 'Unlimited workout plans'],
                    ['✅', 'Full AI form analysis'],
                    ['✅', 'Advanced progress stats'],
                    ['✅', 'No ads'],
                    ['✅', 'Exclusive challenges'],
                    ['✅', 'Enhanced voice coaching'],
                    ['✅', 'Battle Pass access'],
                    ['✅', '2× XP on all workouts'],
                  ].map(([icon, text]) => (
                    <View key={text} style={styles.featureRow}>
                      <Text style={styles.featureIcon}>{icon}</Text>
                      <Text style={styles.featureText}>{text}</Text>
                    </View>
                  ))}
                </View>

                <Button
                  title="Upgrade to Premium"
                  variant="primary"
                  size="lg"
                  gradient
                  onPress={handleUpgradePremium}
                />
              </>
            )}

            {/* Battle Pass */}
            <Card style={styles.battlePassCard}>
              <LinearGradient colors={Colors.gradient.gold} style={styles.battlePassHeader}>
                <Text style={styles.battlePassTitle}>🎮 Battle Pass</Text>
                <Text style={styles.battlePassSub}>Season 1</Text>
              </LinearGradient>
              <View style={styles.battlePassBody}>
                <Text style={styles.battlePassDesc}>
                  Earn XP to unlock 30 tiers of exclusive rewards — badges, coins, XP boosts, and more.
                </Text>
                <Button
                  title="Get Battle Pass — $4.99"
                  variant="secondary"
                  size="md"
                  onPress={() => Alert.alert('Coming Soon', 'Battle Pass launches in the next update!')}
                />
              </View>
            </Card>
          </View>
        )}

        {/* ─ Currency Tab ─ */}
        {activeTab === 'currency' && (
          <View style={styles.currencySection}>
            <Text style={styles.currencySubtitle}>
              Earn coins by working out, completing challenges, and watching ads — or grab a pack to get ahead.
            </Text>

            {/* Ad reward */}
            <Card style={styles.adCard}>
              <View style={styles.adLeft}>
                <Text style={styles.adIcon}>📺</Text>
                <View>
                  <Text style={styles.adTitle}>Watch an Ad</Text>
                  <Text style={styles.adSub}>Earn 50 coins free</Text>
                </View>
              </View>
              <Button
                title="+50 🪙"
                variant="outline"
                size="sm"
                onPress={() => Alert.alert('Coming Soon', 'Reward ads coming in the next update!')}
              />
            </Card>

            {/* Currency packs */}
            {CURRENCY_PACKS.map((pack) => (
              <TouchableOpacity
                key={pack.id}
                style={[styles.packCard, pack.popular && styles.packCardPopular]}
                activeOpacity={0.85}
                onPress={() => Alert.alert('Coming Soon', 'In-app purchases coming in the next update!')}
              >
                {pack.popular && (
                  <View style={styles.popularTag}>
                    <Text style={styles.popularTagText}>BEST VALUE</Text>
                  </View>
                )}
                <Text style={styles.packCoins}>🪙 {pack.coins.toLocaleString()}</Text>
                {pack.bonus > 0 && (
                  <Text style={styles.packBonus}>+{pack.bonus} bonus</Text>
                )}
                <Text style={styles.packPrice}>{pack.price}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pageTitle: { color: Colors.textPrimary, fontSize: 26, fontWeight: '800' },
  balanceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: `${Colors.gold}20`,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: `${Colors.gold}40`,
  },
  balanceIcon: { fontSize: 16 },
  balanceText: { color: Colors.gold, fontWeight: '800', fontSize: 16 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.bgCard,
    borderRadius: 0,
    padding: 8,
    paddingHorizontal: 16,
    gap: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: { backgroundColor: Colors.bgElevated },
  tabText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 13 },
  tabTextActive: { color: Colors.textPrimary, fontWeight: '700' },
  content: { padding: 20, gap: 14 },
  // Items
  itemGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  storeItem: {
    width: '47%',
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 6,
    alignItems: 'flex-start',
  },
  itemIcon: { fontSize: 28 },
  itemName: { color: Colors.textPrimary, fontSize: 14, fontWeight: '700' },
  itemDesc: { color: Colors.textMuted, fontSize: 11, lineHeight: 16 },
  premiumTag: {
    backgroundColor: `${Colors.gold}20`,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  premiumTagText: { color: Colors.gold, fontSize: 10, fontWeight: '700' },
  itemPrice: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 4,
  },
  itemPriceText: { color: Colors.textPrimary, fontSize: 13, fontWeight: '800' },
  // Premium
  premiumSection: { gap: 16 },
  premiumActiveCard: { alignItems: 'center', gap: 8, paddingVertical: 28 },
  premiumActiveIcon: { fontSize: 48 },
  premiumActiveTitle: { color: Colors.textPrimary, fontSize: 22, fontWeight: '800' },
  premiumActiveSub: { color: Colors.textSecondary, fontSize: 14 },
  premiumHero: {
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 6,
  },
  premiumHeroIcon: { fontSize: 48 },
  premiumHeroTitle: { color: '#FFF', fontSize: 28, fontWeight: '900' },
  premiumHeroPrice: { color: 'rgba(255,255,255,0.8)', fontSize: 16 },
  featureList: { gap: 12 },
  featureRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  featureIcon: { fontSize: 16 },
  featureText: { color: Colors.textPrimary, fontSize: 15, fontWeight: '500' },
  battlePassCard: { overflow: 'hidden', padding: 0 },
  battlePassHeader: { padding: 16, gap: 2 },
  battlePassTitle: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  battlePassSub: { color: 'rgba(255,255,255,0.75)', fontSize: 13 },
  battlePassBody: { padding: 16, gap: 12 },
  battlePassDesc: { color: Colors.textSecondary, fontSize: 13, lineHeight: 20 },
  // Currency
  currencySection: { gap: 14 },
  currencySubtitle: { color: Colors.textSecondary, fontSize: 13, lineHeight: 20 },
  adCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  adLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  adIcon: { fontSize: 28 },
  adTitle: { color: Colors.textPrimary, fontSize: 15, fontWeight: '700' },
  adSub: { color: Colors.textMuted, fontSize: 12 },
  packCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  packCardPopular: {
    borderColor: Colors.gold,
    backgroundColor: `${Colors.gold}10`,
  },
  popularTag: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: Colors.gold,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomLeftRadius: 10,
  },
  popularTagText: { color: '#000', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  packCoins: { color: Colors.textPrimary, fontSize: 18, fontWeight: '800' },
  packBonus: { color: Colors.success, fontSize: 12, fontWeight: '700' },
  packPrice: { color: Colors.primary, fontSize: 16, fontWeight: '800' },
});

