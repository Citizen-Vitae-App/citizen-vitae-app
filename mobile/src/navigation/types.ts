import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type AuthStackParamList = {
  AuthHome: { redirect?: string } | undefined;
  VerifyOtp: { email: string; redirect?: string; shouldCreateUser?: boolean };
};

export type MainTabParamList = {
  Home: undefined;
  Missions: undefined;
  Notifications: undefined;
  Profile: undefined;
};

/** Stack imbriqué : réglages (feuille modale) + sous-écrans. */
export type ProfileSettingsStackParamList = {
  SettingsHome: undefined;
  SettingsVisibility: undefined;
  SettingsSharing: undefined;
  SettingsNotifications: undefined;
};

export type AppStackParamList = {
  MainTabs: undefined;
  EventDetail: { eventId: string };
  ProfileSettings: undefined;
  /** Page certificat : même rendu que le web (`/certificate/:id`). */
  Certificate: { certificateId: string };
};

export type AuthNavigation = NativeStackNavigationProp<AuthStackParamList>;

export type AppNavigation = NativeStackNavigationProp<AppStackParamList>;
