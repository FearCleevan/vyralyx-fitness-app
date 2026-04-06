import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface TabIconProps {
  name: IconName;
  focused: boolean;
}

function TabIcon({ name, focused }: TabIconProps) {
  return (
    <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
      <Ionicons
        name={name}
        size={22}
        color={focused ? Colors.primary : Colors.textMuted}
      />
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabLabel,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: 'Workout',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'barbell' : 'barbell-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'stats-chart' : 'stats-chart-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Ranks',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'trophy' : 'trophy-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="store"
        options={{
          title: 'Store',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'storefront' : 'storefront-outline'} focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    height: Platform.OS === 'ios' ? 84 : 64,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  iconWrapper: {
    width: 40,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  iconWrapperActive: {
    backgroundColor: `${Colors.primary}18`,
  },
});
