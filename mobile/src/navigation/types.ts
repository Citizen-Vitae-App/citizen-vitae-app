import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type AuthStackParamList = {
  AuthHome: { redirect?: string } | undefined;
  VerifyOtp: { email: string; redirect?: string };
};

export type MainTabParamList = {
  Home: undefined;
  Missions: undefined;
  Notifications: undefined;
  Profile: undefined;
};

export type AppStackParamList = {
  MainTabs: undefined;
  EventDetail: { eventId: string };
};

export type AuthNavigation = NativeStackNavigationProp<AuthStackParamList>;

export type AppNavigation = NativeStackNavigationProp<AppStackParamList>;
