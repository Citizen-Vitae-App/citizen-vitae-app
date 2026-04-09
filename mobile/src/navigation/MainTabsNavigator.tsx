import { useMemo } from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, ClipboardList, Bell, User } from 'lucide-react-native';
import { HomeScreen } from '@/screens/HomeScreen';
import { MissionsScreen } from '@/screens/MissionsScreen';
import { NotificationsScreen } from '@/screens/NotificationsScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { useNotificationsList } from '@/hooks/useNotifications';
import { CvColors } from '@/theme/colors';

export type MainTabParamList = {
  Home: undefined;
  Missions: undefined;
  Notifications: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const BADGE_RED = '#EF4444';

const ICON_STROKE = 1.75;

type TabLabelProps = { focused: boolean; color: string; children: string };

function TabLabel({ focused, color, children }: TabLabelProps) {
  return (
    <Text style={{ color, fontSize: 12, fontWeight: focused ? '700' : '500', marginTop: 2 }}>{children}</Text>
  );
}

export function MainTabsNavigator() {
  const { data: notifications } = useNotificationsList();
  const unreadCount = useMemo(
    () => notifications?.filter((n) => !n.is_read).length ?? 0,
    [notifications]
  );

  return (
    <Tab.Navigator
      screenOptions={{
        headerTitleAlign: 'center',
        headerStyle: {
          backgroundColor: CvColors.background,
        },
        headerTintColor: CvColors.foreground,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        tabBarActiveTintColor: '#000000',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#FAFAFA',
          borderTopColor: '#E5E7EB',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          headerShown: false,
          title: 'Accueil',
          tabBarLabel: ({ focused, color }) => (
            <TabLabel focused={focused} color={color}>
              Accueil
            </TabLabel>
          ),
          tabBarIcon: ({ color, size }) => (
            <Home size={size} color={color} strokeWidth={ICON_STROKE} />
          ),
        }}
      />
      <Tab.Screen
        name="Missions"
        component={MissionsScreen}
        options={{
          headerShown: false,
          title: 'Missions',
          tabBarLabel: ({ focused, color }) => (
            <TabLabel focused={focused} color={color}>
              Missions
            </TabLabel>
          ),
          tabBarIcon: ({ color, size }) => (
            <ClipboardList size={size} color={color} strokeWidth={ICON_STROKE} />
          ),
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          headerShown: false,
          title: 'Notifications',
          tabBarLabel: ({ focused, color }) => (
            <TabLabel focused={focused} color={color}>
              Notifications
            </TabLabel>
          ),
          tabBarIcon: ({ color, size }) => (
            <Bell size={size} color={color} strokeWidth={ICON_STROKE} />
          ),
          tabBarBadge:
            unreadCount > 99 ? '99+' : unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: BADGE_RED,
            color: '#FFFFFF',
            fontSize: 11,
            fontWeight: '700',
          },
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          headerShown: false,
          title: 'Profil',
          tabBarLabel: ({ focused, color }) => (
            <TabLabel focused={focused} color={color}>
              Profil
            </TabLabel>
          ),
          tabBarIcon: ({ color, size }) => (
            <User size={size} color={color} strokeWidth={ICON_STROKE} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
