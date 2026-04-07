import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AppStackParamList } from '@/navigation/types';
import { MainTabsNavigator } from '@/navigation/MainTabsNavigator';
import { EventDetailScreen } from '@/screens/EventDetailScreen';
import { CertificateScreen } from '@/screens/CertificateScreen';
import { ProfileSettingsNavigator } from '@/navigation/ProfileSettingsNavigator';
const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabsNavigator} />
      <Stack.Screen name="EventDetail" component={EventDetailScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="Certificate" component={CertificateScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen
        name="ProfileSettings"
        component={ProfileSettingsNavigator}
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
    </Stack.Navigator>
  );
}
