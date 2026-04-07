import { Platform } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ProfileSettingsStackParamList } from '@/navigation/types';
import { SettingsHomeScreen } from '@/screens/settings/SettingsHomeScreen';
import { SettingsVisibilityScreen } from '@/screens/settings/SettingsVisibilityScreen';
import { SettingsSharingScreen } from '@/screens/settings/SettingsSharingScreen';
import { SettingsNotificationsScreen } from '@/screens/settings/SettingsNotificationsScreen';

const Stack = createNativeStackNavigator<ProfileSettingsStackParamList>();

export function ProfileSettingsNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: Platform.OS === 'android' ? 'slide_from_right' : 'default',
      }}
    >
      <Stack.Screen name="SettingsHome" component={SettingsHomeScreen} />
      <Stack.Screen name="SettingsVisibility" component={SettingsVisibilityScreen} />
      <Stack.Screen name="SettingsSharing" component={SettingsSharingScreen} />
      <Stack.Screen name="SettingsNotifications" component={SettingsNotificationsScreen} />
    </Stack.Navigator>
  );
}
